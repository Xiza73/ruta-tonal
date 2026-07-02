---
name: refactoring-ui
description: >
  Actionable UI design principles (from Refactoring UI) plus how to implement them with
  Tailwind v4 design tokens and shadcn: hierarchy, spacing, color/OKLCH, typography, depth, borders, states.
  Trigger: When designing or improving a UI — visual hierarchy, spacing/color/typography systems, design tokens, or making something "look better".
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Making a UI "look designed" instead of default/bootstrappy
- Building a design-token system (color, spacing, type, elevation)
- Deciding hierarchy, spacing, color, or typography choices
- Implementing the above with Tailwind v4 + shadcn

Pairs with a Tailwind syntax skill — this one is about *design decisions*, not utility syntax.

## Principles (the decisions that make it look good)

### Hierarchy — not everything can stand out
- Define **primary / secondary / tertiary**. If everything is bold, nothing is.
- Use **font weight + color** for hierarchy, **not just size**. Two weights (normal + semibold) and 2–3 text colors go a long way.
- **De-emphasize instead of emphasize**: dim the secondary (lighter weight/color) rather than shouting the primary.
- **Labels are a last resort** — fold the label into the value when you can (`$99 / mo`, not `Price: $99`).

### Spacing — use a system, give it air
- Work off a **fixed scale** (4/8px steps). Never arbitrary numbers.
- **Start with too much whitespace, then remove.** Density ≠ clarity.
- Related things close, unrelated things far (proximity = grouping).

### Color — you need a real palette
- Define **~9 shades per hue** (50–900) up front; a single hex won't cut it.
- Use **OKLCH** — perceptually uniform lightness, better than HSL for building scales.
- **Never grey text on a colored background** — use a hue-matched, desaturated shade of that background instead.
- **Don't rely on hue alone** to convey meaning (accessibility) — pair with icon/text.

### Typography
- Body **line-height ~1.5**; headings tighter. Line-height is inversely proportional to size & line length.
- **Line length 45–75 characters** (`max-w-prose`).
- Limit to **1–2 font families**; **16px+** base to avoid mobile auto-zoom.
- Numbers in tables: right-align + `tabular-nums`.

### Depth & elevation
- Shadows are an **elevation system** — a consistent scale, not random blurs.
- **Two-layer shadows** (soft ambient + tighter direct) read as real depth.
- Create depth by **overlapping** and layering elements.

### Borders — use fewer
- Prefer **spacing, a subtle background shift, or a shadow** over a border line.
- When you need separation, a box-shadow or bg change is usually cleaner than a `1px` border.

### States — design defensively
- Design the **empty / loading / error** states, not just the happy path.
- Hover/active must **not shift layout** (use shadow/opacity, reserve space).
- Handle long text, missing images, huge/tiny numbers.
- **One primary CTA per view**; secondary actions visually subordinate.

## Implement with Tailwind v4 tokens

### Base primitives (`@theme`, OKLCH)

```css
@import "tailwindcss";

@theme {
  /* ~9 shades per hue → auto-generates bg-brand-500, text-brand-500, … */
  --color-brand-50:  oklch(97% 0.02 250);
  --color-brand-500: oklch(60% 0.16 250);
  --color-brand-900: oklch(30% 0.10 250);

  --font-display: "Inter", sans-serif;

  /* Elevation scale = the shadow system (two-layer) */
  --shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.06);
  --shadow-md: 0 4px 6px oklch(0% 0 0 / 0.07), 0 2px 4px oklch(0% 0 0 / 0.06);
  --shadow-lg: 0 10px 15px oklch(0% 0 0 / 0.08), 0 4px 6px oklch(0% 0 0 / 0.05);
}
```

### Semantic layer (shadcn v4 pattern)

Raw values on `:root`, mapped to utilities via `@theme inline`:

```css
:root {
  --background: oklch(100% 0 0);
  --foreground: oklch(15% 0 0);
  --primary:    var(--color-brand-500);
  --muted-foreground: oklch(55% 0 0); /* tertiary text — de-emphasized */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary:    var(--primary);
  --color-muted-foreground: var(--muted-foreground);
}
```

- Three layers: **base primitives → semantic tokens → component tokens**. Components reference semantic tokens, never raw hex.
- shadcn v4: components use **`data-slot`** (no `forwardRef`), the **`size-4`** utility (not `w-4 h-4`), and **`tw-animate-css`** (not `tailwindcss-animate`).

## Quick checklist

- [ ] Clear primary/secondary/tertiary hierarchy (weight + color, not size)
- [ ] Spacing from a fixed scale; generous whitespace
- [ ] Full color scale in OKLCH; no grey-on-color text
- [ ] Body line-height ~1.5; line length 45–75ch
- [ ] Consistent two-layer shadow/elevation scale
- [ ] Borders minimized; separation via spacing/shadow
- [ ] Empty/loading/error states designed; one primary CTA

## Resources

- Design tokens in Tailwind v4: https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026/
- shadcn + Tailwind v4: https://ui.shadcn.com/docs/tailwind-v4
- Refactoring UI (book): https://www.refactoringui.com/
