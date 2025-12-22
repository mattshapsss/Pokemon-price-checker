/**
 * Client-side card search using cached data and Fuse.js
 */

import Fuse, { IFuseOptions } from "fuse.js";

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
let loadPromise: Promise<void> | null = null;

// Fuse.js options for fuzzy search
const fuseOptions: IFuseOptions<CachedCard> = {
  keys: [
    { name: "name", weight: 2 },
    { name: "setName", weight: 0.5 },
    { name: "rarity", weight: 0.3 },
  ],
  threshold: 0.3, // Lower = stricter matching
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
        console.log(`Loaded ${cardData.totalCards} cached cards (from ${cardData.generatedAt})`);
      }
    } catch (err) {
      // Silent fail - API will be used as fallback
      console.log("Local card cache not available (will use API)");
      cardData = null;
      fuseIndex = null;
    }
  })();

  await loadPromise;
}

/**
 * Search cards using fuzzy matching
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
