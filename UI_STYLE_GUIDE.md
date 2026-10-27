# DevHUD — UI Style Guide

A portable design system for **instrument-panel interfaces**: compact, state-driven, monospace-heavy UIs that feel like developer tools. Color is swappable; structure and feel are not.

---

## 1. Design Philosophy

**DevHUD aesthetic** — The UI borrows from developer tool conventions: compact panels, monospaced metadata, LED-style status indicators, and muted utility surfaces. The design prioritizes density and scanability over whitespace and decoration.

### Core Principles

1. **Utilitarian clarity** — Every element communicates state or enables action. No decorative chrome.
2. **Monospace-forward** — Labels, status text, buttons, and metadata use a monospace font to reinforce the tool identity. Sans-serif is reserved for body/prose text only.
3. **State-first hierarchy** — The most important thing on screen is always *what state something is in*. LED indicators, toggle buttons, and status text are the visual anchors.
4. **Flat surface layers** — Minimal shadow, no gradients on surfaces. Depth comes from border contrast and subtle background layering (3 surface tiers).
5. **Compact density** — Information-rich panels with tight spacing. Readability comes from typographic hierarchy, not generous whitespace.
6. **Theme parity** — Light and dark themes maintain identical contrast ratios, component sizing, and interaction patterns. Dark mode is not an afterthought.

---

## 2. Design Token Architecture

All visual properties are expressed as CSS custom properties so color can be swapped per project. Token categories:

### 2.1 Surface Tokens (3-tier system)

Every DevHUD UI has exactly three surface levels, creating depth through background alone:

| Token | Role | Characteristics |
|---|---|---|
| `--bg-canvas` | Page shell | Lightest (light) / Darkest (dark). The "air" around panels. |
| `--bg-panel` | Card surfaces | Slightly elevated from canvas. Primary content container. |
| `--bg-toolbar` | Structural bars | Toolbars, footers, tab bars. Sits between canvas and panel. |
| `--bg-input` | Recessed areas | Input fields, sunken controls, active toggle fills. Lower than panel. |

The rule: **canvas → toolbar/panel → input** reads as a depth stack without shadows.

### 2.2 Border Tokens

| Token | Role |
|---|---|
| `--border-default` | Resting state borders on all panels, buttons, dividers |
| `--border-focus` | Hover/focus elevation. Slightly more prominent than default. |

Border strategy is minimalist: `1px solid` everywhere. No double borders, no border combinations.

### 2.3 Text Hierarchy Tokens

| Token | Role | Usage |
|---|---|---|
| `--text-primary` | Readable content | Values, descriptions, main text |
| `--text-secondary` | Supporting info | Metadata, secondary values |
| `--text-muted` | Structural text | Labels, section headers, timestamps, disabled states |
| `--accent-primary` | Highlighted identifiers | Domain names, key data points |

The hierarchy is strict: **muted labels → secondary info → primary content → accent highlights**.

### 2.4 Semantic Accent Tokens

| Token | Meaning |
|---|---|
| `--accent-primary` | Primary interactive accent (buttons, active states, highlights) |
| `--accent-primary-hover` | Lighter variant for hover states |
| `--accent-primary-dark` | Darker variant for text/identifiers |
| `--accent-success` | Confirmation, active/enabled state |
| `--accent-danger` | Destructive actions, errors |
| `--accent-warning` | Caution states |

### 2.5 Status Tokens

| Token | Usage |
|---|---|
| `--status-active` | LED glow color when enabled/active |
| `--status-inactive` | LED dot when disabled/idle |

### 2.6 Structural Tokens

```css
--radius-sm: 4px;   /* buttons, inputs, indicators */
--radius-md: 6px;   /* panels, cards, dialogs */
--shadow-sm: subtle; /* panels, cards */
--shadow-md: medium; /* dialogs, overlays */
```

---

## 3. Typography

### 3.1 Font Stack Strategy

Two fonts, strict role separation:

| Role | Purpose | CSS Variable |
|---|---|---|
| **Monospace (Primary)** | Everything except prose paragraphs | `--font-mono` |
| **Sans-serif** | Dialog messages, body copy only | `--font-sans` |

The monospace font is the **identity font** — it sets the tone. Choose a distinctive monospace (JetBrains Mono, Fira Code, IBM Plex Mono, etc.). The sans-serif is purely functional and can be a system stack.

### 3.2 Typographic Scale

