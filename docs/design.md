# Design

This app is rendered inside the Glass UI portal **and** standalone at its own URL. It has to
look the same in both, and it has to look like the rest of Overjet. That is what this file is
for: the rules a token file cannot express.

## Where the design comes from

`src/design/tokens.css` is copied verbatim from the Overjet Design System, via the shell
repository's `docs/design/styles.css`. **Do not hand-edit token values.** Re-copy them from
source. If a token you need is missing, add it there with a comment citing the source — never
inline a literal in a component stylesheet.

`src/app/globals.css` is the base layer: a reset, the canvas, and the design system's type
roles. It is identical to the shell's base layer on purpose. Diverging here is how an app starts
looking almost-Overjet, which is worse than looking obviously unstyled.

## The rules that are easy to get wrong

These are not preferences. Each one is a thing that has been got wrong before.

- **The canvas is warm off-white `#F9F7F5`** — `var(--canvas)`. Never white, never grey. A white
  page is the single fastest way to look like it was not built here.
- **Cards float on shadow and never carry a border.** Borders appear only on inputs
  (`1.5px var(--border-input)`) and as row separators. A bordered card reads as a table cell.
- **Violet `#5100FE` — `var(--brand)` — is the only brand primary.** Green, amber, red and blue
  are semantic: success, warning, error, information. Do not use them decoratively, and do not
  introduce a second brand colour.
- **Sentence case everywhere.** Headings, buttons, labels, table headers. Not Title Case, not
  ALL CAPS except the `oj-label-caps` role.
- **Tabular numerals wherever numbers align** — `var(--nums-tabular)`, or the `oj-nums` class.
  A column of prices that shifts as digits change looks broken.
- **Verb-first button labels naming the action and its object.** "Add patient", not "Submit".
  The primary action says what it does.
- **Errors say what failed and how to fix it.** "Unexpected error" is forbidden — an error a
  person can cause must name the cause and the remedy.
- **4px spacing grid.** Use `--sp-*`. Motion is 200ms `var(--ease-out)`. The focus ring is
  always visible; never remove an outline without replacing it.
- **Every colour, spacing, radius, shadow and transition references a token.** A literal in a
  stylesheet is a bug, not a shortcut.

## No other UI library

No Tailwind, no shadcn, no MUI, no Ant Design, no icon pack beyond `lucide-react` (2px stroke,
`currentColor`, 16–18px). Plain CSS Modules and CSS variables.

The rule is **replace, don't blend**. A Tailwind default palette or a shadcn default radius
mixed into these tokens produces something that is neither, and it is far harder to fix later
than to avoid now.

## Type roles

Use the roles rather than setting sizes by hand: `oj-title`, `oj-section`, `oj-sub`,
`oj-secondary`, `oj-label-caps`, plus `oj-nums` and `oj-mono` as modifiers. They are defined in
`src/app/globals.css` and they are how two apps built by two people end up with the same
hierarchy.

## Staying embeddable

The portal renders this app in an iframe at `/apps/<slug>` on its own domain. So:

- no `X-Frame-Options: DENY` and no restrictive `frame-ancestors`,
- no `basePath` — see `next.config.ts` for why `assetPrefix` is set the way it is,
- nothing that assumes it is the top-level document: no `window.top` access, no full-page
  redirects away from the app.
