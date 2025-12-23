"use client";

import { CachedCard } from "@/lib/card-search";
import CardResult from "./CardResult";
import { DensityOption } from "./DensityToggle";

interface CardGridProps {
  cards: CachedCard[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  dataLoading?: boolean;
  onCardClick?: (card: CachedCard) => void;
  density?: DensityOption;
}

export default function CardGrid({ cards, isLoading, error, hasSearched, onCardClick, density = "normal" }: CardGridProps) {
  const isCompact = density === "compact";
  if (error) {
    return (
      <div className="retro-container p-6 text-center">
        <div
          className="text-[var(--poke-red)]"
          style={{ fontFamily: "var(--font-vt323)", fontSize: "1.25rem" }}
        >
          ERROR: {error}
        </div>
        <p
          className="text-[var(--poke-gray)] mt-2"
          style={{ fontFamily: "var(--font-vt323)" }}
        >
          Please try again or check your connection.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" style={{ width: "40px", height: "40px" }} />
          <div
            className="text-[var(--poke-gray)]"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "1.25rem" }}
          >
            SEARCHING...
          </div>
        </div>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="text-center py-12 px-4">
        <div
          className="text-[var(--poke-gray)] mb-4"
          style={{ fontFamily: "var(--font-vt323)", fontSize: "1.5rem" }}
        >
          SEARCH FOR A POKEMON CARD
        </div>
        <div
          className="text-[var(--poke-gray)] opacity-60"
          style={{ fontFamily: "var(--font-vt323)", fontSize: "1rem" }}
        >
          Type a card name to see TCGPlayer prices instantly.
          <br />
          Typos are okay - we will find the right card.
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div
          className="text-[var(--poke-gray)]"
          style={{ fontFamily: "var(--font-vt323)", fontSize: "1.5rem" }}
        >
          NO CARDS FOUND
        </div>
        <p
          className="text-[var(--poke-gray)] opacity-60 mt-2"
          style={{ fontFamily: "var(--font-vt323)" }}
        >
          Try a different search term.
        </p>
      </div>
    );
  }

  // Normal: 2/3/4 columns | Compact: 3/4/6 columns
  const gridClass = isCompact
    ? "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2"
    : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";

  return (
    <div className={gridClass}>
      {cards.map((card) => (
        <CardResult
          key={card.id}
          card={card}
          onClick={onCardClick ? () => onCardClick(card) : undefined}
          compact={isCompact}
        />
      ))}
    </div>
  );
}
