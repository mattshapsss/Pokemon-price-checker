/**
 * Client-side card search using cached data and Fuse.js
 * Includes smart search with exact-first matching
 */

import Fuse, { IFuseOptions } from "fuse.js";
import { parseQuery, matchSetName, normalizeCardNumber, ParsedQuery } from "./query-parser";

export interface CachedCard {
  id: string;
  name: string;
  rarity: string;
  number: string;
  setId: string;
  setName: string;
  series: string;
  releaseDate: string;
  imageSmall: string;
  imageLarge: string;
  tcgplayerUrl: string;
  priceUpdatedAt: string;
  prices: {
    [key: string]: {
      market: number;
      low: number | null;
      high: number | null;
    };
  };
  highestPrice: number;
}

interface CardData {
  generatedAt: string;
  minPrice: number;
  totalCards: number;
  cards: CachedCard[];
}

let cardData: CardData | null = null;
let fuseIndex: Fuse<CachedCard> | null = null;
let cardsByNumber: Map<string, CachedCard[]> | null = null; // Pre-indexed by normalized number
let loadPromise: Promise<void> | null = null;

/**
 * Build card number index for O(1) lookups
 */
function buildNumberIndex(cards: CachedCard[]): Map<string, CachedCard[]> {
  const index = new Map<string, CachedCard[]>();
  for (const card of cards) {
    const normalized = normalizeCardNumber(card.number);
    if (!index.has(normalized)) {
      index.set(normalized, []);
    }
    index.get(normalized)!.push(card);
  }
  return index;
}

// Fuse.js options for fuzzy search - stricter threshold to avoid false matches
const fuseOptions: IFuseOptions<CachedCard> = {
  keys: [
    { name: "name", weight: 2 },
    { name: "setName", weight: 0.5 },
    { name: "rarity", weight: 0.3 },
  ],
  threshold: 0.2, // Stricter matching (was 0.3) - prevents latias/latios cross-match
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
};

/**
 * Load card data from JSON file (cached after first load)
 * Returns silently if data not available - will use API fallback
 */
export async function loadCardData(): Promise<void> {
  if (cardData) return;

  if (loadPromise) {
    await loadPromise;
    return;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch("/cards-data.json");
      if (!response.ok) {
        // Not an error - just means local cache not available
        console.log("Local card cache not available (will use API)");
        return;
      }

      cardData = await response.json();

      if (cardData) {
        fuseIndex = new Fuse(cardData.cards, fuseOptions);
        cardsByNumber = buildNumberIndex(cardData.cards);
        console.log(`Loaded ${cardData.totalCards} cached cards (from ${cardData.generatedAt})`);
      }
    } catch (err) {
      // Silent fail - API will be used as fallback
      console.log("Local card cache not available (will use API)");
      cardData = null;
      fuseIndex = null;
      cardsByNumber = null;
    }
  })();

  await loadPromise;
}

/**
 * Search cards using fuzzy matching (legacy)
 */
export function searchCards(query: string, limit = 50): CachedCard[] {
  if (!fuseIndex || !cardData) {
    console.warn("Card data not loaded yet");
    return [];
  }

  if (!query.trim()) {
    return [];
  }

  const results = fuseIndex.search(query, { limit });

  return results.map((r) => r.item);
}

/**
 * Smart search with exact-first matching
 * - Detects query type (card number, set+number, or name)
 * - Does exact substring match BEFORE fuzzy
 * - Prevents false matches like latias/latios
 */
export function smartSearch(query: string, limit = 50): CachedCard[] {
  if (!cardData || !fuseIndex || !cardsByNumber) {
    console.warn("Card data not loaded yet");
    return [];
  }

  if (!query.trim()) {
    return [];
  }

  const parsed = parseQuery(query);
  let results: CachedCard[] = [];

  switch (parsed.type) {
    case "card-number":
      // "25/102" - exact card number lookup
      results = searchByCardNumber(parsed.cardNumber!, parsed.setSize);
      break;

    case "set-number":
      // "base set 4" - set + number combination
      results = searchBySetAndNumber(parsed.setHint, parsed.cardNumber!);
      break;

    case "name":
      // "charizard" - name search with exact-first
      results = searchByName(parsed.nameQuery);
      break;
  }

  // If specific search returned nothing, fall back to fuzzy on full query
  if (results.length === 0 && parsed.type !== "name") {
    results = searchByName(parsed.originalQuery);
  }

  return results.slice(0, limit);
}

