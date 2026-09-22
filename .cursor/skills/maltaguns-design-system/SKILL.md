---
name: maltaguns-design-system
description: MaltaGuns dark tactical design system — tokens, layout shells, primitives, and patterns for public routes. Use when building or restyling MaltaGuns UI, inner pages, marketplace, establishments, auth, legal pages, or when the user mentions design system, app-dark, chrome tokens, PageHeader, or tactical dark styling.
---

# MaltaGuns Design System

Canonical implementation reference. Pair with `maltaguns-domain` for business rules.

Human-readable mirror: [docs/design-system.md](../../docs/design-system.md)

Dev styleguide (local only): `/design-system`

## When to apply

- **Use:** all public routes (`/marketplace`, `/establishments`, `/events`, `/blog`, `/profile/**`, `/admin/**`, auth, legal, etc.)
- **Do not use:** `/profile/armory/print/**` (light for printing)

Public pages get `html.app-dark` via `ThemeProvider` — prefer shadcn semantic tokens (`bg-background`, `text-primary`) so portaled dialogs inherit dark theme.

## Token layers

| Role           | Chrome (source)              | shadcn under `.app-dark` | Tailwind usage          |
| -------------- | ---------------------------- | ------------------------ | ----------------------- |
| Page bg        | `--chrome-bg` `#0f1114`      | `--background`           | `bg-background`         |
| Card surface   | `--chrome-surface` `#1a1d21` | `--card`                 | `Card`, `AppCard`       |
| Primary text   | `--chrome-ink`               | `--foreground`           | `text-foreground`       |
| Secondary text | `--chrome-muted`             | `--muted-foreground`     | `text-muted-foreground` |
| Brand / CTA    | `--chrome-brand` `#cb0e0e`   | `--primary`              | `Button`, links         |
| Border         | `--chrome-border`            | `--border`               | `border-border`         |

Token file: [styles/design-tokens.css](../../styles/design-tokens.css)

Optional direct chrome access: `bg-chrome-bg`, `text-chrome-brand` (Tailwind `chrome.*` in config). Prefer shadcn tokens on public pages.

Homepage only: `.home` wrapper with `--home-*` aliases + marketing utilities (blueprint, hero-enter). See [app/page.tsx](../../app/page.tsx).

## Typography

- **Display:** Oswald via `app-display` class or `.app-dark h1/h2/h3`
- **Body:** IBM Plex Sans on `<body>` ([app/layout.tsx](../../app/layout.tsx))
- Page titles: uppercase, tracking-tight via `PageHeader`
- In-page sections: `AppSectionHeading`

## Layout recipes

### Standard inner page

```tsx
<PageLayout>
  <PageHeader
    backHref="/parent"
    title="Page Title"
    description="Optional subtitle"
    actions={<Button>Action</Button>}
  />
  {/* content */}
</PageLayout>
```

### Detail page with toolbar (back + edit)

```tsx
<PageLayout>
  <AppPageToolbar backHref="/list" actions={<EditButton ... />} />
  <PageHeader title={name} description={location} />
</PageLayout>
```

Never use absolute positioning on `BackButton` — always flow layout above or inside toolbar.

## Primitives

Import from `@/components/design-system`:

| Component           | Use for                                                         |
| ------------------- | --------------------------------------------------------------- |
| `AppCard`           | Listing/establishment cards — flat border, hover primary border |
| `AppSectionHeading` | "Listings", "Featured Listings" section titles                  |
| `AppPageToolbar`    | Back + right-side actions row on detail pages                   |
| `AppAlert`          | `pending`, `rejected`, `success` status banners                 |

Existing shells (do not duplicate):

- `PageLayout` — `max-w-7xl px-6`, min-height below header
- `PageHeader` — title, description, `backHref`, `actions`
- Home only: `HomeSectionShell`, `HomeSectionHeader`, `HomeListingCard`

## Patterns

**Cards:** `AppCard` or `className="app-card"`. `rounded-sm`, no `hover:shadow-lg`.

**Buttons:** Primary = `Button` default (brand red). Secondary = white fill + dark text (`variant="secondary"`). Tertiary = grey fill (`variant="tertiary"`). Outline/ghost for lower emphasis. Prefer `rounded-sm` on tactical surfaces.

**Alerts:** `AppAlert variant="pending|rejected|success"` — not light-mode `bg-amber-50`.

**Prose / legal:** `PageLayout` + `prose prose-sm text-foreground` — `.app-dark .prose` overrides apply automatically.

**Forms:** shadcn `Input`, `Select`, `Form` — inherit dark tokens under `.app-dark`.

## Anti-patterns

- `hover:shadow-lg`, heavy elevation on cards
- Hardcoded `text-gray-*`, `bg-green-600`, light-only alert colors
- Pill-shaped CTAs (`rounded-full` on primary actions)
- Absolute-positioned back buttons without a flex toolbar
- Changing global `:root` for dark mode (use `html.app-dark` instead)
- Applying dark styling to print routes

## File map

```
styles/design-tokens.css       # chrome, app-dark, home tokens
components/design-system/      # AppCard, AppSectionHeading, AppPageToolbar, AppAlert
components/ui/page-layout.tsx
components/ui/page-header.tsx
components/providers/ThemeProvider.tsx
app/design-system/page.tsx     # dev-only living reference
```
