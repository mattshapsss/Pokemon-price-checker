"use server";

import { searchCards, PokemonCard } from "@/lib/pokemon-api";

export async function searchCardsAction(query: string): Promise<{
  cards: PokemonCard[];
  error: string | null;
}> {
  try {
    const cards = await searchCards(query);
    return { cards, error: null };
  } catch (error) {
    console.error("Search error:", error);
    return {
      cards: [],
      error: error instanceof Error ? error.message : "Failed to search cards",
    };
  }
}
