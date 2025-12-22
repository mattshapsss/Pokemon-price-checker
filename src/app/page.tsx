"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import SearchBar, { SearchBarRef } from "@/components/SearchBar";
import CardGrid from "@/components/CardGrid";
import SortToggle, { SortOption, getSavedSort, saveSort } from "@/components/SortToggle";
import {
  CachedCard,
  loadCardData,
  searchCards as searchLocalCards,
  isDataLoaded,
  getDataInfo,
} from "@/lib/card-search";
import { searchCardsAction } from "./actions";
import { PokemonCard } from "@/lib/pokemon-api";

function sortCards(cards: CachedCard[], sortBy: SortOption): CachedCard[] {
  const sorted = [...cards];
  switch (sortBy) {
    case "price-high":
      return sorted.sort((a, b) => b.highestPrice - a.highestPrice);
    case "price-low":
      return sorted.sort((a, b) => a.highestPrice - b.highestPrice);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
      return sorted.sort((a, b) =>
        new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      );
    default:
      return sorted;
  }
}

export default function Home() {
  const [rawCards, setRawCards] = useState<CachedCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("price-high");
  const searchBarRef = useRef<SearchBarRef>(null);

  // Load card data on mount (optional - will fall back to API if not available)
  useEffect(() => {
    loadCardData()
      .then(() => {
        setDataLoading(false);
        const info = getDataInfo();
        if (info) {
          console.log(`Cards loaded: ${info.totalCards} (min $${info.minPrice})`);
        }
      })
      .catch((err) => {
        // Not an error - just means we'll use API fallback
        console.log("Local card data not available, using API search");
        setDataLoading(false);
      });
  }, []);

  // Load saved sort preference on mount
  useEffect(() => {
    setSortBy(getSavedSort());
  }, []);

  // Apply sorting client-side
  const cards = useMemo(() => sortCards(rawCards, sortBy), [rawCards, sortBy]);

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSortBy(newSort);
    saveSort(newSort);
  }, []);

  // Convert API card to cached format
  const apiToCached = useCallback((card: PokemonCard): CachedCard => {
    const prices: CachedCard["prices"] = {};
    const tcgPrices = card.tcgplayer?.prices;
    if (tcgPrices) {
      const keys = ["normal", "holofoil", "reverseHolofoil", "1stEditionHolofoil", "1stEditionNormal"] as const;
      for (const key of keys) {
        const p = tcgPrices[key];
        if (p?.market) {
          prices[key] = { market: p.market, low: p.low, high: p.high };
        }
      }
    }
    const allPrices = Object.values(prices).map(p => p.market).filter(Boolean);
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
      highestPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
    };
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setRawCards([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Try local search first (instant)
    if (isDataLoaded()) {
      const results = searchLocalCards(query, 100);
      setRawCards(results);
      setHasSearched(true);
      setIsLoading(false);

      if (results.length > 0) {
        searchBarRef.current?.saveRecentSearch(query);
      }
      return;
    }

    // Fallback to API search (slower)
    try {
      const result = await searchCardsAction(query);
      if (result.error) {
        setError(result.error);
      } else {
        const converted = result.cards.map(apiToCached);
        setRawCards(converted);

        if (converted.length > 0) {
          searchBarRef.current?.saveRecentSearch(query);
        }
      }
      setHasSearched(true);
    } catch (err) {
      setError("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [apiToCached]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="header-bar sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1
            className="text-[var(--poke-white)] flex items-center gap-2"
            style={{ fontFamily: "var(--font-press-start)", fontSize: "clamp(10px, 3vw, 14px)" }}
          >
            {/* Pokeball icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
              <circle cx="12" cy="12" r="11" fill="white" stroke="#0f0f1a" strokeWidth="2"/>
              <path d="M1 12h22" stroke="#0f0f1a" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="white" stroke="#0f0f1a" strokeWidth="2"/>
              <circle cx="12" cy="12" r="2" fill="#0f0f1a"/>
              <path d="M1 12h7" stroke="#ff1a1a" strokeWidth="2"/>
              <path d="M16 12h7" stroke="white" strokeWidth="2"/>
              <path d="M12 1v7" stroke="#ff1a1a" strokeWidth="2"/>
            </svg>
            <span className="hidden sm:inline">POKE PRICE</span>
            <span className="sm:hidden">PRICE</span>
          </h1>
          <div
            className="text-[var(--poke-white)] opacity-80"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "0.875rem" }}
          >
            TCGPLAYER PRICES
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Search Section */}
        <section className="retro-container p-4">
          <SearchBar ref={searchBarRef} onSearch={handleSearch} isLoading={isLoading} />
        </section>

        {/* Sort + Results Section */}
        <section className="space-y-3">
          {hasSearched && cards.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <SortToggle value={sortBy} onChange={handleSortChange} />
              <span
                className="text-[var(--poke-gray)]"
                style={{ fontFamily: "var(--font-vt323)", fontSize: "0.9rem" }}
              >
                {cards.length} results
              </span>
            </div>
          )}
          <CardGrid
            cards={cards}
            isLoading={isLoading}
            error={error}
            hasSearched={hasSearched}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-[var(--poke-border)] bg-[var(--poke-dark)] py-4 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div
            className="text-[var(--poke-gray)]"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "0.875rem" }}
          >
            Prices from TCGPlayer. Not affiliated with Pokemon Company.
          </div>
          <div
            className="text-[var(--poke-gray)] opacity-60"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "0.75rem" }}
          >
            Data via PokemonTCG.io API
          </div>
        </div>
      </footer>
    </div>
  );
}