/**
 * Search by exact card number
 */
function searchByCardNumber(cardNum: string, setSize?: string): CachedCard[] {
  if (!cardsByNumber) return [];

  const normalized = cardNum.replace(/^0+/, "") || "0";
  const candidates = cardsByNumber.get(normalized) || [];

  let filtered = candidates;

  // If set size provided, filter to matching set sizes
  if (setSize) {
    filtered = candidates.filter((card) => {
      const parts = card.number.split("/");
      return parts[1] === setSize;
    });
  }

  // Sort by price (highest first)
  return filtered.sort((a, b) => b.highestPrice - a.highestPrice);
}

/**
 * Search by set hint and card number
 */
function searchBySetAndNumber(setHint: string | undefined, cardNum: string): CachedCard[] {
  if (!cardsByNumber) return [];

  const normalized = cardNum.replace(/^0+/, "") || "0";
  const candidates = cardsByNumber.get(normalized) || [];

  if (!setHint) {
    return candidates.sort((a, b) => b.highestPrice - a.highestPrice);
  }

  // Filter by set name match
  const filtered = candidates.filter((card) => matchSetName(setHint, card.setName));

  // Sort by price (highest first)
  return filtered.sort((a, b) => b.highestPrice - a.highestPrice);
}

/**
 * Search by name with exact-first strategy
 * 1. Exact substring matches in card name (case-insensitive)
 * 2. Fuzzy matches (only if exact yields few results)
 */
function searchByName(nameQuery: string): CachedCard[] {
  if (!cardData || !fuseIndex) return [];

  const lower = nameQuery.toLowerCase().trim();
  if (!lower) return [];

  // Step 1: Exact substring matches (prevents latias/latios issue)
  const exactMatches = cardData.cards.filter((card) =>
    card.name.toLowerCase().includes(lower)
  );

  // If we have good exact matches, prioritize them
  if (exactMatches.length > 0) {
    // Sort exact matches: exact name first, then by price
    const sorted = exactMatches.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lower ? 1 : 0;
      const bExact = b.name.toLowerCase() === lower ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return b.highestPrice - a.highestPrice;
    });

    // If we have enough exact matches, return them
    if (sorted.length >= 10) {
      return sorted;
    }

    // Otherwise, add fuzzy matches that aren't duplicates
    const exactIds = new Set(sorted.map((c) => c.id));
    const fuzzyResults = fuseIndex.search(nameQuery, { limit: 100 });

    for (const result of fuzzyResults) {
      if (!exactIds.has(result.item.id)) {
        sorted.push(result.item);
      }
    }

    return sorted;
  }

  // Step 2: No exact matches, use fuzzy only
  const fuzzyResults = fuseIndex.search(nameQuery, { limit: 100 });
  return fuzzyResults.map((r) => r.item);
}

/**
 * Get all cards (for browsing/filtering)
 */
export function getAllCards(): CachedCard[] {
  return cardData?.cards || [];
}

/**
 * Get data freshness info
 */
export function getDataInfo(): { generatedAt: string; totalCards: number; minPrice: number } | null {
  if (!cardData) return null;
  return {
    generatedAt: cardData.generatedAt,
    totalCards: cardData.totalCards,
    minPrice: cardData.minPrice,
  };
}

/**
 * Check if data is loaded
 */
export function isDataLoaded(): boolean {
  return cardData !== null && fuseIndex !== null;
}

// Price label mapping
export const priceLabels: Record<string, string> = {
  normal: "NORMAL",
  holofoil: "HOLO",
  reverseHolofoil: "REVERSE",
  "1stEditionHolofoil": "1ST ED HOLO",
  "1stEditionNormal": "1ST EDITION",
};

// Price badge class mapping
export const priceBadgeClass: Record<string, string> = {
  normal: "badge-normal",
  holofoil: "badge-holo",
  reverseHolofoil: "badge-reverse",
  "1stEditionHolofoil": "badge-1st",
  "1stEditionNormal": "badge-1st",
};
