"use client";

import { CachedCard } from "@/lib/card-search";
import Image from "next/image";
import { useEffect } from "react";

interface CardModalProps {
  card: CachedCard;
  onClose: () => void;
}

const variantLabels: Record<string, string> = {
  normal: "NORMAL",
  holofoil: "HOLOFOIL",
  reverseholofoil: "REVERSE HOLO",
  "1stedition": "1ST EDITION",
  "1stedition holofoil": "1ST ED HOLO",
  unlimitedholofoil: "UNLIMITED HOLO",
  unlimited: "UNLIMITED",
};

export default function CardModal({ card, onClose }: CardModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const variants = Object.entries(card.prices).sort(
    (a, b) => b[1].market - a[1].market
  );

  const copyPrice = (price: number) => {
    navigator.clipboard.writeText(`$${price.toFixed(2)}`);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Modal */}
      <div
        className="relative bg-[var(--poke-dark)] border-4 border-[var(--poke-border)] max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-[var(--poke-red)] text-white border-2 border-[var(--poke-border)] hover:bg-red-700 transition-colors"
          style={{ fontFamily: "var(--font-press-start)", fontSize: "12px" }}
        >
          ✕
        </button>

        {/* Card Image */}
        <div className="p-4 pb-0">
          <div className="relative w-full aspect-[2.5/3.5] bg-[#1a1a2e] border-2 border-[var(--poke-border)]">
            <Image
              src={card.imageLarge || card.imageSmall}
              alt={card.name}
              fill
              className="object-contain"
              sizes="(max-width: 400px) 100vw, 400px"
              priority
            />
          </div>
        </div>

        {/* Card Info */}
        <div className="p-4 space-y-4">
          <div>
            <h2
              className="text-[var(--poke-yellow)] mb-1"
              style={{ fontFamily: "var(--font-press-start)", fontSize: "14px" }}
            >
              {card.name}
            </h2>
            <p
              className="text-[var(--poke-gray)]"
              style={{ fontFamily: "var(--font-vt323)", fontSize: "16px" }}
            >
              {card.setName} · #{card.number}
            </p>
            {card.rarity && card.rarity !== "Unknown" && (
              <p
                className="text-[var(--poke-blue)]"
                style={{ fontFamily: "var(--font-vt323)", fontSize: "14px" }}
              >
                {card.rarity}
              </p>
            )}
          </div>

          {/* Price Variants */}
          <div className="space-y-2">
            <h3
              className="text-[var(--poke-white)] border-b-2 border-[var(--poke-border)] pb-1"
              style={{ fontFamily: "var(--font-press-start)", fontSize: "10px" }}
            >
              PRICES BY VARIANT
            </h3>

            {variants.map(([variant, prices]) => (
              <div
                key={variant}
                className="bg-[#1a1a2e] border-2 border-[var(--poke-border)] p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[var(--poke-yellow)]"
                    style={{ fontFamily: "var(--font-press-start)", fontSize: "9px" }}
                  >
                    {variantLabels[variant] || variant.toUpperCase()}
                  </span>
                  <button
                    onClick={() => copyPrice(prices.market)}
                    className="text-[var(--poke-gray)] hover:text-[var(--poke-white)] transition-colors px-2"
                    style={{ fontFamily: "var(--font-vt323)", fontSize: "14px" }}
                    title="Copy price"
                  >
                    📋
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div
                      className="text-[var(--poke-gray)]"
                      style={{ fontFamily: "var(--font-vt323)", fontSize: "12px" }}
                    >
                      LOW
                    </div>
                    <div
                      className="text-[var(--poke-white)]"
                      style={{ fontFamily: "var(--font-vt323)", fontSize: "16px" }}
                    >
                      {prices.low ? `$${prices.low.toFixed(2)}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[var(--poke-gray)]"
                      style={{ fontFamily: "var(--font-vt323)", fontSize: "12px" }}
                    >
                      MARKET
                    </div>
                    <div
                      className="text-[var(--poke-green)]"
                      style={{ fontFamily: "var(--font-press-start)", fontSize: "14px" }}
                    >
                      ${prices.market.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[var(--poke-gray)]"
                      style={{ fontFamily: "var(--font-vt323)", fontSize: "12px" }}
                    >
                      HIGH
                    </div>
                    <div
                      className="text-[var(--poke-white)]"
                      style={{ fontFamily: "var(--font-vt323)", fontSize: "16px" }}
                    >
                      {prices.high ? `$${prices.high.toFixed(2)}` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* TCGPlayer Link */}
          {card.tcgplayerUrl && (
            <a
              href={card.tcgplayerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-[var(--poke-blue)] text-white py-3 border-2 border-[var(--poke-border)] hover:bg-blue-700 transition-colors"
              style={{ fontFamily: "var(--font-press-start)", fontSize: "10px" }}
            >
              VIEW ON TCGPLAYER
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
