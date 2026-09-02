# eTakhzeen — Design System & UI/UX Contract

**Status:** Living document. This is the single source of truth for every visual and interaction decision in this codebase.
**Audience:** Any developer or AI agent writing or touching UI code in this repository.
**Stack:** React + Tailwind CSS (utility classes only — no ad-hoc inline styles, no competing CSS frameworks).

---

## 0. How to use this file (read this first — non-negotiable)

This is not inspiration. It is a **contract**. Before writing or editing *any* component, form, page, or style:

1. **Read this entire file**, not just the section that seems relevant. Tokens interact (a button's color depends on the palette section; a form's spacing depends on the layout section).
2. **Search the codebase for existing implementations** of the same or a similar component before creating a new one. If a `Button`, `Input`, `Card`, or `Badge` primitive already exists, extend or reuse it — do not create a second version with different padding, radius, or color logic.
3. **Never introduce a new color, font, radius, shadow, spacing value, or breakpoint that isn't defined in Section 2.** If the design genuinely needs one, it must be added to this file first, with a rationale, in the same commit/PR that introduces it. A color literal (`#3B82F6`, `bg-blue-500`, arbitrary hex in `style={}`) appearing in a component that isn't traceable to a token in Section 2 is a bug, not a style choice.
4. **Do not silently restyle an existing component** to match your personal taste while building an unrelated feature. If you believe an existing pattern is wrong, flag it and update this document — don't fork the style quietly.
5. **When a section of the UI is not built yet**, design it using the tokens, patterns, and component rules in this file, not from scratch. This file already anticipates the product pages, cart, admin panel, and chatbot — use those specs even before the pages exist.
6. **Every component must work in both light and dark mode and at every breakpoint in Section 6** before it is considered done. "Looks fine on my desktop in light mode" is not a completion criterion.

If you are an AI agent: treat every instruction above as a hard constraint equivalent to a failing test, not a style preference you can weigh against convenience.

---

## 1. Brand foundations

**Product identity:** eTakhzeen is an inventory-and-storefront platform — "Takhzeen" (تخزين) means *storage/warehousing*. The design language should feel like a well-run, trustworthy warehouse-turned-storefront: precise, labeled, legible, and calm — never flashy, never generic SaaS-gradient, never a copy of a template marketplace.

**Design personality (the three words a developer should hold in mind):** *Structured. Legible. Warm-neutral.* Not playful, not corporate-cold, not maximalist.

**The signature element — "Shelf Tags":** Throughout the product, status, price, category, and stock information are presented as small rectangular "shelf tag" chips — a nod to warehouse labels. Slightly squared corners (never fully pill-shaped except where explicitly noted), a hairline border, and a tiny uppercase eyebrow label where relevant (e.g. `IN STOCK`, `SKU`, `QTY`). This single motif is what should make eTakhzeen recognizable at a glance — spend restraint everywhere else so this detail stands out.

**What to avoid, explicitly:**
- No cream/off-white background paired with a high-contrast serif display and a terracotta/clay accent — this is the generic AI-generated look, not this brand.
- No pure near-black + single neon accent "dashboard" look.
- No fully-rounded (`rounded-full`) buttons/cards everywhere — reserve full rounding for avatars, dots, and pills that explicitly call for it (see Section 2.4).
- No unexplained gradients. Gradients are not part of this system.
- No decorative numbered markers (`01 / 02 / 03`) unless the content is a genuine sequence (checkout steps, onboarding steps).

---

## 2. Design tokens

All tokens below map directly to a `tailwind.config.js` extension. Do not use Tailwind's default color palette (e.g. `blue-500`, `red-500`, `gray-100`) directly in components — always use the semantic names below (`brand-600`, `surface`, `danger-500`, etc.) so theme changes propagate from one place.

### 2.1 Color palette

