# Dermaself Design System

> Last updated: March 2026
> Font: **Space Grotesk** (Google Fonts)
> Official brand color: **`#7547F2`**

---

## Brand Color

| Description | Hex | HSL |
|---|---|---|
| **Dermaself official violet** | `#7547F2` | `hsl(256, 87%, 55%)` |

All purples/violets in the application must use this color or a tint/shade derived from the primary scale defined below. No other purple is permitted outside this scale.

---

## Primary Scale (Violet)

Defined in `globals.css` as CSS custom properties, mapped in `tailwind.config.ts`.

| CSS Token | Tailwind Token | Approximate Hex | Usage |
|---|---|---|---|
| `--primary-50` | `primary-50` | `#F3F0FE` | Light backgrounds, `step-content-card` |
| `--primary-100` | `primary-100` | `#E6E0FD` | Selection shadows, skeleton |
| `--primary-200` | `primary-200` | `#CBBFFB` | Loading skeleton |
| `--primary-300` | `primary-300` | `#A892F9` | Hover border |
| `--primary-400` | `primary-400` | `#8860F5` | — |
| `--primary-500` / `--primary` | `primary-500` / `primary` | `#8860F5` | Default primary, ring, progress dots |
| `--primary-600` | `primary-600` | **`#7547F2`** | **Buttons, selection borders, active tab** |
| `--primary-700` | `primary-700` | `#5C2FD9` | Button hover |
| `--primary-800` | `primary-800` | `#2E1670` | — |
| `--primary-900` | `primary-900` | `#1A0C42` | — |
| `--primary-glow` | `primary.glow` | `#A484F7` | Gradients, glow effects |
| `--primary-foreground` | `primary.foreground` | `#FFFFFF` | Text on primary background |

---

## Semantic Tokens

| CSS Token | Tailwind Token | Value | Usage |
|---|---|---|---|
| `--background` | `background` | `#FFFFFF` | Page background |
| `--foreground` | `foreground` | `hsl(0 0% 20%)` = `#333333` | Primary text |
| `--card` | `card` | `#FFFFFF` | Card background |
| `--card-foreground` | `card.foreground` | `#333333` | Card text |
| `--muted` | `muted` | `hsl(0 0% 96%)` = `#F5F5F5` | Secondary backgrounds |
| `--muted-foreground` | `muted.foreground` | `hsl(0 0% 45%)` = `#737373` | Step counter text, captions |
| `--border` | `border` | `hsl(0 0% 90%)` = `#E5E5E5` | Borders |
| `--input` | `input` | `hsl(0 0% 90%)` = `#E5E5E5` | Input borders |
| `--ring` | `ring` | `hsl(256 87% 61%)` | Focus ring |
| `--destructive` | `destructive` | `hsl(0 84% 60%)` = `#F23030` | Errors, destructive actions |
| `--accent` | `accent` | `hsl(254 73% 78%)` = `#B3A0F0` | Light lilac, subtle accents and gradients |

---

## Status / Fit Colors

| CSS Token | Tailwind Token | Hex | Usage |
|---|---|---|---|
| `--violet-fit` | `violet-fit` | `#7547F2` | Brand violet shadows |
| `--emerald-fit` | `emerald-fit` | `hsl(144 100% 80%)` = `#66FFB3` | Positive indicators |
| `--lilac-fit` | `lilac-fit` | `hsl(254 73% 78%)` = `#B3A0F0` | Lilac accents |
| `--gray-fit` | `gray-fit` | `hsl(0 0% 45%)` = `#737373` | Neutral indicators |

### Fit Pills (`globals.css`)

| Class | Background | Text |
|---|---|---|
| `.fit-pill-excellent` | `#059669` (emerald-600) | `white` |
| `.fit-pill-good` | `#34D399` (emerald-400) | `#064E3B` |
| `.fit-pill-safe` | `#F5DE0A` (yellow) | `#431407` |

---

## Secondary and Tertiary Colors

| Token | Approx Hex | Usage |
|---|---|---|
| `--secondary` = `hsl(283 58% 70%)` | `#BC7DE3` | Defined, not used in main components |
| `--tertiary` = `hsl(139 100% 80%)` | `#99FFB8` | Gradients |
| `--pink` = `hsl(318 70% 94%)` | `#FAE6F4` | Background tint |
| `--sky` = `hsl(201 100% 90%)` | `#C2EFFF` | Background tint |
| `--surface-inverse` = `hsl(253 50% 12%)` | `#15102B` | Dark surface (modal chrome) |

---

## Neutrals (fixed scale, not from CSS vars)

Defined directly in `tailwind.config.ts` as the `neutral` palette.

| Token | Hex |
|---|---|
| `neutral-50` | `#FAFAFA` |
| `neutral-100` | `#F5F5F5` |
| `neutral-200` | `#E5E5E5` |
| `neutral-300` | `#D4D4D4` |
| `neutral-400` | `#A3A3A3` |
| `neutral-500` | `#737373` |
| `neutral-600` | `#525252` |
| `neutral-700` | `#404040` |
| `neutral-800` | `#262626` |
| `neutral-900` | `#171717` |

---

## Blue Accent Palette (accentPalette)

Sky blue scale defined in `tailwind.config.ts`, used for detail elements.

| Token | Hex |
|---|---|
| `accentPalette-50` | `#F0F9FF` |
| `accentPalette-500` | `#0EA5E9` |
| `accentPalette-900` | `#0C4A6E` |

---

## Shadows

