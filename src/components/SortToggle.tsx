"use client";

import { useState, useEffect } from "react";

export type SortOption = "price-high" | "price-low" | "name" | "newest";

interface SortToggleProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

const sortLabels: Record<SortOption, string> = {
  "price-high": "PRICE ↓",
  "price-low": "PRICE ↑",
  "name": "NAME",
  "newest": "NEWEST",
};

export function getSavedSort(): SortOption {
  if (typeof window === "undefined") return "price-high";
  const saved = localStorage.getItem("sortPreference");
  if (saved && saved in sortLabels) {
    return saved as SortOption;
  }
  return "price-high";
}

export function saveSort(sort: SortOption) {
  localStorage.setItem("sortPreference", sort);
}

export default function SortToggle({ value, onChange }: SortToggleProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const options: SortOption[] = ["price-high", "price-low", "name", "newest"];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className="text-[var(--poke-gray)]"
        style={{ fontFamily: "var(--font-vt323)", fontSize: "0.9rem" }}
      >
        Sort:
      </span>
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`px-2 py-1 border-2 transition-colors ${
              value === option
                ? "border-[var(--poke-yellow)] bg-[var(--poke-yellow)] text-[var(--poke-dark)]"
                : "border-[var(--poke-border)] text-[var(--poke-gray)] hover:border-[var(--poke-gray)]"
            }`}
            style={{ fontFamily: "var(--font-vt323)", fontSize: "0.85rem" }}
          >
            {sortLabels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