Named hex values — implement as CSS custom properties, switched by a `dark` class on `<html>` (Tailwind's `darkMode: 'class'` strategy).

| Token | Light value | Dark value | Usage |
|---|---|---|---|
| `brand-50` … `brand-950` | scale below | scale below | Primary brand color — headers, primary buttons, links, focus rings |
| `accent-50` … `accent-950` | scale below | scale below | Amber accent — CTAs, price highlights, shelf-tag borders, badges |
| `surface` | `#FAFAF8` | `#111312` | Page background |
| `surface-raised` | `#FFFFFF` | `#181B1A` | Cards, modals, dropdowns, table rows |
| `surface-sunken` | `#F1F1EE` | `#0B0D0C` | Input backgrounds, code/mono blocks, disabled areas |
| `border-subtle` | `#E4E3DD` | `#2A2E2C` | Hairline dividers, card borders |
| `border-strong` | `#C9C7BD` | `#3E4340` | Input borders, active dividers |
| `text-primary` | `#171A18` | `#F2F3F0` | Headings, body copy |
| `text-secondary` | `#5B5F5A` | `#A7ACA7` | Captions, helper text, metadata |
| `text-disabled` | `#9B9C94` | `#5C625E` | Disabled labels |
| `success-500` | `#2E7D5B` | `#4FA97F` | In-stock, success toasts, confirmed orders |
| `danger-500` | `#C4453B` | `#E5695E` | Errors, out-of-stock, delete actions |
| `warning-500` | `#B87A1D` | `#E8A33D` | Low-stock, pending states |
| `info-500` | `#3B6E91` | `#6FA8CC` | Informational banners, neutral notices |

**Brand scale (deep teal-ink — trust, warehouse-ledger feel, deliberately not "SaaS blue"):**
`brand-50 #EAF2F1` · `brand-100 #CFE3E1` · `brand-300 #86B7B2` · `brand-500 #2F726C` · `brand-600 #235650` · `brand-700 #1B4340` · `brand-900 #0F3D3E` · `brand-950 #0A2726`

**Accent scale (warm amber — shelf-tag, CTA, price accent):**
`accent-50 #FDF3E2` · `accent-100 #FBE3B8` · `accent-300 #F1BE6E` · `accent-500 #E8A33D` · `accent-600 #C6821F` · `accent-700 #9C6417` · `accent-900 #5C3B0D`

Primary buttons and links use `brand-700`/`brand-600`. The accent color is reserved for: price emphasis, the "Add to Cart" button, shelf-tag borders, and badge backgrounds — never for large background fills, so it stays a highlight, not wallpaper.

### 2.2 Typography

| Role | Font | Fallback stack | Usage |
|---|---|---|---|
| Display | **Sora** (600/700) | `ui-sans-serif, system-ui, sans-serif` | Page/section headings (`h1`–`h3`), hero text, admin dashboard titles |
| Body | **Inter** (400/500/600) | `ui-sans-serif, system-ui, sans-serif` | Paragraphs, labels, buttons, nav, form fields |
| Data/Mono | **JetBrains Mono** (400/500) | `ui-monospace, SFMono-Regular, monospace` | SKUs, order IDs, prices in tables, admin data grids, quantities, timestamps |

Sora is used *only* for headings and hero moments — never for body copy or UI chrome, so it stays a deliberate accent rather than the default voice. Inter carries every interactive and body element for maximum legibility. JetBrains Mono is reserved for anything that is literally data (an ID, a price cell in a table, a stock count) — this is what gives the admin panel its "operations tool" precision instead of feeling like a marketing page.

**Type scale (Tailwind classes, mobile → desktop via `sm:`/`lg:` where noted):**

| Token | Class | Size/line-height | Weight | Font |
|---|---|---|---|---|
| `display-xl` | `text-4xl sm:text-5xl lg:text-6xl leading-tight` | — | 700 | Sora |
| `display-lg` | `text-3xl sm:text-4xl leading-tight` | — | 700 | Sora |
| `display-md` | `text-2xl sm:text-3xl leading-snug` | — | 600 | Sora |
| `heading-sm` | `text-xl leading-snug` | — | 600 | Sora |
| `body-lg` | `text-base leading-relaxed` | — | 400 | Inter |
| `body-md` | `text-sm leading-relaxed` | — | 400 | Inter |
| `caption` | `text-xs leading-normal tracking-wide` | — | 500 | Inter |
| `eyebrow` | `text-[11px] uppercase tracking-[0.12em]` | — | 600 | Inter |
| `data` | `text-sm tracking-tight` | — | 500 | JetBrains Mono |

### 2.3 Spacing & layout grid

- Base unit: Tailwind's default 4px scale — do not invent custom spacing values. Component internal padding steps in multiples of 4 (`p-2`, `p-3`, `p-4`, `p-6`, `p-8`).
- Page gutters: `px-4` mobile, `px-6` tablet, `px-8` desktop, `px-12` at `2xl` and above, capped by a `max-w-7xl mx-auto` content container on all marketing/storefront pages. Admin panel uses `max-w-none` inside its own shell (Section 5.9).
- Vertical rhythm between major page sections: `py-12` mobile, `py-20` desktop.
- Grid: product listings use CSS grid via Tailwind (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6`) — see Section 5.5.

### 2.4 Radius, borders, shadows

- `rounded-sm` (2px) — shelf tags, badges, table cells, chips. This small, deliberate radius (not sharp, not pill) is part of the brand signature — do not round these further.
- `rounded-md` (6px) — buttons, inputs, cards, modals. This is the default radius for almost everything.
- `rounded-full` — reserved *only* for avatars, single-character icon buttons, and status dots. Never use on cards, buttons with text, or containers.
- Borders: `border border-border-subtle` for resting containers, `border-border-strong` for inputs/focus states.
- Shadows: keep flat. `shadow-sm` for raised cards on hover only; `shadow-md` for modals/popovers/dropdowns. Never stack shadows beyond `shadow-md`. No colored/glow shadows.

### 2.5 Motion

- Durations: `duration-150` for hover/focus micro-interactions, `duration-300` for panel/modal enter-exit, `duration-500` reserved for the cart drawer slide-in only.
- Easing: `ease-out` for entrances, `ease-in` for exits.
- Respect `prefers-reduced-motion`: wrap non-essential transitions (hover scale, decorative motion) in `motion-safe:` variants; never gate critical state changes (like a form error appearing) behind motion classes.
- No auto-playing looping animation anywhere in the product. Motion is a response to a user action, never ambient decoration.

---

## 3. Dark / light mode implementation

- Strategy: Tailwind `darkMode: 'class'`. A single `dark` class toggled on `<html>`, persisted to `localStorage`, defaulting to the user's OS preference (`prefers-color-scheme`) on first visit.
- **Every** component must be authored with both a default (light) utility and a `dark:` variant using the semantic tokens in Section 2.1 — never hardcode a color that only makes sense in one mode.
- Images/icons that are pure black or white line art need a `dark:invert` or a swapped `dark:` source — check every icon asset for this before shipping a component.
- The shelf-tag border and price-accent color (`accent-500`) stay constant across modes; only backgrounds/surfaces/text invert. This is deliberate — the accent is the brand's fixed point.
- Provide a visible toggle in the Header (see 5.1) and in the Admin sidebar (see 5.9) — never bury dark mode in a settings-only page.

---

## 4. Global component rules (apply everywhere)

- **Buttons**
  - Primary: `bg-brand-700 text-white hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150`.
  - Secondary: `border border-border-strong text-text-primary hover:bg-surface-sunken rounded-md px-4 py-2 text-sm font-medium`.
  - Destructive: same shape as primary, `bg-danger-500 hover:bg-danger-500/90`.
  - Disabled state on any button: `opacity-50 cursor-not-allowed` — never remove the visual weight entirely, so users understand the action exists but is currently unavailable.
  - Every button needs a visible `focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2` — keyboard focus is not optional.
- **Inputs** (see also Section 5.2 for full form spec)
  - `bg-surface-sunken border border-border-strong rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500`.
  - Error state: `border-danger-500 focus:ring-danger-500`, with an inline message in `text-xs text-danger-500 mt-1`.
  - Live-validation "checking..." state: `text-xs text-text-secondary mt-1` with an inline spinner (not a layout-shifting one — reserve the line height so text doesn't jump).
- **Cards**: `bg-surface-raised border border-border-subtle rounded-md p-4 sm:p-6`. Hover-interactive cards (product cards, admin list rows) add `hover:shadow-sm hover:border-border-strong transition-all duration-150`.
- **Badges / shelf tags**: `inline-flex items-center gap-1 rounded-sm border border-accent-500/40 bg-accent-50 dark:bg-accent-900/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-300`. Stock/status variants swap the color token (`success-500`, `danger-500`, `warning-500`) but keep the exact same shape.
- **Empty and error states**: always three parts — a short direct statement of what's empty/wrong, one sentence of what to do next, and a single primary action button. Never a bare icon with no text. Copy is written in the interface's voice: factual, not apologetic ("No items in your cart yet" / "Add products to see them here" / "Browse products" button) — not "Oops! Looks like your cart is feeling a little lonely 😢".
- **Toasts/notifications**: top-right on desktop (`fixed top-4 right-4`), full-width sticky bottom on mobile. Auto-dismiss after 4s except errors, which require manual dismiss.

---

## 5. Page & component specifications

### 5.1 Header / Navigation

- Sticky top bar: `sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-border-subtle`.
- Desktop: logo (Sora, `display-md`) left, primary nav center/right (Home, Products, Categories, Contact), utility icons right (search, dark-mode toggle, cart with item-count shelf-tag badge, account/avatar).
- **Auth-aware rendering is mandatory** (per the earlier bug in this project): Login/Signup links render only when `status` is false; a single "My Profile" or "Admin Dashboard" link (branched on `labels.includes('admin')`) plus a Logout action render when `status` is true. Never show both states.
- Mobile (`< md`): logo + hamburger menu opening a `fixed inset-0` slide-over panel (`translate-x` transition, `duration-300 ease-out`), same auth-aware logic, full-width nav items stacked with `py-3` tap targets (minimum 44px touch height, non-negotiable).
- Cart icon badge uses the shelf-tag shape (Section 4) with item count, not a plain circle.

### 5.2 Forms (Login, Signup, Contact, Checkout)

- Single-column, `max-w-md mx-auto` on auth forms; `max-w-2xl` on longer forms (checkout, contact).
- Label above input, not placeholder-as-label. `text-sm font-medium text-text-primary mb-1`.
- Field vertical spacing: `space-y-4`.
- **Live validation pattern** (per the signup form already built in this codebase): validate `onChange`, show inline error immediately below the field, disable submit until `isValid` — this pattern is canonical for every form going forward, not just signup. Uniqueness checks (username/email/phone) must reuse the store's cached `allCols` lookup approach already implemented — never add a new per-keystroke network call pattern.
- Submit button full-width on mobile (`w-full sm:w-auto`), right-aligned on desktop within the form's content width.
- Auth redirect UX: when a signup attempt collides with an existing account, redirect to Login and prefill only the email field (never password) with a visible one-line notice above the form (`bg-info-500/10 border border-info-500/30 text-sm rounded-md p-3`) — this pattern is already implemented; keep new flows consistent with it.

### 5.3 Contact chatbot widget

- Docked bottom-right, `fixed bottom-4 right-4 z-50`.
- Closed state: circular launcher button, `rounded-full` (explicitly allowed exception per 2.4), `bg-brand-700 dark:bg-brand-500`, single icon, subtle `hover:scale-105 motion-safe:transition-transform`.
- Open state: panel `w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[70vh] rounded-md shadow-md border border-border-subtle bg-surface-raised flex flex-col`, sliding/fading in over `duration-300`.
- Header strip inside panel: `bg-brand-900 dark:bg-brand-950 text-white px-4 py-3 rounded-t-md` with title + close button.
- Message bubbles: user messages right-aligned `bg-brand-700 text-white rounded-md rounded-br-sm`, bot messages left-aligned `bg-surface-sunken text-text-primary rounded-md rounded-bl-sm` — the single-corner flattening (`rounded-br-sm` / `rounded-bl-sm`) is the chat-specific signature, consistent with the shelf-tag small-radius language.
- Input row pinned to bottom: `border-t border-border-subtle p-2 flex gap-2`, text input flush, send button icon-only square (`rounded-md`, not round).
- Mobile: panel expands to near-fullscreen (`inset-x-2 bottom-2 top-16 fixed` instead of the fixed 360px box) so typing doesn't fight the keyboard.

### 5.4 Product card

- `Card` base (Section 4) + fixed-aspect image (`aspect-square object-cover rounded-md mb-3`).
- Stock shelf-tag pinned top-left of the image (`absolute top-2 left-2`) using success/warning/danger token depending on stock state.
- Title: `body-lg font-medium line-clamp-2`. Category: `caption text-text-secondary`.
- Price: `data` token, `text-lg font-semibold text-accent-700 dark:text-accent-300` — this is the one place JetBrains Mono appears outside the admin panel, deliberately, so price always reads as precise data.
- "Add to cart" button: full-width at card bottom on mobile grid, icon+label secondary style; becomes a small icon-only button overlay on hover for desktop grids denser than 3 columns.

### 5.5 All-products / listing page

- Layout: left sidebar filters (`w-64`, collapsible to a drawer below `lg`) + main grid.
- Grid: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6` (matches Section 2.3).
- Toolbar above grid: result count (`caption`), sort dropdown, and a mobile-only "Filters" button that opens the sidebar as a bottom sheet (`fixed inset-x-0 bottom-0 rounded-t-md`).
- Pagination or infinite scroll: prefer a "Load more" button (`secondary` style, centered) over silent infinite scroll, so users always have a clear stopping point and the action is explicit, per the writing principles in Section 0.

### 5.6 Single product page

- Two-column on `lg+`: image gallery left (`sticky top-20` while scrolling description), details right; stacks single-column on mobile with gallery first.
- Details column order: category eyebrow → title (`display-md`) → price (`data`, large) → stock shelf-tag → short description → quantity stepper → Add to Cart (primary, full-width on mobile) → full description/specs in a tabbed or accordion section below the fold.
- Quantity stepper: `inline-flex border border-border-strong rounded-md overflow-hidden`, minus/plus buttons `px-3 py-2`, number field centered, no native number-input spinners (`appearance-none`).

### 5.7 Categories widget

- Horizontal scrollable row on mobile (`flex overflow-x-auto snap-x gap-3 pb-2`, hide scrollbar), grid on desktop (`grid grid-cols-3 lg:grid-cols-6 gap-4`).
- Each category: square/rounded image or icon tile (`rounded-md aspect-square`) with label below (`caption font-medium text-center`), not text-over-image overlays — keeps legibility identical in both modes without needing a gradient scrim.

### 5.8 Cart

- Desktop: slide-in drawer from the right (`fixed inset-y-0 right-0 w-full sm:w-96`, `duration-500` per Section 2.5 — the one place that longer duration is used), backdrop `bg-black/40 dark:bg-black/60`.
- Mobile: full-screen takeover instead of a narrow drawer.
- Line items: thumbnail + title + shelf-tag-style quantity stepper (compact variant, `text-xs`) + line total in `data` token + remove icon button.
- Sticky footer inside drawer: subtotal (`data`, `text-lg font-semibold`), a one-line note on shipping/tax if applicable (`caption`), and a full-width primary "Checkout" button.
- Empty cart follows the three-part empty-state rule (Section 4) exactly.

### 5.9 Admin panel

The admin panel is the one place the interface should feel less like a storefront and more like an operations console — still using the same tokens, but leaning harder on the `data` (mono) type role, denser spacing, and a persistent shell.

- **Shell**: fixed left sidebar (`w-60`, collapsible to icon-only `w-16` on `lg`, becomes a slide-over on mobile) in `bg-surface-raised border-r border-border-subtle`, containing nav sections (Dashboard, Users, Products, Orders, Categories) each as `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium` with an active-state `bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300`.
- **Top bar** inside the admin shell: breadcrumb-style page title (`heading-sm`), search, dark-mode toggle, admin avatar/menu.
- **Data tables** (users, orders, products): header row `bg-surface-sunken text-xs uppercase tracking-wide text-text-secondary`, body rows `border-b border-border-subtle hover:bg-surface-sunken/60`, all numeric/ID/date columns in the `data` token, text columns in `body-md`. Row density is tighter than storefront cards: `py-2.5 px-3` per cell, not `p-4`.
- **Role-gated data**: the admin panel is the only place a "get all users" view exists, per the `getProfile` branching logic already implemented in `user.js` — the UI must never assume it can call that endpoint from a non-admin context, and must always pass the current session's own `requesterLabels`/`requesterId`, never a hardcoded admin flag.
- **Metrics widgets** on the dashboard: `Card` grid (`grid grid-cols-2 lg:grid-cols-4 gap-4`), each card: `eyebrow` label, large `data`-token figure, small delta indicator using success/danger tokens with a `▲`/`▼` glyph (not colored-only — always paired with the glyph so the signal isn't color-dependent, for accessibility).
- **Forms inside admin** (editing a product, updating a user's labels) follow the exact same form spec as Section 5.2 — do not invent a denser or different admin-only form style. Density changes in tables and lists, not in input fields, so muscle memory transfers between storefront and admin.
- **Destructive actions** (delete product, revoke admin label, ban user) always require a confirmation modal (`shadow-md`, `max-w-sm`) with the destructive button styled per Section 4 and a clear one-sentence consequence statement, never a bare "Are you sure?".

---

## 6. Responsiveness

Breakpoints are Tailwind defaults — do not add custom ones:

| Breakpoint | Width | Primary use in this project |
|---|---|---|
| (default) | `< 640px` | Phones — single column everywhere, bottom-sheet patterns for filters/chat, full-screen cart |
| `sm:` | `≥ 640px` | Large phones/small tablets — 2-column product grid begins |
| `md:` | `≥ 768px` | Tablets — header nav switches from hamburger to inline links |
| `lg:` | `≥ 1024px` | Small laptops — sidebar filters and admin sidebar become permanently visible (not drawers), 4-column product grid |
| `xl:` / `2xl:` | `≥ 1280px` / `≥ 1536px` | Desktops — max-width containers engage, extra gutter (`2xl:px-12`) |

Rules that apply regardless of component:
- Design and build mobile-first: base classes target the smallest screen, `sm:`/`md:`/`lg:` layer up.
- No horizontal scroll on any page at any width except explicitly-designed carousels/category rows (Section 5.7), which must use `snap-x` and hide the scrollbar rather than showing a raw overflow bar.
- Every tap target (buttons, nav items, form controls, table row actions) is at least 44×44px on touch breakpoints, even if that means more vertical padding than the desktop equivalent.
- Sticky/fixed elements (header, chatbot launcher, cart drawer) must account for mobile safe-area insets (`pb-[env(safe-area-inset-bottom)]` where relevant) so they never sit under a phone's home indicator.

---

## 7. Accessibility (part of "done," not a separate pass)

- Color is never the only signal — pair every success/danger/warning state with an icon, glyph, or text label (see admin metrics rule in 5.9).
- All interactive elements have visible `focus-visible` states (Section 4) — never `outline-none` without a replacement ring.
- Form errors are announced via `aria-describedby` linking the input to its error message, and the error text itself uses `role="alert"` when it appears asynchronously (submit failures, async uniqueness checks).
- Modals and drawers (cart, chatbot, mobile nav, confirmation dialogs) trap focus while open and return focus to the triggering element on close.
- All images have meaningful `alt` text; purely decorative icons use `aria-hidden="true"`.
- Minimum body text contrast: 4.5:1 in both light and dark mode — verify any new color pairing against the tokens in Section 2.1 before shipping, especially `text-secondary` on `surface-sunken`.

---

## 8. Change process

Any change to a token in Section 2, or any new component pattern not covered in Section 5, must be:

1. Added to this file in the same change set as the code that introduces it.
2. Justified in one sentence against the brand personality in Section 1 (does it stay "structured, legible, warm-neutral," and does it respect the shelf-tag signature?).
3. Checked against existing usages — if it changes an existing token's value, every component using that token is affected; audit the app for unintended visual regressions before merging, not after.

If you are unsure whether something is a new pattern or fits an existing spec above, default to reusing the closest existing pattern and note the ambiguity in your PR description rather than deciding unilaterally.