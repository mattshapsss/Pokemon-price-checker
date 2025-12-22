"use client";

import { CachedCard } from "@/lib/card-search";
import Image from "next/image";
import { useEffect, useState } from "react";

interface CardModalProps {
  card: CachedCard;
  onClose: () => void;
}

const variantLabels: Record<string, string> = {
  normal: "Normal",
  holofoil: "Holofoil",
  reverseholofoil: "Reverse Holo",
  "1stedition": "1st Edition",
  "1stedition holofoil": "1st Ed Holo",
  unlimitedholofoil: "Unlimited Holo",
  unlimited: "Unlimited",
};

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "—";
  if (price >= 1000) return `$${(price / 1000).toFixed(1)}k`;
  return `$${price.toFixed(2)}`;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CardModal({ card, onClose }: CardModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

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

  const copyPrice = (price: number, label: string) => {
    navigator.clipboard.writeText(`$${price.toFixed(2)}`);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  // Generate search URLs for graded cards and eBay
  const cardSearchName = encodeURIComponent(`${card.name} ${card.setName}`);
  const cardSearchSimple = encodeURIComponent(`${card.name} pokemon card`);
  const psaSearchUrl = `https://www.tcgplayer.com/search/pokemon/product?q=${cardSearchName}%20PSA&view=grid`;
  const cgcSearchUrl = `https://www.tcgplayer.com/search/pokemon/product?q=${cardSearchName}%20CGC&view=grid`;

  // eBay sold listings - shows actual transaction prices
  const ebayRawSoldUrl = `https://www.ebay.com/sch/i.html?_nkw=${cardSearchSimple}&_sacat=0&LH_Sold=1&LH_Complete=1&_sop=13`;
  const ebayPsaSoldUrl = `https://www.ebay.com/sch/i.html?_nkw=${cardSearchSimple}%20PSA&_sacat=0&LH_Sold=1&LH_Complete=1&_sop=13`;
  const ebayGradedSoldUrl = `https://www.ebay.com/sch/i.html?_nkw=${cardSearchSimple}%20graded&_sacat=0&LH_Sold=1&LH_Complete=1&_sop=13`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" />

      {/* Modal */}
      <div
        className="relative bg-[#0a0a14] border-4 border-[var(--poke-border)] max-w-lg w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 0 40px rgba(255,204,0,0.15)" }}
      >
        {/* Header Bar */}
        <div className="sticky top-0 z-10 bg-[#0a0a14] border-b-4 border-[var(--poke-border)] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[var(--poke-red)] border border-[var(--poke-border)]" />
            <span
              className="text-[var(--poke-white)]"
              style={{ fontFamily: "var(--font-press-start)", fontSize: "8px" }}
            >
              PRICE DATA
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[var(--poke-gray)] hover:text-[var(--poke-white)] transition-colors"
            style={{ fontFamily: "var(--font-press-start)", fontSize: "16px" }}
          >
            ✕
          </button>
        </div>

        {/* Card Preview Row */}
        <div className="p-4 flex gap-4 border-b-2 border-[var(--poke-border)]/50">
          {/* Thumbnail */}
          <div className="relative w-24 h-32 flex-shrink-0 bg-[#1a1a2e] border-2 border-[var(--poke-border)]">
            <Image
              src={card.imageLarge || card.imageSmall}
              alt={card.name}
              fill
              className="object-contain p-1"
              sizes="96px"
            />
          </div>

          {/* Card Info */}
          <div className="flex-1 min-w-0">
            <h2
              className="text-[var(--poke-yellow)] mb-1 leading-tight"
              style={{ fontFamily: "var(--font-press-start)", fontSize: "12px" }}
            >
              {card.name}
            </h2>
            <p
              className="text-[var(--poke-gray)] mb-1"
              style={{ fontFamily: "var(--font-vt323)", fontSize: "15px" }}
            >
              {card.setName}
            </p>
            <p
              className="text-[var(--poke-gray)]/70"
              style={{ fontFamily: "var(--font-vt323)", fontSize: "13px" }}
            >
              #{card.number} · {card.rarity || "Unknown"}
            </p>

            {/* Highest Price */}
            <div className="mt-2">
              <span
                className="text-[var(--poke-green)]"
                style={{ fontFamily: "var(--font-press-start)", fontSize: "16px" }}
              >
                {formatPrice(card.highestPrice)}
              </span>
              <span
                className="text-[var(--poke-gray)]/60 ml-2"
                style={{ fontFamily: "var(--font-vt323)", fontSize: "12px" }}
              >
                highest
              </span>
            </div>
          </div>
        </div>

        {/* RAW PRICES Section */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3
              className="text-[var(--poke-white)] flex items-center gap-2"
              style={{ fontFamily: "var(--font-press-start)", fontSize: "9px" }}
            >
              <span className="w-2 h-2 bg-[var(--poke-blue)]" />
              RAW CARD PRICES
            </h3>
            {card.priceUpdatedAt && (
              <span
                className="text-[var(--poke-gray)]/60"
                style={{ fontFamily: "var(--font-vt323)", fontSize: "11px" }}
              >
                Updated {getRelativeTime(card.priceUpdatedAt)}
              </span>
            )}
          </div>

          {/* Price Table */}
          <div className="space-y-2">
            {variants.map(([variant, prices]) => {
              const label = variantLabels[variant] || variant;

              return (
                <div
                  key={variant}
                  className="bg-[#1a1a2e] border-2 border-[var(--poke-border)] p-3"
                >
                  {/* Variant Label */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[var(--poke-yellow)]"
                      style={{ fontFamily: "var(--font-press-start)", fontSize: "9px" }}
                    >
                      {label.toUpperCase()}
                    </span>
                    <button
                      onClick={() => copyPrice(prices.market, variant)}
                      className="text-[var(--poke-gray)] hover:text-[var(--poke-white)] transition-colors"
                      style={{ fontFamily: "var(--font-vt323)", fontSize: "12px" }}
                    >
                      {copied === variant ? "✓ Copied" : "📋 Copy"}
                    </button>
                  </div>

                  {/* Price Row: LOW - MARKET - HIGH */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div
                        className="text-[var(--poke-gray)]/70"
                        style={{ fontFamily: "var(--font-vt323)", fontSize: "10px" }}
                      >
                        LOW
                      </div>
                      <div
                        className="text-[var(--poke-white)]"
                        style={{ fontFamily: "var(--font-vt323)", fontSize: "15px" }}
                      >
                        {prices.low ? formatPrice(prices.low) : "—"}
                      </div>
                    </div>
                    <div className="bg-[var(--poke-green)]/20 -mx-1 px-1 py-1">
                      <div
                        className="text-[var(--poke-green)]"
                        style={{ fontFamily: "var(--font-vt323)", fontSize: "10px" }}
                      >
                        MARKET
                      </div>
                      <div
                        className="text-[var(--poke-green)]"
                        style={{ fontFamily: "var(--font-press-start)", fontSize: "12px" }}
                      >
                        {formatPrice(prices.market)}
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-[var(--poke-gray)]/70"
                        style={{ fontFamily: "var(--font-vt323)", fontSize: "10px" }}
                      >
                        HIGH
                      </div>
                      <div
                        className="text-[var(--poke-white)]"
                        style={{ fontFamily: "var(--font-vt323)", fontSize: "15px" }}
                      >
                        {prices.high ? formatPrice(prices.high) : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GRADED PRICES Section */}
        <div className="p-4 border-t-2 border-[var(--poke-border)]/50 space-y-3">
          <h3
            className="text-[var(--poke-white)] flex items-center gap-2"
            style={{ fontFamily: "var(--font-press-start)", fontSize: "9px" }}
          >
            <span className="w-2 h-2 bg-[var(--poke-yellow)]" />
            GRADED PRICES
          </h3>

          <p
            className="text-[var(--poke-gray)]/70"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "13px" }}
          >
            Search TCGPlayer for graded versions:
          </p>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={psaSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 bg-[#1a1a2e] border-2 border-[var(--poke-border)] hover:border-[var(--poke-red)] transition-colors"
              style={{ fontFamily: "var(--font-vt323)", fontSize: "14px" }}
            >
              <span className="text-[var(--poke-red)]">PSA</span>
              <span className="text-[var(--poke-gray)]">Grades →</span>
            </a>
            <a
              href={cgcSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 bg-[#1a1a2e] border-2 border-[var(--poke-border)] hover:border-[var(--poke-blue)] transition-colors"
              style={{ fontFamily: "var(--font-vt323)", fontSize: "14px" }}
            >
              <span className="text-[var(--poke-blue)]">CGC</span>
              <span className="text-[var(--poke-gray)]">Grades →</span>
            </a>
          </div>
        </div>

        {/* SALES HISTORY Section */}
        <div className="p-4 border-t-2 border-[var(--poke-border)]/50 space-y-3">
          <h3
            className="text-[var(--poke-white)] flex items-center gap-2"
            style={{ fontFamily: "var(--font-press-start)", fontSize: "9px" }}
          >
            <span className="w-2 h-2 bg-[var(--poke-green)]" />
            RECENT SALES
          </h3>

          <p
            className="text-[var(--poke-gray)]/70"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "13px" }}
          >
            See actual sold prices on eBay:
          </p>

          <div className="grid grid-cols-3 gap-2">
            <a
              href={ebayRawSoldUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 py-2 bg-[#1a1a2e] border-2 border-[var(--poke-border)] hover:border-[var(--poke-green)] transition-colors"
              style={{ fontFamily: "var(--font-vt323)", fontSize: "12px" }}
            >
              <span className="text-[var(--poke-green)]">RAW</span>
              <span className="text-[var(--poke-gray)] text-[10px]">Sold →</span>
            </a>
            <a
              href={ebayPsaSoldUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 py-2 bg-[#1a1a2e] border-2 border-[var(--poke-border)] hover:border-[var(--poke-red)] transition-colors"
              style={{ fontFamily: "var(--font-vt323)", fontSize: "12px" }}
            >
              <span className="text-[var(--poke-red)]">PSA</span>
              <span className="text-[var(--poke-gray)] text-[10px]">Sold →</span>
            </a>
            <a
              href={ebayGradedSoldUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 py-2 bg-[#1a1a2e] border-2 border-[var(--poke-border)] hover:border-[var(--poke-yellow)] transition-colors"
              style={{ fontFamily: "var(--font-vt323)", fontSize: "12px" }}
            >
              <span className="text-[var(--poke-yellow)]">ALL</span>
              <span className="text-[var(--poke-gray)] text-[10px]">Graded →</span>
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t-2 border-[var(--poke-border)]/50 space-y-2">
          <a
            href={card.tcgplayerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-[var(--poke-blue)] text-white py-3 border-2 border-[var(--poke-border)] hover:bg-blue-600 transition-colors"
            style={{ fontFamily: "var(--font-press-start)", fontSize: "10px" }}
          >
            VIEW ON TCGPLAYER
          </a>

          <button
            onClick={() => {
              const text = `${card.name} (${card.setName}) - Market: $${card.highestPrice.toFixed(2)}`;
              navigator.clipboard.writeText(text);
              setCopied("summary");
              setTimeout(() => setCopied(null), 1500);
            }}
            className="block w-full text-center bg-[#1a1a2e] text-[var(--poke-gray)] py-2 border-2 border-[var(--poke-border)] hover:text-[var(--poke-white)] hover:border-[var(--poke-yellow)] transition-colors"
            style={{ fontFamily: "var(--font-vt323)", fontSize: "14px" }}
          >
            {copied === "summary" ? "✓ Copied!" : "Copy Summary"}
          </button>
        </div>
      </div>
    </div>
  );
}