Three tiers, mapped to the text hierarchy tokens:

| Tier | Size | Weight | Transform | Tracking | Role |
|---|---|---|---|---|---|
| **Micro** | 10–11px | 600–700 | UPPERCASE | 0.05–0.1em | Labels, section headers, LED text |
| **Standard** | 12–13px | 500–600 | none or lowercase | 0–0.05em | Values, buttons, body text |
| **Meta** | 10–12px | 400–500 | none | none | Timestamps, sizes, secondary info |

**Key conventions:**
- Section titles (e.g. "TARGET STATUS", "SAVED SCRIPTS") are always: Mono, 11px, weight 700, uppercase, wide tracking
- Button labels are always: Mono, 12px, weight 500–600
- Tab labels are always: **lowercase** (unique exception — sets tabs apart from buttons)
- Only dialog messages use sans-serif

### 3.3 Text Color Mapping

The text hierarchy tokens map to content roles:

```
LABELS (muted)     → section headers, field labels, timestamps
SECONDARY          → metadata, supporting values
PRIMARY            → main values, readable content  
ACCENT (primary)   → highlighted identifiers (domain names, key data)
```

---

## 4. Layout & Spacing

### 4.1 Base-4 Spacing System

All spacing is multiples of 4px:

| Role | Value | Use |
|---|---|---|
| Tight | 4px | Icon gaps, inline spacing |
| Compact | 6px | Toolbar sections, icon-text gaps |
| Standard | 8px | Button content gaps, field gaps |
| Comfortable | 12px | List item gaps, grid gaps, internal panel spacing |
| Generous | 16px | Panel padding, section gaps |
| Spacious | 20px | Action panels, dialog padding |
| Empty | 32px | Empty state padding, visual breathing room |

### 4.2 Panel Structure Pattern

All content containers follow one pattern:

```
┌─────────────────────────────────────┐
│  background:  --bg-panel            │
│  border:      1px solid (default)   │
│  border-radius: --radius-md         │
│  box-shadow:  --shadow-sm           │
│  padding:     16px                  │
└─────────────────────────────────────┘
```

Section dividers within panels:
```
border-bottom: 1px solid (default)
padding-bottom: 12px; margin-bottom: 16px
```

### 4.3 2-Column Status Grid

Information is displayed in a 2-column grid:

```
display: grid
grid-template-columns: repeat(2, 1fr)
gap: 12px
```

Each cell: vertical stack — muted label (10px) above primary value (13px).

---

## 5. Component Archetypes

### 5.1 Toolbar

The universal navigation bar. Appears on all views except the landing/home.

```
height: 48px
border-bottom: 1px solid (default)
padding: 0 12px
layout: flex, space-between, align center
```

Three sections: left (navigation), center (status), right (actions).

### 5.2 Tool Button

Small, compact action buttons for toolbar contexts.

| Property | Value |
|---|---|
| Height | 32px |
| Min width | 32px |
| Padding | 0 10px |
| Border radius | --radius-sm |
| Font | Mono, 12px, weight 500 |
| Icon size | 16×16 |
| Gap (icon-text) | 6px |

**Variants:**
- **Default**: panel background, default border
- **Primary**: accent fill, white text (for the primary action, e.g. Save)
- **Primary saved**: success color on hover (transient confirmation)

**Interactions:**
- Hover: border elevates to focus, text brightens
- Active: `translateY(1px)` press effect
- Transition: `0.15s ease`

### 5.3 Action Button

Larger, more prominent buttons for the main content area.

| Property | Value |
|---|---|
| Height | 44px |
| Flex | 1 (max ~160px) |
| Border radius | --radius-sm |
| Font | Mono, 12px, weight 600, uppercase |
| Letter spacing | 0.05em |
| Icon size | 18×18 |

**Variants:**
- **Default**: input background, default border
- **Toggle active**: 2px border, accent-tinted background, accent-colored text

**Interactions:**
- Hover: `translateY(-1px)`, shadow appears, border elevates
- Active: `translateY(0)`

### 5.4 LED Status Indicator

The signature element. A glowing dot paired with uppercase status text.

| Property | Value |
|---|---|
| Layout | inline-flex, centered |
| Padding | 4px 8px |
| Border radius | --radius-sm |
| Text | Mono, 11px, weight 600, uppercase, tracking 0.05em |

