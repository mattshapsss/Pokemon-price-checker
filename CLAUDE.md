# Project Standards

## Design Philosophy
- **Retro aesthetic** - Pixelated, hard corners, NOT rounded corners
- **Pokemon-fitting** - Evokes Game Boy / classic Pokemon game vibes
- **NOT generic AI look** - No soft gradients, no glass morphism, no corporate tech feel
- **Bold and readable** - Price information must be instantly scannable

## Visual Rules
- Hard edges, no border-radius (or minimal like 2px max)
- Pixel-style fonts or bold sans-serif
- High contrast colors - think Pokemon Red/Blue era
- Grid-aligned layouts
- Subtle texture or pixel patterns okay

## UX Priorities
1. Speed over flash - results must appear instantly
2. Card images are the hero - largest element
3. Price is unmissable - bold, big, clear
4. One-handed mobile use - thumb-friendly zones
5. Auction context - user has 15-30 seconds to decide

## Code Standards
- TypeScript strict mode
- Server components where possible
- Client components only for interactivity
- Cache API responses aggressively
- No over-engineering - simple solutions preferred

## What to Avoid
- Rounded corners (too modern/soft)
- Glassmorphism or blur effects
- Generic shadcn default styling without customization
- Small text or cramped layouts
- Slow animations that block interaction
