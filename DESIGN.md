# Cash IO Design System

## Direction

Cash IO uses a quiet, precise financial interface. The product remains neutral and practical,
with orange reserved for primary actions, selection, and focus. Green communicates income or
positive movement; red communicates expenses, destructive actions, or errors. Color never
carries meaning without a label, icon, or sign.

The interface should feel native on iOS and Android and intentionally adaptive on web. Mobile is
the primary composition, not a fixed-width preview that must be preserved at every viewport.

## Principles

- Financial state is visually dominant; navigation and chrome recede.
- Prefer tonal surface changes to borders and shadows.
- Use one clear primary action per screen.
- Keep dense financial lists scannable through alignment, spacing, and tabular numerals.
- Use platform-standard navigation, sheets, switches, gestures, and touch targets.
- Treat dark mode, localization, large text, keyboard use, and reduced motion as core states.

## Color

- `primary`: Cash IO orange, used for primary actions, focus, and active navigation.
- `primaryContainer`: low-emphasis orange selection and informational emphasis.
- `success`: income and positive state.
- `danger`: expenses, destructive actions, and errors.
- `warning`: states that need attention but are not errors.
- `surface`: primary content surface.
- `surfaceRaised`: controls and content that sit above the canvas.
- `surfaceMuted`: grouped content and secondary controls.
- `border`: separators and control outlines.

Do not introduce isolated product colors. Add a semantic role to `src/constants/theme.ts` when a
new meaning is genuinely required.

## Typography

Use the platform system sans for interface text and the platform monospace face only for code.
Amounts use tabular numerals. Roles are intentionally compact:

- `display`: exceptional financial total, 32/38, semibold.
- `title`: top-level screen title, 28/34, semibold.
- `heading`: section or card heading, 20/26, semibold.
- `body`: default content, 16/23, medium.
- `label`: control and metadata label, 14/19, semibold.
- `caption`: secondary metadata, 12/16, medium.

Avoid screen-level font-size overrides when an existing role matches the purpose.

## Shape And Spacing

- Use the 4-point spacing scale from `Spacing`.
- Controls use 10px corners; cards and panels use 16px corners; pills are fully rounded.
- Interactive targets are at least 44pt on iOS and 48dp on Android.
- Prefer grouped rows and separators over a stack of equal cards.
- Shadows are reserved for transient or floating elements; persistent surfaces use tonal depth.

## Navigation

- Compact dashboard widths use five labeled bottom destinations.
- Expanded widths may use a navigation rail or wider content composition.
- Drawer navigation remains available for global destinations outside the dashboard views.
- Preserve native Back behavior, iOS edge swipe, safe areas, and Android system navigation.

## Responsive Behavior

- Compact: single column with edge-to-edge mobile surfaces.
- Medium: wider readable content, adaptive sheets, and balanced gutters.
- Expanded: navigation rail or selective two-column dashboard layouts.
- Forms and reading-heavy panels retain a readable maximum width; data views may use more space.

## Interaction And States

Every reusable control supports default, pressed, focused, disabled, and loading states where
applicable. Screens account for loading, empty, error, success, offline, and denied-permission
states. Web focus rings use `focus`; native interactions use platform feedback without relying on
opacity alone.

Motion communicates navigation or state change and respects reduced-motion settings. Do not add
decorative entrance animation to routine financial tasks.