All shadows use the brand violet `#7547F2` (`hsl(256 87% 55%)`) with reduced opacity.

| Tailwind Token | Value |
|---|---|
| `shadow-card` | `0 1px 3px 0 hsl(256 87% 55% / 0.1), 0 1px 2px -1px hsl(256 87% 55% / 0.1)` |
| `shadow-card-hover` | `0 10px 25px -3px hsl(256 87% 55% / 0.15), 0 4px 6px -2px hsl(256 87% 55% / 0.1)` |
| `shadow-bottom-v` | `0 -4px 20px -2px hsl(256 87% 55% / 0.1), 0 -1px 0 0 hsl(0 0% 90% / 0.5)` |

### CSS Shadow Variables (`--dermaself-shadow-*`)

| Variable | Usage |
|---|---|
| `--dermaself-shadow-sm` | Light shadows |
| `--dermaself-shadow-md` | Medium shadows |
| `--dermaself-shadow-lg` | Large shadows |
| `--dermaself-shadow-xl` | Extra large shadows |

---

## Gradients

| Name | Colors | Usage |
|---|---|---|
| `gradient-clean` | `hsl(253 75% 97%)` → `hsl(253 75% 94%)` → lilac | Clean backgrounds |
| `gradient-subtle` | white → `hsl(253 75% 97%)` → lilac 10% | Light backgrounds |
| `gradient-minimal` | white → `hsl(253 75% 97%)` → lilac 5% | Minimal backgrounds |
| `gradient-accent` | **`#7547F2`** → lilac → mint | Strong accent |
| `gradient-splash` | **`#7547F2`** → lilac → mint | Hero splash |
| `gradient-affirmation` | `#7547F2` 12% → lilac 8% | Subtle overlay |
| `gradient-card-subtle` | lilac 3% → mint 2% | Card background |

---

## Typography

| Element | Font | Weight | Size |
|---|---|---|---|
| Body | Space Grotesk | 400 | `1rem` (16px) |
| Step headings | Space Grotesk | 700 | `text-xl` (1.25rem) |
| Option labels | Space Grotesk | 600 | `text-sm` (0.875rem) |
| Secondary text | Space Grotesk | 400 | `text-xs` (0.75rem) |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `rounded-sm` | `calc(1rem - 4px)` = `0.75rem` | — |
| `rounded-md` | `calc(1rem - 2px)` = `0.875rem` | — |
| `rounded-lg` / `--radius` | `1rem` | Default cards, buttons |
| `rounded-2xl` | `1rem` (via Tailwind default) | Step option cards |
| `rounded-full` | `9999px` | Chips, progress dots, badges |

---

## Skin Analysis Colors

### SpideringChart — Radar Metrics

| Metric | Hex | Notes |
|---|---|---|
| Acne | `#FF6B6B` | Coral red |
| Dryness | `#4DABF7` | Sky blue |
| Wrinkles | `#FF922B` | Orange |
| Spots | `#9775FA` | Purple |
| Redness | `#FF6B9D` | Pink |
| Laxity | `#20C997` | Teal |
| Pores | `#7547F2` | **Brand violet** |
| User polygon | `#7547F2` / `rgba(117, 71, 242, 0.2)` | **Brand violet** |
| Benchmark polygon | `#22C55E` / `rgba(34, 197, 94, 0.1)` | Green-500 |

### SkinAnalysisImage — Detection Overlay

| Detected Class | Color |
|---|---|
| Post-Acne Spot | `#7547F2` (brand violet) |
| Comedones | `#000000` |
| Microcysts | `#45CDF8` |
| Post-Acne Scar | `#737373` |
| Mole | `#B0FDC9` |
| Papules | `#F845DC` |
| Pustules | `#FFF985` |
| Cistic / Cysts | `#FF7875` |
| Nodules | `#FF914D` |
| Spot | `#FF6B9D` |
| Redness overlay | `#FF4757` |
| Pores chip | `#00FF00` (green — BGR color from Cloud Run overlay) |
| Fallback | `#7547F2` (brand violet) |

### Detection Confidence (dynamic)

| Threshold | Tailwind Color |
|---|---|
| ≥ 0.7 | `text-green-600` |
| 0.4 – 0.69 | `text-yellow-600` |
| < 0.4 | `text-red-600` |

---

## Layout and Viewport

| Variable | Value | Usage |
|---|---|---|
| `--app-height` | `100dvh` | Fullscreen PWA height (Safari-safe) |
| `viewportFit` | `cover` | `layout.tsx` — viewport extends under notch |
| Modal outer | `fixed inset-0 z-50` | Fullscreen overlay |
| Modal max-width | `md:max-w-[540px]` | Centered container on desktop |

---

## Main UI Components

### Primary Button
```
bg-primary-600 text-white hover:bg-primary-700
shadow-lg rounded-lg py-3 px-8
disabled: bg-gray-300 text-gray-500
```

### Option Card (step)
```
border-2 rounded-2xl bg-white
selected:  border-primary-500 shadow-lg shadow-primary-100
hover:     border-primary-300
```

### Modal Header
```
sticky top-0 z-50
modal-header-bar (white bg, border-b)
safe-area-top (padding-top: env(safe-area-inset-top))
```

### step-content-card
```
background: hsl(256 87% 97% / 0.65)  ← primary-50 semi-transparent
backdrop-filter: blur(8px)
border-radius: 1rem
mt-auto mx-4 mb-4  ← anchored to bottom
```

### Footer Progress Bar
```
completed dots:   bg-primary-500
inactive dots:    bg-gray-300
```
