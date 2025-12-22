/**
 * Script to download all Pokemon cards worth $10+ from the Pokemon TCG API
 * Run with: npx tsx scripts/download-cards.ts
 */

import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.POKEMON_TCG_API_KEY || "6f273cc5-3eab-4695-99ba-cbbf31fc6e58";
const MIN_PRICE = 10; // Only include cards worth $10+
const PAGE_SIZE = 100; // Smaller for reliability
const OUTPUT_PATH = path.join(__dirname, "../public/cards-data.json");

interface PriceData {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
}

interface TCGPlayerPrices {
  normal?: PriceData;
  holofoil?: PriceData;
  reverseHolofoil?: PriceData;
  "1stEditionHolofoil"?: PriceData;
  "1stEditionNormal"?: PriceData;
}

interface APICard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  rarity?: string;
  number: string;
  set: {
    id: string;
    name: string;
    series: string;
    releaseDate: string;
  };
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices?: TCGPlayerPrices;
  };
}

// Simplified card data for storage
interface CachedCard {
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

function getHighestPrice(prices?: TCGPlayerPrices): number {
  if (!prices) return 0;
  const allPrices = [
    prices.holofoil?.market,
    prices["1stEditionHolofoil"]?.market,
    prices.reverseHolofoil?.market,
    prices.normal?.market,
    prices["1stEditionNormal"]?.market,
  ].filter((p): p is number => p !== null && p !== undefined && p > 0);
  return allPrices.length > 0 ? Math.max(...allPrices) : 0;
}

function transformCard(card: APICard): CachedCard | null {
  const highestPrice = getHighestPrice(card.tcgplayer?.prices);

  // Skip cards under minimum price
  if (highestPrice < MIN_PRICE) return null;

  // Build simplified prices object
  const prices: CachedCard["prices"] = {};
  const tcgPrices = card.tcgplayer?.prices;

  if (tcgPrices) {
    const priceKeys = ["normal", "holofoil", "reverseHolofoil", "1stEditionHolofoil", "1stEditionNormal"] as const;
    for (const key of priceKeys) {
      const p = tcgPrices[key];
      if (p?.market && p.market > 0) {
        prices[key] = {
          market: p.market,
          low: p.low,
          high: p.high,
        };
      }
    }
  }

  return {
    id: card.id,
    name: card.name,
    rarity: card.rarity || "Unknown",
    number: card.number,
    setId: card.set.id,
    setName: card.set.name,
    series: card.set.series,
    releaseDate: card.set.releaseDate,
    imageSmall: card.images.small,
    imageLarge: card.images.large,
    tcgplayerUrl: card.tcgplayer?.url || "",
    priceUpdatedAt: card.tcgplayer?.updatedAt || "",
    prices,
    highestPrice,
  };
}

async function fetchPage(page: number, retries = 3): Promise<{ cards: APICard[]; totalCount: number }> {
  // Use smaller page size and filter for cards with prices to reduce load
  const url = `https://api.pokemontcg.io/v2/cards?pageSize=${PAGE_SIZE}&page=${page}&orderBy=-tcgplayer.prices.holofoil.market`;

  console.log(`Fetching page ${page}...`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

      const response = await fetch(url, {
        headers: { "X-Api-Key": API_KEY },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        cards: data.data,
        totalCount: data.totalCount,
      };
    } catch (err) {
      console.error(`Attempt ${attempt}/${retries} failed:`, err);
      if (attempt === retries) throw err;
      console.log(`Waiting 5s before retry...`);
      await sleep(5000);
    }
  }

  throw new Error("All retries failed");
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CONCURRENT_REQUESTS = 20; // Aggressive parallel downloads

async function fetchBatch(pages: number[]): Promise<APICard[]> {
  const results = await Promise.allSettled(pages.map(p => fetchPage(p)));
  const cards: APICard[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      cards.push(...result.value.cards);
    } else {
      console.error(`Page ${pages[i]} failed:`, result.reason);
    }
  }

  return cards;
}

async function main() {
  console.log("Starting download of Pokemon TCG cards...");
  console.log(`Filtering to cards worth $${MIN_PRICE}+`);
  console.log(`Using ${CONCURRENT_REQUESTS} concurrent requests\n`);

  const allCards: CachedCard[] = [];
  const seenIds = new Set<string>(); // Deduplicate
  let totalCount = 0;

  try {
    // First fetch to get total count
    const firstPage = await fetchPage(1);
    totalCount = firstPage.totalCount;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    console.log(`Total cards in API: ${totalCount}`);
    console.log(`Pages to fetch: ${totalPages}\n`);

    // Process first page
    for (const card of firstPage.cards) {
      if (!seenIds.has(card.id)) {
        seenIds.add(card.id);
        const transformed = transformCard(card);
        if (transformed) allCards.push(transformed);
      }
    }
    console.log(`Page 1 done. Cards $${MIN_PRICE}+: ${allCards.length}`);

    // Fetch remaining pages in parallel batches
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

    for (let i = 0; i < remainingPages.length; i += CONCURRENT_REQUESTS) {
      const batch = remainingPages.slice(i, i + CONCURRENT_REQUESTS);
      console.log(`Fetching pages ${batch[0]}-${batch[batch.length - 1]}...`);

      const batchCards = await fetchBatch(batch);

      for (const card of batchCards) {
        if (!seenIds.has(card.id)) {
          seenIds.add(card.id);
          const transformed = transformCard(card);
          if (transformed) allCards.push(transformed);
        }
      }

      const progress = Math.min(i + CONCURRENT_REQUESTS, remainingPages.length);
      console.log(`Progress: ${progress + 1}/${totalPages} pages. Cards $${MIN_PRICE}+: ${allCards.length}`);

      // Small delay between batches to avoid rate limiting
      await sleep(500);
    }

    // Sort by highest price descending
    allCards.sort((a, b) => b.highestPrice - a.highestPrice);

    // Write to file
    const output = {
      generatedAt: new Date().toISOString(),
      minPrice: MIN_PRICE,
      totalCards: allCards.length,
      cards: allCards,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output));

    const fileSizeKB = Math.round(fs.statSync(OUTPUT_PATH).size / 1024);

    console.log(`\n✅ Done!`);
    console.log(`Cards with price >= $${MIN_PRICE}: ${allCards.length}`);
    console.log(`File size: ${fileSizeKB} KB`);
    console.log(`Output: ${OUTPUT_PATH}`);

    // Show top 10 most valuable
    console.log(`\nTop 10 most valuable cards:`);
    allCards.slice(0, 10).forEach((card, i) => {
      console.log(`${i + 1}. ${card.name} (${card.setName}) - $${card.highestPrice.toFixed(2)}`);
    });

  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main();
