/**
 * Query parser for smart Pokemon card search
 * Detects if user wants specific card (by number) or general fuzzy search
 */

export interface ParsedQuery {
  type: "card-number" | "set-number" | "name";
  cardNumber?: string; // "4", "25", "025"
  setSize?: string; // "102" from "25/102"
  setHint?: string; // "base set", "swsh"
  nameQuery: string; // Remaining text for name matching
  originalQuery: string;
}

// Common set name abbreviations
const SET_ABBREVIATIONS: Record<string, string[]> = {
  base: ["base set", "base set (shadowless)", "base set 2"],
  shadowless: ["base set (shadowless)"],
  jungle: ["jungle"],
  fossil: ["fossil"],
  rocket: ["team rocket", "team rocket returns"],
  neo: ["neo destiny", "neo genesis", "neo revelation", "neo discovery"],
  gym: ["gym heroes", "gym challenge"],
  swsh: ["swsh", "sword & shield"],
  sm: ["sm -", "sun & moon"],
  xy: ["xy -", "xy:"],
  bw: ["black & white", "bw -"],
  dp: ["diamond & pearl", "dp -"],
  ex: ["ex -", "ex:"],
  evolving: ["evolving skies"],
  brilliant: ["brilliant stars"],
  astral: ["astral radiance"],
  fusion: ["fusion strike"],
  chilling: ["chilling reign"],
  vivid: ["vivid voltage"],
  champions: ["champion's path"],
  hidden: ["hidden fates"],
  cosmic: ["cosmic eclipse"],
  unified: ["unified minds"],
  unbroken: ["unbroken bonds"],
  lost: ["lost origin"],
  silver: ["silver tempest"],
  crown: ["crown zenith"],
  paldea: ["paldea evolved"],
  obsidian: ["obsidian flames"],
  scarlet: ["scarlet & violet"],
  temporal: ["temporal forces"],
  twilight: ["twilight masquerade"],
  shrouded: ["shrouded fable"],
  stellar: ["stellar crown"],
  surging: ["surging sparks"],
};

/**
 * Parse a search query to detect type and extract components
 */
export function parseQuery(query: string): ParsedQuery {
  const normalized = query.trim();
  const lower = normalized.toLowerCase();

  // Pattern 1: Exact card number format "25/102", "107/105", "001/073"
  const slashMatch = lower.match(/^(\d{1,3})\/(\d{1,3})$/);
  if (slashMatch) {
    return {
      type: "card-number",
      cardNumber: slashMatch[1].replace(/^0+/, "") || "0",
      setSize: slashMatch[2],
      nameQuery: "",
      originalQuery: query,
    };
  }

  // Pattern 2: Number at end with set hint "base set 4", "swsh 025", "neo destiny 107"
  const setNumberMatch = lower.match(/^(.+?)\s+#?(\d{1,3})$/);
  if (setNumberMatch) {
    const setHint = setNumberMatch[1].trim();
    const cardNum = setNumberMatch[2].replace(/^0+/, "") || "0";

    // Check if set hint looks like a known set
    const isLikelySet =
      SET_ABBREVIATIONS[setHint] !== undefined ||
      Object.values(SET_ABBREVIATIONS).some((aliases) =>
        aliases.some((a) => setHint.includes(a) || a.includes(setHint))
      ) ||
      setHint.includes("set") ||
      setHint.length <= 4; // Short abbreviations like "swsh", "sm", "xy"

    if (isLikelySet) {
      return {
        type: "set-number",
        setHint,
        cardNumber: cardNum,
        nameQuery: setHint,
        originalQuery: query,
      };
    }
  }

  // Pattern 3: Hash prefix anywhere "#4", "charizard #4"
  const hashMatch = lower.match(/#(\d{1,3})(?:\s|$)/);
  if (hashMatch) {
    const cardNum = hashMatch[1].replace(/^0+/, "") || "0";
    const remaining = lower.replace(/#\d{1,3}/, "").trim();
    return {
      type: "set-number",
      cardNumber: cardNum,
      setHint: remaining || undefined,
      nameQuery: remaining,
      originalQuery: query,
    };
  }

  // Default: Name-based fuzzy search
  return {
    type: "name",
    nameQuery: normalized,
    originalQuery: query,
  };
}

/**
 * Check if a set name matches a hint (case-insensitive, supports abbreviations)
 */
export function matchSetName(hint: string, actualSetName: string): boolean {
  const hintLower = hint.toLowerCase();
  const setLower = actualSetName.toLowerCase();

  // Direct substring match
  if (setLower.includes(hintLower)) return true;

  // Check abbreviation mapping
  const possibleSets = SET_ABBREVIATIONS[hintLower];
  if (possibleSets?.some((s) => setLower.includes(s))) return true;

  // Check if any abbreviation value contains the hint
  for (const aliases of Object.values(SET_ABBREVIATIONS)) {
    if (aliases.some((a) => a.includes(hintLower) && setLower.includes(a))) {
      return true;
    }
  }

  return false;
}

/**
 * Normalize a card number for comparison (remove leading zeros)
 */
export function normalizeCardNumber(num: string): string {
  // Extract just the number part before any slash
  const match = num.match(/^0*(\d+)/);
  return match ? match[1] : num;
}
