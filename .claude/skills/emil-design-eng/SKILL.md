---
name: emil-design-eng
description: Emil Kowalski's design engineering philosophy — animation decisions, easing, timing, component patterns, performance, accessibility, and review format. Use when building or reviewing any UI animation, motion, or component polish.
---

# Emil Kowalski's Design Engineering Philosophy

---

## Core Tenets

**Taste is trained.** Study great interfaces, reverse-engineer animations, and ask *why* something feels good. Good taste is a practiced instinct, not a personality trait.

**Invisible details compound.** As Paul Graham wrote: "All those unseen details combine to produce something that's just stunning." Users won't notice individual polish decisions — that's the goal.

**Beauty is leverage.** Functionality is table stakes. Motion, defaults, and feel differentiate products where everyone's software is "good enough."

---

## Animation Decision Framework

### 1. Should it animate at all?

| Frequency | Decision |
|---|---|
| 100+×/day (command palette) | No animation. Ever. |
| Tens of times/day (hover, list nav) | Remove or drastically reduce |
| Occasional (modals, drawers) | Standard animation |
| Rare/first-time (onboarding) | Can add delight |

**Never animate keyboard-initiated actions.** Raycast has zero open/close animation — optimal for something used hundreds of times daily.

### 2. What easing?

- **Entering/exiting** → `ease-out` (immediate feedback)
- **Moving on-screen** → `ease-in-out`
- **Hover/color** → `ease`
- **Constant motion** → `linear`

**Never use `ease-in` for UI.** It starts slow — precisely when the user is watching most closely.

Recommended custom curves:
```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

### 3. How fast?

| Element | Duration |
|---|---|
| Button press | 100–160ms |
| Tooltips / small popovers | 125–200ms |
| Dropdowns | 150–250ms |
| Modals / drawers | 200–500ms |

**Keep UI animations under 300ms.** Perceived performance matters as much as real performance.

---

## Key Component Patterns

### Buttons
```css
.button:active { transform: scale(0.97); }
```
Scale: 0.95–0.98. Instant feedback signals the UI is listening.

### Entry animations — never from `scale(0)`
```css
/* Bad */
.entering { transform: scale(0); }

/* Good */
.entering { transform: scale(0.95); opacity: 0; }
```
Nothing in the real world appears from nothing.

### Popovers — origin-aware scaling
```css
.popover { transform-origin: var(--transform-origin); }
```
Scale from the trigger. **Exception:** modals stay centered.

### Tooltips — skip delay on subsequent hovers
First tooltip: delayed appearance. Subsequent hovers: instant, no animation.

### Asymmetric enter/exit
```css
/* Release: fast */
.overlay { transition: clip-path 200ms ease-out; }

/* Press: deliberate */
.button:active .overlay { transition: clip-path 2s linear; }
```

### Stagger
```css
.item:nth-child(2) { animation-delay: 50ms; }
.item:nth-child(3) { animation-delay: 100ms; }
```
Keep delays 30–80ms. Never block interaction during stagger.

---

## `clip-path` for Animation

```css
.hidden  { clip-path: inset(0 100% 0 0); }  /* hidden right */
.visible { clip-path: inset(0 0 0 0); }      /* fully visible */
```

Use cases: tab color transitions, hold-to-delete, scroll reveals, comparison sliders.

---

## Performance Rules

| Rule | Detail |
|---|---|
| Animate only `transform` + `opacity` | Skips layout/paint; runs on GPU |
| Set `transform` directly on elements | CSS variables on parents trigger recalc on all children |
| CSS animations over JS under load | CSS runs off main thread |
| Framer Motion hardware acceleration | Use `transform: "translateX(100px)"` not shorthand `x: 100` |

---

## Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  /* Keep opacity/color transitions; remove movement */
}

@media (hover: hover) and (pointer: fine) {
  .element:hover { transform: scale(1.05); }
}
```

Reduced motion ≠ no motion. Gate hover animations — touch devices trigger hover on tap.

---

## Review Format

Always use a markdown table:

| Before | After | Why |
|---|---|---|
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Avoid `all`; specify exact properties |
| `scale(0)` entry | `scale(0.95)` + `opacity: 0` | Nothing appears from nothing |
| `ease-in` on dropdown | Custom `ease-out` curve | `ease-in` delays initial movement |
| No `:active` state | `scale(0.97)` on `:active` | Confirms the UI heard the user |
| `transform-origin: center` on popover | `var(--transform-origin)` | Scale from trigger, not center |

---

## The Sonner Principles

1. **DX first** — minimal setup friction drives adoption
2. **Good defaults beat options** — ship beautiful out of the box
3. **Handle edge cases invisibly** — pause timers on hidden tabs, fill hover gaps with pseudo-elements
4. **Transitions over keyframes** for dynamic UI — keyframes restart from zero; transitions retarget
5. **Cohesion** — motion personality should match the component's mood
6. **Review with fresh eyes** — imperfections invisible during dev appear clearly the next morning

---

*For deeper study: [animations.dev](https://animations.dev/) · [easing.dev](https://easing.dev/) · [easings.co](https://easings.co/)*
