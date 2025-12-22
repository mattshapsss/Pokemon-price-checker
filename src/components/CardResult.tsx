"use client";

import Image from "next/image";
import { CachedCard, priceLabels, priceBadgeClass } from "@/lib/card-search";
import { useState } from "react";

interface CardResultProps {
  card: CachedCard;
  onClick?: () => void;
}

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "N/A";
  return `$${price.toFixed(2)}`;
}

export default function CardResult({ card, onClick }: CardResultProps) {
  const [imageError, setImageError] = useState(false);

  // Get variant keys in order of value
  const variantKeys = Object.keys(card.prices).sort((a, b) => {
    return (card.prices[b]?.market || 0) - (card.prices[a]?.market || 0);
  });

  const primaryVariant = variantKeys[0];
  const primaryPrice = card.prices[primaryVariant];

  return (
    <article
      className="poke-card flex flex-col cursor-pointer hover:border-[var(--poke-yellow)] transition-colors"
      onClick={onClick}
    >
      {/* Card Image - Hero Element */}
      <div className="relative aspect-[2.5/3.5] bg-[var(--poke-dark)]">
        {!imageError ? (
          <Image
            src={card.imageLarge || card.imageSmall}
            alt={`${card.name} - ${card.setName}`}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
            className="object-contain p-1"
            onError={() => setImageError(true)}
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--poke-gray)]">
            <span style={{ fontFamily: "var(--font-vt323)", fontSize: "1rem" }}>
              NO IMAGE
            </span>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-3 space-y-2 border-t-3 border-[var(--poke-border)]">
        {/* Card Name */}
        <h3
          className="text-[var(--poke-white)] font-bold truncate"
          style={{ fontFamily: "var(--font-vt323)", fontSize: "1.25rem" }}
          title={card.name}
        >
          {card.name}
        </h3>

        {/* Set Info */}
        <div
          className="text-[var(--poke-gray)] truncate"
          style={{ fontFamily: "var(--font-vt323)", fontSize: "0.875rem" }}
          title={`${card.setName} #${card.number}`}
        >
          {card.setName} #{card.number}
        </div>

        {/* Rarity */}
        {card.rarity && card.rarity !== "Unknown" && (
          <div
            className="text-[var(--poke-gray)] opacity-70"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "0.75rem" }}
          >
            {card.rarity.toUpperCase()}
          </div>
        )}

        {/* Main Price - BIG AND BOLD */}
        {primaryPrice ? (
          <div className="pt-1">
            <div className="price-main" style={{ fontFamily: "var(--font-vt323)" }}>
              {formatPrice(primaryPrice.market)}
            </div>
            {primaryPrice.low !== null && primaryPrice.high !== null && (
              <div className="price-range" style={{ fontFamily: "var(--font-vt323)" }}>
                {formatPrice(primaryPrice.low)} - {formatPrice(primaryPrice.high)}
              </div>
            )}
          </div>
        ) : (
          <div
            className="text-[var(--poke-gray)] pt-1"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "1rem" }}
          >
            NO PRICE DATA
          </div>
        )}

        {/* Variant Badges with Prices */}
        {variantKeys.length > 0 && (
          <div className="space-y-1 pt-1">
            {variantKeys.map((key) => {
              const price = card.prices[key];
              const label = priceLabels[key] || key.toUpperCase();
              const badgeClass = priceBadgeClass[key] || "badge-normal";

              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span
                    className={`badge ${badgeClass}`}
                    style={{ fontFamily: "var(--font-press-start)", fontSize: "6px" }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-[var(--poke-white)]"
                    style={{ fontFamily: "var(--font-vt323)", fontSize: "0.9rem" }}
                  >
                    {formatPrice(price?.market)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* TCGPlayer Link */}
        {card.tcgplayerUrl && (
          <a
            href={card.tcgplayerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="block mt-2 text-center py-2 bg-[var(--poke-dark)] border-2 border-[var(--poke-border)] text-[var(--poke-blue)] hover:border-[var(--poke-blue)] transition-colors"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "0.875rem" }}
          >
            VIEW ON TCGPLAYER
          </a>
        )}
      </div>
    </article>
  );
}
