"use client";

export type DensityOption = "normal" | "compact";

interface DensityToggleProps {
  value: DensityOption;
  onChange: (density: DensityOption) => void;
}

const DENSITY_KEY = "cardDensity";

export function getSavedDensity(): DensityOption {
  if (typeof window === "undefined") return "normal";
  const saved = localStorage.getItem(DENSITY_KEY);
  return saved === "compact" ? "compact" : "normal";
}

export function saveDensity(density: DensityOption) {
  if (typeof window !== "undefined") {
    localStorage.setItem(DENSITY_KEY, density);
  }
}

export default function DensityToggle({ value, onChange }: DensityToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-[var(--poke-dark)] border-2 border-[var(--poke-border)] p-1">
      {/* Normal view */}
      <button
        onClick={() => onChange("normal")}
        className={`p-1.5 transition-colors ${
          value === "normal"
            ? "bg-[var(--poke-yellow)] text-[var(--poke-dark)]"
            : "text-[var(--poke-gray)] hover:text-[var(--poke-white)]"
        }`}
        title="Normal view"
        aria-label="Normal view"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          {/* 2x2 grid - larger cards */}
          <rect x="1" y="1" width="6" height="6" />
          <rect x="9" y="1" width="6" height="6" />
          <rect x="1" y="9" width="6" height="6" />
          <rect x="9" y="9" width="6" height="6" />
        </svg>
      </button>

      {/* Compact view */}
      <button
        onClick={() => onChange("compact")}
        className={`p-1.5 transition-colors ${
          value === "compact"
            ? "bg-[var(--poke-yellow)] text-[var(--poke-dark)]"
            : "text-[var(--poke-gray)] hover:text-[var(--poke-white)]"
        }`}
        title="Compact view"
        aria-label="Compact view"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          {/* 3x3 grid - smaller cards */}
          <rect x="1" y="1" width="3.5" height="3.5" />
          <rect x="6.25" y="1" width="3.5" height="3.5" />
          <rect x="11.5" y="1" width="3.5" height="3.5" />
          <rect x="1" y="6.25" width="3.5" height="3.5" />
          <rect x="6.25" y="6.25" width="3.5" height="3.5" />
          <rect x="11.5" y="6.25" width="3.5" height="3.5" />
          <rect x="1" y="11.5" width="3.5" height="3.5" />
          <rect x="6.25" y="11.5" width="3.5" height="3.5" />
          <rect x="11.5" y="11.5" width="3.5" height="3.5" />
        </svg>
      </button>
    </div>
  );
}
