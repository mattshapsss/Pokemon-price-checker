import { NextRequest, NextResponse } from "next/server";

// EUR to USD conversion rate (updated periodically)
const EUR_TO_USD = 1.08;

interface CardMarketGradedPrices {
  psa?: {
    psa10?: number;
    psa9?: number;
    psa8?: number;
    psa7?: number;
  };
  cgc?: {
    cgc10?: number;
    cgc9?: number;
  };
  bgs?: {
    bgs10?: number;
    bgs9?: number;
  };
}

interface CardMarketCard {
  id: number;
  name: string;
  name_numbered: string;
  card_number: number;
  rarity: string;
  prices?: {
    cardmarket?: {
      currency: string;
      lowest_near_mint?: number;
      graded?: CardMarketGradedPrices;
    };
    tcg_player?: {
      currency: string;
      market_price?: number;
      mid_price?: number;
    };
  };
  episode?: {
    name: string;
    code: string;
  };
}

interface CardMarketResponse {
  data: CardMarketCard[];
  meta?: {
    total: number;
    per_page: number;
  };
}

export interface GradedPriceData {
  found: boolean;
  cardName?: string;
  setName?: string;
  currency: string;
  rawPrice?: number;
  graded: {
    psa10?: number;
    psa9?: number;
    psa8?: number;
    cgc10?: number;
    cgc9?: number;
    bgs10?: number;
    bgs9?: number;
  };
  source: string;
  fetchedAt: string;
}

function convertToUsd(eurPrice: number | undefined): number | undefined {
  if (!eurPrice) return undefined;
  return Math.round(eurPrice * EUR_TO_USD);
}

// Simple in-memory cache (resets on server restart)
const cache = new Map<string, { data: GradedPriceData; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cardName = searchParams.get("name");
  const setName = searchParams.get("set");
  const cardNumber = searchParams.get("number");

  if (!cardName) {
    return NextResponse.json({ error: "Missing card name" }, { status: 400 });
  }

  // Create cache key
  const cacheKey = `${cardName}|${setName || ""}|${cardNumber || ""}`.toLowerCase();

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    // Search CardMarket API for the card
    const searchQuery = cardNumber ? `${cardName} ${cardNumber}` : cardName;
    const url = `https://cardmarket-api-tcg.p.rapidapi.com/pokemon/cards/search?search=${encodeURIComponent(searchQuery)}&sort=episode_newest`;

    const response = await fetch(url, {
      headers: {
        "x-rapidapi-host": "cardmarket-api-tcg.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data: CardMarketResponse = await response.json();

    // Find the best matching card
    let bestMatch: CardMarketCard | null = null;

    for (const card of data.data || []) {
      // If we have set name, try to match it
      if (setName) {
        const cardSetName = card.episode?.name?.toLowerCase() || "";
        const searchSet = setName.toLowerCase();
        if (cardSetName.includes(searchSet) || searchSet.includes(cardSetName)) {
          // Also check card number if provided
          if (cardNumber) {
            if (String(card.card_number) === cardNumber) {
              bestMatch = card;
              break;
            }
          } else {
            bestMatch = card;
            break;
          }
        }
      }

      // Fall back to name match
      if (!bestMatch) {
        const cardNameLower = card.name.toLowerCase();
        const searchNameLower = cardName.toLowerCase();
        if (cardNameLower === searchNameLower || cardNameLower.includes(searchNameLower)) {
          bestMatch = card;
        }
      }
    }

    // If still no match, use first result
    if (!bestMatch && data.data?.length > 0) {
      bestMatch = data.data[0];
    }

    // Extract graded prices - use TCGPlayer USD for raw, convert graded EUR to USD
    const result: GradedPriceData = {
      found: !!bestMatch,
      currency: "USD",
      graded: {},
      source: "TCGPlayer/CardMarket via RapidAPI",
      fetchedAt: new Date().toISOString(),
    };

    if (bestMatch) {
      result.cardName = bestMatch.name;
      result.setName = bestMatch.episode?.name;

      // Use TCGPlayer USD price for raw card
      result.rawPrice = bestMatch.prices?.tcg_player?.market_price
        ? Math.round(bestMatch.prices.tcg_player.market_price * 100) / 100
        : undefined;

      // Convert graded prices from EUR to USD
      const graded = bestMatch.prices?.cardmarket?.graded;
      if (graded) {
        if (graded.psa) {
          result.graded.psa10 = convertToUsd(graded.psa.psa10);
          result.graded.psa9 = convertToUsd(graded.psa.psa9);
          result.graded.psa8 = convertToUsd(graded.psa.psa8);
        }
        if (graded.cgc) {
          result.graded.cgc10 = convertToUsd(graded.cgc.cgc10);
          result.graded.cgc9 = convertToUsd(graded.cgc.cgc9);
        }
        if (graded.bgs) {
          result.graded.bgs10 = convertToUsd(graded.bgs.bgs10);
          result.graded.bgs9 = convertToUsd(graded.bgs.bgs9);
        }
      }
    }

    // Cache the result
    cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch graded prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch graded prices", found: false, graded: {} },
      { status: 500 }
    );
  }
}
