"use client";

import { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSubmit?: (query: string) => void; // Called on Enter/explicit submit - saves to recent
  isLoading: boolean;
}

export interface SearchBarRef {
  saveRecentSearch: (term: string) => void;
}

const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(function SearchBar(
  { onSearch, onSubmit, isLoading },
  ref
) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 5));
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save search to recent
  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    setRecentSearches((prev) => {
      const updated = [term, ...prev.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 5);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Expose saveRecentSearch to parent via ref
  useImperativeHandle(ref, () => ({
    saveRecentSearch,
  }), [saveRecentSearch]);

  // Debounced search - only triggers search, doesn't save
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (value.trim().length >= 2) {
          onSearch(value.trim());
        }
      }, 300);
    },
    [onSearch]
  );

  // Handle explicit submit (Enter key or button) - triggers save
  const handleSubmit = useCallback(
    (term: string) => {
      if (!term.trim() || term.trim().length < 2) return;
      onSearch(term.trim());
      onSubmit?.(term.trim());
    },
    [onSearch, onSubmit]
  );

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        handleSubmit(query);
      }
    },
    [handleSubmit, query]
  );

  // Quick search from chip - search immediately and save
  const handleQuickSearch = useCallback(
    (term: string) => {
      setQuery(term);
      onSearch(term);
      onSubmit?.(term); // Save to recent
      inputRef.current?.focus();
    },
    [onSearch, onSubmit]
  );

  // Clear search
  const handleClear = useCallback(() => {
    setQuery("");
    onSearch("");
    inputRef.current?.focus();
  }, [onSearch]);

  return (
    <div className="w-full space-y-4">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search any Pokemon card..."
          className="retro-input pr-12 text-lg"
          style={{ fontFamily: "var(--font-vt323)" }}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {isLoading ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="loading-spinner" />
          </div>
        ) : query ? (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--poke-gray)] hover:text-[var(--poke-white)] transition-colors p-1"
            aria-label="Clear search"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Search help / Recent searches */}
      <div className="space-y-3">
        {/* Recent searches - only show if there are any */}
        {recentSearches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[var(--poke-gray)]"
              style={{ fontFamily: "var(--font-vt323)", fontSize: "1rem" }}
            >
              Recent:
            </span>
            {recentSearches.map((term) => (
              <button
                key={`recent-${term}`}
                onClick={() => handleQuickSearch(term)}
                className="search-chip"
                style={{ fontFamily: "var(--font-vt323)" }}
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Search tips - always visible */}
        <div
          className="text-[var(--poke-gray)] opacity-70 space-y-1"
          style={{ fontFamily: "var(--font-vt323)", fontSize: "0.9rem" }}
        >
          <p>
            <span className="text-[var(--poke-white)]">By name:</span>{" "}
            Charizard, Pikachu VMAX, Umbreon V
          </p>
          <p>
            <span className="text-[var(--poke-white)]">By card #:</span>{" "}
            4/102, 25/102, base set 4
          </p>
          <p>
            <span className="text-[var(--poke-white)]">Typos OK:</span>{" "}
            We find the closest match
          </p>
        </div>
      </div>
    </div>
  );
});

export default SearchBar;
