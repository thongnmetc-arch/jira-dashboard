# JIRA Dashboard — Design System

## Color Tokens
(CSS variables defined in `src/index.css`)
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg-primary` | `#ffffff` | `#1e293b` | Main background |
| `--bg-secondary` | `#f8fafc` | `#1e293b` | Secondary surfaces |
| `--bg-tertiary` | `#f1f5f9` | `#334155` | Tertiary/muted |
| `--text-primary` | `#0f172a` | `#f1f5f9` | Primary text |
| `--text-secondary` | `#475569` | `#cbd5e1` | Secondary text |
| `--text-tertiary` | `#94a3b8` | `#94a3b8` | Muted text |
| `--accent` | `#3b82f6` | `#60a5fa` | Primary action color |
| `--success` | `#22c55e` | `#4ade80` | Success/positive |
| `--danger` | `#ef4444` | `#f87171` | Error/destructive |
| `--warning` | `#f59e0b` | `#fbbf24` | Warning/caution |
| `--border-primary` | `#e2e8f0` | `#334155` | Primary border |

## Layout Rules

### Card Component
- `card` class defined in index.css
- Padding: `p-5` for content cards, `p-3` for compact
- Border: `border border-[var(--border-primary)]`
- Radius: `rounded-xl` for content cards, `rounded-lg` for controls
- Background: `bg-[var(--bg-primary)]` (card) or `bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50`

### Scroll Areas
- Container MUST have `overflow-y-auto` + `min-h-0` for flex children
- Parent MUST have fixed height (`h-screen`, `h-[calc(100vh-Xrem)]`)
- DO NOT use `max-h-screen` — use `calc()` instead
- Custom scrollbar styles in index.css `.app-main::-webkit-scrollbar`

### Form Inputs
- All inputs use `input-like` class from index.css
- Height: `h-8` for inline filters, default for forms
- Focus: `focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]`

### Form Controls (Select, Combobox)
**Reference implementation:** `src/components/FilterBar.jsx` — this is the standard all selects should follow.

- Trigger button: `flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium border cursor-pointer`
- Active state (has value): `border-[var(--accent)] bg-[var(--accent-light)]`
- Default state (no value): `border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--accent)]/50`
- Popover dropdown: `absolute top-full left-0 mt-1 z-50 w-56 max-h-60 overflow-y-auto bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl py-1`
- Dropdown item: `w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-secondary)] cursor-pointer truncate`
- Selected item: `text-[var(--accent)] font-medium`
- Height: `h-8` (32px) for inline filters
- Border-radius: `rounded-lg` (8px) for trigger, `rounded-xl` (12px) for popover

### Border Radius
- `var(--radius-sm)`: 10px — inputs, selects, small buttons
- `var(--radius-md)`: 14px — cards (`.card` class)
- `var(--radius-lg)`: 18px — modals, large containers
- `rounded-full` — badges, avatars, toggle buttons
- `rounded-xl` — content cards (Tailwind: 12px)
- `rounded-lg` — control buttons, filter pills (Tailwind: 8px)

### Hover Effects
- Cards: `hover:shadow-md transition-shadow duration-200` (Shadow preferred over scale — prevents overflow)
- Buttons: `hover:opacity-90` or `hover:bg-[var(--accent-hover)]`
- DO NOT use `hover:scale` on grid children — causes overflow

### Panels (Drawer)
- Width: `380px` for simple, `480px` for complex
- Placement: right side, slide-in animation
- Overlay: `bg-black/40 backdrop-blur-sm`
- Use framer-motion `AnimatePresence` for enter/exit

### Responsive Breakpoints
- `sm:` 640px — 2 columns
- `md:` 768px — sidebar visible
- `lg:` 1024px — more columns

### Animation
- Entrance: `initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}`
- Duration: `0.3s` for content, `0.2s` for micro-interactions
- Spring for drawers: `type: 'spring', stiffness: 300, damping: 30`

## Accessibility
- All buttons: `cursor-pointer`
- Focus visible: `focus-visible:ring-2`
- Minimum touch target: `h-8 w-8` (32px)

## Changelog
- 2026-07-02: Added routing (react-router-dom), 8 dashboard tabs, removed HTML import, global Cancelled filter, dual Effort display, i18n EN/VN, wizard screens redesign
