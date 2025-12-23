/**
 * Test if TCGCSV includes graded products
 */

async function test() {
  const groupId = 5; // Base Set

  console.log("Fetching Base Set products from TCGCSV...");

  const resp = await fetch(`https://tcgcsv.com/tcgplayer/3/${groupId}/products`);
  if (!resp.ok) {
    console.log("Error:", resp.status);
    return;
  }

  const data = await resp.json();
  const products = (data.results || data) as Array<{ productId: number; name: string; cleanName?: string }>;

  console.log("Total products in Base Set:", products.length);

  // Look for graded
  const graded = products.filter(
    (p) => p.name.includes("PSA") || p.name.includes("CGC") || p.name.includes("BGS")
  );

  console.log("Graded products:", graded.length);

  if (graded.length > 0) {
    console.log("\nSample graded:");
    graded.slice(0, 10).forEach((p) => console.log("  -", p.productId, p.name));
  }

  // Show sample of regular products
  console.log("\nSample regular products:");
  products.slice(0, 10).forEach((p) => console.log("  -", p.productId, p.name));

  // Check for any Charizard products
  const charizards = products.filter((p) => p.name.toLowerCase().includes("charizard"));
  console.log("\nCharizard products:", charizards.length);
  charizards.forEach((p) => console.log("  -", p.productId, p.name));
}

test().catch(console.error);
