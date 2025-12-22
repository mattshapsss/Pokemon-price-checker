// Pokemon TCG API Client
// API Documentation: https://docs.pokemontcg.io/

export interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  evolvesTo?: string[];
  rules?: string[];
  attacks?: Attack[];
  weaknesses?: Weakness[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  set: CardSet;
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: Legalities;
  images: CardImages;
  tcgplayer?: TCGPlayerData;
  cardmarket?: CardMarketData;
}

interface Attack {
  name: string;
  cost: string[];
  convertedEnergyCost: number;
  damage: string;
  text: string;
}

interface Weakness {
  type: string;
  value: string;
}

interface CardSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities?: Legalities;
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt: string;
  images: {
    symbol: string;
    logo: string;
  };
}

interface Legalities {
  unlimited?: string;
  standard?: string;
  expanded?: string;
}

interface CardImages {
  small: string;
  large: string;
}

export interface TCGPlayerData {
  url: string;
  updatedAt: string;
  prices?: {
    normal?: PriceData;
    holofoil?: PriceData;
    reverseHolofoil?: PriceData;
    "1stEditionHolofoil"?: PriceData;
    "1stEditionNormal"?: PriceData;
  };
}

export interface PriceData {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  directLow: number | null;
}

interface CardMarketData {
  url: string;
  updatedAt: string;
  prices?: {
    averageSellPrice?: number;
    lowPrice?: number;
    trendPrice?: number;
  };
}

interface APIResponse {
  data: PokemonCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

// Simple in-memory cache
const cache = new Map<string, { data: PokemonCard[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function searchCards(query: string): Promise<PokemonCard[]> {
  if (!query.trim()) return [];

  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Build search query - search by name with wildcard (no quotes - they cause timeouts)
  const searchQuery = encodeURIComponent(`name:${query}*`);
  const url = `https://api.pokemontcg.io/v2/cards?q=${searchQuery}&pageSize=30&orderBy=-set.releaseDate`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": process.env.POKEMON_TCG_API_KEY || "",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data: APIResponse = await response.json();

    // Sort results: exact matches first, then by market price (highest first)
    const sortedCards = sortCardsByRelevance(data.data, query);

    // Cache the results
    cache.set(cacheKey, { data: sortedCards, timestamp: Date.now() });

    return sortedCards;
  } catch (error) {
    console.error("Failed to fetch cards:", error);
    throw error;
  }
}

function sortCardsByRelevance(cards: PokemonCard[], query: string): PokemonCard[] {
  const queryLower = query.toLowerCase();

  return cards.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // Exact match first
    const aExact = aName === queryLower;
    const bExact = bName === queryLower;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // Starts with query next
    const aStarts = aName.startsWith(queryLower);
    const bStarts = bName.startsWith(queryLower);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    // Then by highest market price
    const aPrice = getHighestPrice(a);
    const bPrice = getHighestPrice(b);
    return bPrice - aPrice;
  });
}

export function getHighestPrice(card: PokemonCard): number {
  if (!card.tcgplayer?.prices) return 0;

  const prices = card.tcgplayer.prices;
  const allPrices = [
    prices.holofoil?.market,
    prices["1stEditionHolofoil"]?.market,
    prices.reverseHolofoil?.market,
    prices.normal?.market,
    prices["1stEditionNormal"]?.market,
  ].filter((p): p is number => p !== null && p !== undefined);

  return allPrices.length > 0 ? Math.max(...allPrices) : 0;
}

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "N/A";
  return `$${price.toFixed(2)}`;
}

export function getVariantBadge(variantKey: string): { label: string; className: string } {
  const badges: Record<string, { label: string; className: string }> = {
    holofoil: { label: "HOLO", className: "badge-holo" },
    reverseHolofoil: { label: "REVERSE", className: "badge-reverse" },
    normal: { label: "NORMAL", className: "badge-normal" },
    "1stEditionHolofoil": { label: "1ST ED HOLO", className: "badge-1st" },
    "1stEditionNormal": { label: "1ST EDITION", className: "badge-1st" },
  };
  return badges[variantKey] || { label: variantKey.toUpperCase(), className: "badge-normal" };
}

export interface CardVariant {
  type: string;
  label: string;
  badgeClass: string;
  price: PriceData;
}

export function getCardVariants(card: PokemonCard): CardVariant[] {
  if (!card.tcgplayer?.prices) return [];

  const variants: CardVariant[] = [];
  const prices = card.tcgplayer.prices;

  // Order by typical value: 1st Ed Holo > Holo > 1st Ed Normal > Reverse > Normal
  const variantOrder = [
    "1stEditionHolofoil",
    "holofoil",
    "1stEditionNormal",
    "reverseHolofoil",
    "normal",
  ];

  for (const key of variantOrder) {
    const priceData = prices[key as keyof typeof prices];
    if (priceData && priceData.market !== null) {
      const badge = getVariantBadge(key);
      variants.push({
        type: key,
        label: badge.label,
        badgeClass: badge.className,
        price: priceData,
      });
    }
  }

  return variants;
}