**LED dot:**
- Size: 8×8px, border-radius 50%
- Inactive: flat fill with inset shadow for dimension
- Active: fill + multi-layer glow shadow (inset + 2 outer spread levels)
- Transition: `0.3s ease` (slower than other elements — state changes feel deliberate)

**State language:**
- Idle/inactive: muted dot + muted label (e.g. "NO SCRIPT", "PAUSED")
- Active: glowing dot + success-colored label (e.g. "ACTIVE")

### 5.5 Tabs

File-editor-style tab bar.

```
background: --bg-toolbar
border-bottom: 1px solid (default)
padding: 0 12px, gap: 2px
```

**Tab button:**
- Padding: 10px 20px
- Font: Mono, 12px, weight 500, **lowercase** (critical differentiator from buttons)
- Active indicator: 2px bottom border in accent color
- Margin: -1px bottom (overlaps container border)

**Active tab:** accent-colored text + accent bottom border + panel background
**Hover:** brightened text + semi-transparent highlight

### 5.6 Segmented Control (Sliding Knob)

A compact multi-option selector with an animated sliding highlight.

```
background: --bg-input
border: 1px solid (default)
border-radius: --radius-sm
padding: 2px, gap: 2px
```

**Knob:** slides behind options with `cubic-bezier(0.4, 0.0, 0.2, 1)` easing at `0.25s`. Position calculated as percentage of control width (e.g. 0%, 33%, 66% for 3 options).

**Option buttons:** icon-only, transparent background, muted color → accent color when active.

### 5.7 Progress/Meter Bar

Thin inline bar for quantitative indicators (storage usage, capacity, etc.).

```
display: flex, align center, gap 8px
border-top divider above
```

- Track: 4px height, input background, small border-radius
- Fill: accent color, animated width with `0.3s ease`

### 5.8 List Row

Reusable row pattern for data lists (script entries, log items, etc.).

```
display: flex, align center
padding: 10px 16px
border-bottom: 1px solid (default)
gap: 12px
```

Structure: `[info columns] → [status indicator] → [action buttons]`

- Info: flex column, label above value, text-overflow ellipsis
- Status: LED dot (6×6px, smaller than main) + status text
- Actions: compact icon buttons (28×28px)

**Row hover:** background shifts to input color.
**Row delete:** fade out + slide right before DOM removal.

### 5.9 Empty State

A dashed-border container communicating "nothing here yet."

```
border: 1px dashed (default)    ← dashed, not solid — signals absence
border-radius: --radius-md
padding: 32px 24px
text-align: center
```

- Icon: 48×48, muted color
- Text: Mono, 13px, secondary color

### 5.10 Confirmation Dialog

Modal overlay for destructive actions.

**Overlay:** full-cover, semi-transparent dark, centered flex container.
**Box:** max-width ~320px, panel background, md border-radius, md shadow, 20px padding.
**Buttons:** mono, small (11px), uppercase, tracking, 32px height. Cancel (input bg) + Confirm (danger fill, white text).

### 5.11 Version/Status Footer

A persistent bottom bar that anchors the layout.

```
margin-top: auto        ← sticks to bottom via flex
border: 1px solid (default)
border-radius: --radius-md
box-shadow: --shadow-sm
font: Mono, 11px, muted
layout: flex, space-between
```

Footer buttons: extra-compact (24px height, 10px font), transparent background, bordered.

---

## 6. Border Radius System

Minimal, consistent:

| Radius | Value | Usage |
|---|---|---|
| Small | 4px | Buttons, inputs, indicators, small controls |
| Medium | 6px | Panels, cards, dialogs, containers |
| Pill | 50% | LED dots only |
| Micro | 2–3px | Inner elements (progress fills, knob sub-elements) |

No large radius, no rounded cards. The aesthetic is sharp and engineered, not soft.

---

## 7. Motion & Interaction Language

### 7.1 Speed Hierarchy

| Speed | Duration | Use |
|---|---|---|
| Fast | 0.15s | Button hover/press, small state changes |
| Medium | 0.2s | View transitions, row animations |
| Deliberate | 0.25–0.3s | Knob slides, LED glow changes, progress bars |

All use `ease` except the segmented knob which uses `cubic-bezier(0.4, 0.0, 0.2, 1)` for a snappier feel.

### 7.2 Global Theme Transition

```css
* {
  transition: background-color 0.2s ease,
              border-color 0.2s ease,
              color 0.2s ease;
}
```

This ensures theme switching feels seamless across every element simultaneously.

