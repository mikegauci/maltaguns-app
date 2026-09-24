# MaltaGuns Design System

Dark industrial UI for MaltaGuns public routes. This document mirrors the Cursor skill at `.cursor/skills/maltaguns-design-system/SKILL.md`.

**Local styleguide:** run the dev server and open `/design-system`.

## Theme scopes

| Route                                      | Theme                   | Mechanism                                |
| ------------------------------------------ | ----------------------- | ---------------------------------------- |
| Public pages + `/profile/**` + `/admin/**` | Dark tactical           | `html.app-dark` via `ThemeProvider`      |
| `/profile/armory/print/**`                 | Light (print)           | `app-dark` removed on pathname           |
| `/` homepage                               | Dark + marketing extras | `.home` wrapper coexists with `app-dark` |

## Colors

Chrome tokens in `styles/design-tokens.css` are the source of truth. On public pages, `.app-dark` remaps them into shadcn CSS variables so existing components darken automatically.

| Role            | Chrome    | Usage                           |
| --------------- | --------- | ------------------------------- |
| Page background | `#0f1114` | `bg-background`                 |
| Card / panel    | `#1a1d21` | `bg-card`, `AppCard`            |
| Primary text    | `#f4f4f5` | `text-foreground`               |
| Muted text      | `#a1a1aa` | `text-muted-foreground`         |
| Brand red       | `#cb0e0e` | `text-primary`, primary buttons |
| Border          | `#3f3f46` | `border-border`                 |

Tailwind also exposes `chrome.*` colors (e.g. `bg-chrome-brand`) for header/footer chrome that sits outside shadcn remapping.

## Typography

- **Oswald** — page titles and section headings (`app-display`, `PageHeader`)
- **IBM Plex Sans** — body copy (root layout)

Page titles are uppercase with tight tracking. Section headings inside a page use `AppSectionHeading`.

## Layout

**PageLayout** wraps inner content with consistent width (`max-w-7xl px-6`) and vertical spacing.

**PageHeader** provides the page title block. Pass `backHref` for navigation and `actions` for top-right CTAs (e.g. Create Listing).

**AppPageToolbar** is for detail pages that need back on the left and edit/actions on the right, separate from the title.

## Components

```tsx
import {
  AppAlert,
  AppCard,
  AppPageToolbar,
  AppSectionHeading,
} from '@/components/design-system'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
```

- **AppCard** — flat card with border hover; pass `featured` for primary border emphasis
- **AppSectionHeading** — in-page h2; optional `icon` slot
- **AppPageToolbar** — `backHref` + `actions`
- **AppAlert** — `pending`, `rejected`, `success` variants for status messaging

## Buttons

Use shadcn `Button` from `@/components/ui/button`:

| Variant       | Use for                                      |
| ------------- | -------------------------------------------- |
| `default`     | Primary CTA — brand red                      |
| `outline`     | Bordered neutral action on dark surfaces     |
| `secondary`   | White fill, dark text — high-contrast action |
| `tertiary`    | Grey fill — lower-emphasis filled action     |
| `destructive` | Irreversible or dangerous actions            |
| `ghost`       | Minimal toolbar / inline actions             |

Badge `variant="secondary"` stays grey — only the button secondary variant is white.

## Do

- Use shadcn semantic tokens on public pages
- Use `rounded-sm` and 1px borders
- Put back buttons in document flow (`PageHeader.backHref` or `AppPageToolbar`)
- Use `AppCard` for listing and establishment grids

## Don't

- Light-mode-only colors (`text-gray-700`, `bg-amber-50`)
- Heavy shadows (`hover:shadow-lg`)
- Absolute-positioned navigation without a toolbar wrapper
- Dark styling on print routes
