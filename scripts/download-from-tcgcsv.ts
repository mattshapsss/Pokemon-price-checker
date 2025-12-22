/**
 * Download Pokemon card data from TCGCSV (much faster than Pokemon TCG API)
 * Run with: npx tsx scripts/download-from-tcgcsv.ts
 */

import * as fs from "fs";
import * as path from "path";

const POKEMON_CATEGORY_ID = 3;
const MIN_PRICE = 10;
const OUTPUT_PATH = path.join(__dirname, "../public/cards-data.json");
const CONCURRENT_REQUESTS = 10;

interface TCGCSVGroup {
  groupId: number;
  name: string;
  abbreviation: string;
}

interface TCGCSVProduct {
  productId: number;
  name: string;
  cleanName: string;
  imageUrl: string;
  groupId: number;
  url: string;
  extendedData?: { name: string; value: string }[];
}

interface TCGCSVPrice {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  subTypeName: string;
}

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

async function fetchJSON<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.results || data;
    } catch (err) {
      if (attempt === retries) {
        throw new Error(`Failed to fetch ${url} after ${retries} attempts: ${err}`);
      }
      // Exponential backoff: 1s, 2s, 4s
      await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("Downloading Pokemon cards from TCGCSV...");
  console.log(`Filtering to cards worth $${MIN_PRICE}+\n`);

  const allCards: CachedCard[] = [];
  const seenIds = new Set<string>();

  try {
    // 1. Get all groups (sets)
    console.log("Fetching groups (sets)...");
    const groups: TCGCSVGroup[] = await fetchJSON(
      `https://tcgcsv.com/tcgplayer/${POKEMON_CATEGORY_ID}/groups`
    );
    console.log(`Found ${groups.length} sets\n`);

    // 2. Process groups in batches
    for (let i = 0; i < groups.length; i += CONCURRENT_REQUESTS) {
      const batch = groups.slice(i, i + CONCURRENT_REQUESTS);
      console.log(`Processing sets ${i + 1}-${Math.min(i + CONCURRENT_REQUESTS, groups.length)}/${groups.length}...`);

      const batchPromises = batch.map(async (group) => {
        try {
          // Get products and prices for this group
          const [products, prices] = await Promise.all([
            fetchJSON<TCGCSVProduct[]>(
              `https://tcgcsv.com/tcgplayer/${POKEMON_CATEGORY_ID}/${group.groupId}/products`
            ),
            fetchJSON<TCGCSVPrice[]>(
              `https://tcgcsv.com/tcgplayer/${POKEMON_CATEGORY_ID}/${group.groupId}/prices`
            ),
          ]);

          // Create price lookup by productId and subTypeName
          const priceMap = new Map<string, TCGCSVPrice>();
          for (const p of prices) {
            const key = `${p.productId}-${p.subTypeName}`;
            priceMap.set(key, p);
          }

          // Process products
          const cards: CachedCard[] = [];
          for (const product of products) {
            // Skip non-card items (sealed products, accessories, etc.)
            const skipTerms = [
              "Box", "Pack", "Deck", "Collection", "Tin", "Binder",
              "Booster", "Bundle", "Case", "Display", "Sleeve", "Album",
              "Playmat", "Dice", "Coin", "Pin", "Figure", "Plush",
              "Elite Trainer", "Build & Battle", "Blister"
            ];
            if (skipTerms.some(term => product.name.includes(term))) {
              continue;
            }

            // Get all prices for this product
            const productPrices: CachedCard["prices"] = {};
            let highestPrice = 0;

            for (const [key, price] of priceMap) {
              if (key.startsWith(`${product.productId}-`) && price.marketPrice) {
                const subType = price.subTypeName.toLowerCase().replace(" ", "");
                productPrices[subType] = {
                  market: price.marketPrice,
                  low: price.lowPrice,
                  high: price.highPrice,
                };
                if (price.marketPrice > highestPrice) {
                  highestPrice = price.marketPrice;
                }
              }
            }

            // Skip if below minimum price
            if (highestPrice < MIN_PRICE) continue;

            // Get card number from extended data
            let number = "";
            let rarity = "Unknown";
            if (product.extendedData) {
              const numberData = product.extendedData.find(d => d.name === "Number");
              const rarityData = product.extendedData.find(d => d.name === "Rarity");
              if (numberData) number = numberData.value;
              if (rarityData) rarity = rarityData.value;
            }

            const cardId = `tcg-${product.productId}`;
            if (!seenIds.has(cardId)) {
              seenIds.add(cardId);
              cards.push({
                id: cardId,
                name: product.cleanName || product.name,
                rarity,
                number,
                setId: String(group.groupId),
                setName: group.name,
                series: "",
                releaseDate: "",
                imageSmall: product.imageUrl,
                imageLarge: product.imageUrl.replace("_200w", "_400w"),
                tcgplayerUrl: product.url,
                priceUpdatedAt: new Date().toISOString(),
                prices: productPrices,
                highestPrice,
              });
            }
          }

          return cards;
        } catch (err) {
          console.error(`Error processing ${group.name}:`, err);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const cards of batchResults) {
        allCards.push(...cards);
      }

      console.log(`  Total cards $${MIN_PRICE}+: ${allCards.length}`);
      await sleep(100); // Small delay between batches
    }

    // Sort by highest price
    allCards.sort((a, b) => b.highestPrice - a.highestPrice);

    // Write output
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

    // Top 10
    console.log(`\nTop 10 most valuable cards:`);
    allCards.slice(0, 10).forEach((card, i) => {
      console.log(`${i + 1}. ${card.name} (${card.setName}) - $${card.highestPrice.toFixed(2)}`);
    });

    // Summary for CI logs
    console.log(`\n--- Summary ---`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Total cards: ${allCards.length}`);
    console.log(`File size: ${fileSizeKB} KB`);
    console.log(`Status: SUCCESS`);

  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
