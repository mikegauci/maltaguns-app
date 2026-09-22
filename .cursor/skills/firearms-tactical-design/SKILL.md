---
name: firearms-tactical-design
description: Firearms and tactical web design system for dark-mode, industrial UI with sharp geometry, spec tables, compliance banners, and high-contrast product imagery. Use when designing or redesigning firearms marketplaces, tactical storefronts, listing detail pages, MaltaGuns UI, or when the user mentions tactical, firearms aesthetic, dark mode industrial, or spec callouts.
---

# Firearms & Tactical Web Design Skill

- **Aesthetic:** Dark-mode primary (charcoal, deep slate, tactical olive, or matte black backgrounds with high-contrast white/amber typography).
- **Typography:** Heavy industrial sans-serif headings (e.g., Barlow, Roboto Condensed, or Oswald) paired with ultra-clean body text.
- **Constraints:** NO soft pastel gradients, NO overly playful rounded pill buttons. Use sharp 1px borders, rigid geometric containers, and precise data tables for technical specs (caliber, barrel length, weight).
- **Compliance/UX Pattern:** Ensure clear age-verification or legal compliance banners are cleanly integrated into headers or footers without ruining the layout flow.
- **Imagery Strategy:** Optimize for high-contrast product hero shots with subtle technical blueprint overlays or specification callout tags.

## When to apply

Use this skill for firearms/tactical UI work in this repo. Pair with `maltaguns-domain` for business rules and existing shadcn/Radix patterns when the user wants to keep current data flows and components.

Default to **scoped tokens** (e.g. a page or section wrapper class) rather than changing global `:root` theme unless the user asks for site-wide dark mode.

## Token palette (starting point)

| Token                | Example   | Role                                  |
| -------------------- | --------- | ------------------------------------- |
| `--tactical-bg`      | `#0f1114` | Matte black / deep base               |
| `--tactical-surface` | `#1a1d21` | Cards, panels                         |
| `--tactical-slate`   | `#2a2f36` | Elevated surfaces, table stripes      |
| `--tactical-olive`   | `#3d4a3a` | Optional accent surface               |
| `--tactical-ink`     | `#f4f4f5` | Primary text                          |
| `--tactical-muted`   | `#a1a1aa` | Secondary text                        |
| `--tactical-amber`   | `#f59e0b` | Accent, CTAs, callout tags            |
| `--tactical-border`  | `#3f3f46` | 1px structural borders                |
| `--tactical-brand`   | `#cb0e0e` | MaltaGuns red where brand is required |

Typography load via `next/font/google`: **Barlow** or **Oswald** (600–700) for headings; **IBM Plex Sans** or system sans for body.

## Layout and components

- **Borders:** `border border-[var(--tactical-border)]` — prefer `rounded-sm` or `rounded-md` max; avoid large pill radii on primary actions.
- **Buttons:** Rectangular, medium radius. Primary = amber or brand red on dark; secondary = outline with 1px border, no soft shadows.
- **Cards:** Flat or minimal elevation; hierarchy via border + surface contrast, not generic `shadow-lg` on every block.
- **Spec tables:** Use semantic `<table>` or shadcn `Table` with tabular nums, fixed column labels (Caliber, Barrel length, Weight, Action, Finish). Left-align labels, right-align numeric values.
- **Hero / product imagery:** Full-bleed dark gradient overlay (`from-black/80`); optional SVG grid or blueprint line overlay at low opacity; spec callouts as small bordered tags positioned on the image (caliber, condition, license class).

## Compliance and legal UX

Integrate without breaking flow:

- **Header strip:** Thin full-width bar above nav — age gate, licensed-dealer notice, or jurisdiction disclaimer. Single line, small type, dismissible only when policy allows.
- **Footer block:** Repeat key legal links (terms, prohibited items, privacy) in the same visual weight as other footer columns.
- **Listing / checkout gates:** Inline banner before purchase or contact actions — not modal spam. State what is required (verified account, valid license) and link to the fix.

Reuse existing MaltaGuns patterns where present: `CookieBanner`, terms/privacy routes, identity verification flows in profile.

## Anti-patterns (reject on review)

- Pastel gradients, cream/terracotta “AI landing page” palettes
- Pill-shaped everything, playful micro-copy, exclamation-heavy CTAs
- Three identical feature cards in a row with soft shadows
- Specs buried in prose instead of scannable tables
- Compliance text as an afterthought modal or wall of legalese

## Implementation checklist

1. Define scoped CSS variables on a wrapper (`.tactical` or section-specific).
2. Set display + body fonts on that wrapper only unless migrating globally.
3. Build hero with high-contrast image, dark overlay, optional blueprint/callout layer.
4. Use rigid grids for listings; spec table on detail pages.
5. Place compliance banner in header or footer slot — test mobile wrap and keyboard focus.
6. Respect `prefers-reduced-motion`; keep motion functional (hover/focus), not decorative stagger on every block.

## MaltaGuns stack notes

- Tailwind 3 + shadcn/Radix — extend, do not replace, unless the user requests a full theme swap.
- Keep `--home-brand` / `#cb0e0e` for brand moments on tactical dark surfaces.
- Do not add tests or code comments unless the user asks (project rules).