### 7.3 Micro-interaction Patterns

| Pattern | Trigger | Effect |
|---|---|---|
| **Press** | Button active | `translateY(1px)` — physical depression |
| **Lift** | Button hover | `translateY(-1px)` + shadow — elevation |
| **Glow pulse** | State change | LED gains outer shadow layers |
| **Confirm flash** | Save action | Button text/color changes temporarily (1.5s) |
| **Slide-out** | List item delete | Fade + translateX → removal |
| **Fade in** | View switch | Opacity 0→1 on new view |

### 7.4 View Transitions

Views switch via CSS class toggle (`.active`) with a simple fadeIn:
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

No slide, no scale. Instant clarity about what's on screen.

---

## 8. Responsive Strategy

### 8.1 Detection-First Mobile

Mobile is detected via UA string and touch capability, applied as a body class **before first paint** to prevent layout flash. No media-query-only approach — class-based gives full control.

### 8.2 Mobile Override Principles

| Principle | Rule |
|---|---|
| **Full-width** | Fixed desktop width → `100vw` / `100dvw` |
| **Full-height** | Fixed max-height → `99vh` / `99dvh` |
| **Larger touch targets** | All interactive elements scale up (buttons +2px height, icons +2px) |
| **Column stacking** | Horizontal bars (storage, footer) stack vertically on narrow screens |
| **No-zoom inputs** | Code editors use 16px minimum font (prevents iOS auto-zoom) |
| **Explicit text selection** | `user-select: text` on editor content (overrides default touch behaviors) |

---

## 9. Interaction Patterns

### 9.1 View Navigation

Views are full-screen panels with toolbar-driven navigation:
- **Home/Landing** → no toolbar, status overview
- **Detail/Editor** → toolbar with back + primary action + secondary actions + status
- **List/Logs** → toolbar with back + clear/refresh
- **Management** → toolbar with back

### 9.2 Keyboard Shortcuts

| Pattern | Use |
|---|---|
| `Ctrl/Cmd + S` | Save (editor context) |
| `Ctrl/Cmd + R` | Reload/refresh (editor context) |

Shortcuts are desktop-only, disabled on mobile via detection.

### 9.3 State Communication

States are always communicated through **two channels simultaneously**:
1. LED dot (visual/at-a-glance)
2. Text label (explicit/readable)

Never rely on color alone. The LED dot shape + text label ensures accessibility even without color perception.

---

## 10. Scrollbar Treatment

Custom scrollbars on list/log views:
- Thin width (6–8px)
- Transparent track
- Muted thumb → accent on hover
- `scrollbar-width: thin` for Firefox, webkit pseudo-elements for Chrome/Safari

---

## 11. Accessibility Patterns

- Segmented controls use `role="radiogroup"` with `aria-label`
- Each option has `aria-pressed` toggled on selection
- Icon-only buttons use `aria-label`
- State is never communicated by color alone (LED + text)
- Mobile touch targets meet 44px minimum
- `prefers-color-scheme` drives system theme preference
- Theme is persisted in storage and applied before render

---

## 12. Applying DevHUD to a New Project

### Checklist

1. **Define 4 surface tokens** (canvas, panel, toolbar, input) — pick any palette, maintain the depth order
2. **Define 3 text tokens** (muted, secondary, primary) + accent
3. **Define 3 semantic accents** (primary, success, danger)
4. **Set structural tokens** (4px/6px radius, subtle shadows)
5. **Choose identity monospace font** — this defines the feel more than anything
6. **Implement the 3-tier text hierarchy** (micro labels → standard values → meta info)
7. **Use the base-4 spacing scale** throughout
8. **Apply component archetypes** (toolbar → tool buttons → action buttons → LED indicators → panels)
9. **Add motion hierarchy** (0.15s fast → 0.2s medium → 0.3s deliberate)
10. **Implement theme parity** (light + dark with identical structure)

### What to preserve regardless of color

- Monospace as the primary font for all non-prose UI text
- Uppercase micro labels with wide tracking
- 3-tier surface depth (canvas > panel > input)
- LED dot indicators for state (glow when active, flat when inactive)
- Compact density with base-4 spacing
- Minimal border radius (4px/6px max)
- Border-only depth (minimal shadows)
- Two-channel state communication (visual + text)
- 1px solid borders throughout
- Dashed borders for empty states
- Lowercase tab labels
- Press/lift micro-interactions on buttons
