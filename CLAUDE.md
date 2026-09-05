# CLAUDE.md

## Purpose

`glass-ui-app1` is a **standalone Glass UI app**. Glass UI is Overjet's internal
apps portal: the shell (`overjetdental/glass-ui-framework`) owns the left nav,
the prompt UI and the marketplace, and each `glass-ui-<name>` repo is its own
GitHub repo with its own Vercel project, deployments and PR previews.

The shell **embeds this app in an iframe** pointed at this app's own production
URL (held in the shell's app registry, overridable per-environment with an env
var such as `NEXT_PUBLIC_APP1_URL`). This app therefore has to stand on its own:
it must look and behave correctly opened directly at its Vercel URL, and render
identically inside the shell's center pane.

This repo is also the **template** other Glass UI apps are created from.

## Rules

- **Works standalone and in an iframe.** Every change must be correct at this
  app's own URL *and* when embedded by the shell.
- **No `basePath`.** The shell rewrites `/apps/<slug>/*` to this app's
  deployment and *strips* the prefix, so the app is served at `/` on its own
  origin and a base path would 404 every route. `assetPrefix` is the exception
  and is required: the HTML arrives from the shell's origin, where a
  root-relative `/_next/...` resolves against the shell and every asset 404s.
  See the comment in `next.config.ts`.
- **No Vercel Microfrontends.** Do not add `@vercel/microfrontends` and do not
  add `rewrites()`. Composition is a plain iframe by URL; that keeps per-PR
  previews without per-project routing fees. Multi-Zones is a possible future
  migration only if same-origin paths are actually needed — not preemptively.
- **Stay embeddable.** Never send `X-Frame-Options` and never add a
  `frame-ancestors` CSP. If a CSP is ever added, it must allow the shell origin.
- **Data goes through GraphQL.** This app owns its own boundary at
  `/api/graphql` (graphql-yoga): SDL in `src/graphql/schema.ts`, resolvers in
  `src/graphql/resolvers.ts`. Components call `gql()` from
  `src/lib/graphql-client.ts` and nothing else — it executes in-process on the
  server and POSTs from the browser, so callers cannot tell which. No REST, no
  direct `fetch` to other services, no hardcoded data in components.
- **The GraphQL tier relays; it never owns the data.** Resolvers depend on the
  `PatientsSource` interface in `src/server/patients-source.ts`, never on a
  file. Today the only implementation reads `src/server/patients.json`, which is
  what proves end-to-end connectivity; tomorrow an internal service is a second
  implementation selected on `PATIENTS_SERVICE_URL`, and nothing above the
  interface changes. **A new field means a method on the source plus a resolver
  that calls it — never a JSON import inside `src/graphql/`.** That one rule is
  what keeps the seam from eroding. Every method is async even though the
  current one is synchronous, so adding an HTTP source later does not change a
  single caller.
- **"A Node.js server" is this app's route handler, not a second deployment.**
  The GraphQL tier already runs on Node inside this project. Do not stand up a
  separate service for it: that is another Vercel project against a limit Gopi
  raised himself, and the source interface is what makes it a later choice
  rather than a rewrite.
- **Why a hand-rolled `gql()` and not a GraphQL client library.** It is the same
  one the shell uses, so the template and the portal teach one pattern — and
  that is the consistency worth having for something ten apps are stamped from.
  There was no convention to inherit: the org has no single GraphQL client
  (`@apollo/client` in insurance-analytics-frontend and its demo fork,
  `graphql-request` in pnm_platform and devops-triage, hand-rolled in the
  shell). Relay was investigated and rejected — its value is fragments,
  normalisation and colocation, this schema has no Node interface, global IDs or
  connections, and a compiler step is a poor fit for a template that agents
  generate code into. Revisit only with a reason; don't re-derive this.
- **Mutable state is in memory, seeded from JSON, never written back — and
  that is a property of one implementation, not of the data layer.** It lives in
  `StaticPatientsSource`; replace that file, not the resolvers. Vercel
  function filesystems are read-only outside `/tmp`, so writing to
  `src/graphql/mocks/` works locally and 500s on every mutation in production
  while reads keep succeeding — the app looks healthy. Pin such state to a
  `globalThis` key, not module scope: Next builds the route handler and the page
  as separate server module graphs, so a module-scope `const` is evaluated once
  per graph and you get two independent stores. Pin *every* piece of state the
  graphs must agree on, not just the list.
- **That store is a demo shortcut, not a foundation — replace it before an app
  keeps anything real.** Writes live only in the instance that received them, so
  they vanish on deploy, on scale-out and when the instance goes idle, and two
  people using the app at once can see different lists. That is acceptable for a
  schedule of invented patients whose whole job is to show what a Glass UI app
  looks like. It is not acceptable for anything a user would expect to still be
  there. And it is not the reason the data here is fake: patient records are PHI
  and must not go into this repo, its mock JSON, or any deployment of it, whether
  the store is memory or Postgres.
- **Pages that query on the server call `await connection()` first,** so data is
  read at request time instead of frozen into the build. Not
  `export const dynamic`, which is segment config and rules out partial
  prerendering for every app stamped from this template.
- **Self-contained styling.** Minimal CSS variables in `src/app/globals.css`,
  Inter via `next/font/google`. The shell owns the brand; `--oj-accent` is a
  placeholder to be replaced with a real Overjet design-system token.
- **No new dependencies** beyond what is already here — the GraphQL boundary
  (`graphql`, `graphql-yoga`, pinned to the same majors as the shell), flags
  (`@flagsmith/flagsmith`) and analytics (`@vercel/analytics`) — and no UI
  libraries (no Tailwind, shadcn, MUI, Ant).

## Commands

| Command       | What it does                                  |
| ------------- | --------------------------------------------- |
| `pnpm install`| Install dependencies                          |
| `pnpm dev`    | Dev server on http://localhost:3001           |
| `pnpm build`  | Production build                              |
| `pnpm lint`   | ESLint (`eslint-config-next`)                 |
| `pnpm test`   | Store and validation checks (`node:test`)     |

Run `pnpm lint`, `pnpm test` and `pnpm build` before opening a PR, and attach a screenshot of
any changed page.

## Brand

`src/design/tokens.css` is the Overjet Design System, copied verbatim. **Do not edit token
values** — re-copy them from source. `src/app/globals.css` is the base layer and is identical to
the shell's on purpose: this app renders inside the portal and standalone, and it must look the
same in both.

Read `docs/design.md` before writing UI. The rules that are not expressible as tokens live
there, and each one is something that has already been got wrong: the canvas is warm off-white
never white, cards never carry a border, violet `--brand` is the only brand primary, sentence
case everywhere, tabular numerals wherever numbers align, verb-first button labels, and errors
that say what failed and how to fix it.

No other UI library. No Tailwind, no shadcn, no MUI, no Ant Design. Plain CSS Modules and CSS
variables — the rule is replace, don't blend, because a blended palette is harder to fix later
than to avoid now.

Every colour, spacing, radius, shadow and transition references a token. A literal in a
stylesheet is a bug.

## Microfrontends

This app is a child in the `glass-apps` Vercel Microfrontends group. The shell,
`glass-ui-framework`, is the default application and owns the authoritative
`microfrontends.json`.

Three things make that work, and none of them are optional:

- `withMicrofrontends(nextConfig)` in `next.config.ts`. It generates the
  `vc-ap-*` asset prefix so this app's `/_next/*` cannot collide with the
  shell's or another app's. This replaced a hand-written `assetPrefix` from
  `VERCEL_URL` — same problem, now solved by the platform.
- `"buildCommand": "vercel microfrontends pull && next build"` in `vercel.json`.
  In a polyrepo the config lives in the default app, and a build that cannot
  find it **fails outright** rather than degrading.
- A committed `microfrontends.json` declaring this app *and* the default app.
  It exists so `pnpm build` works in a fresh clone with no Vercel auth — which
  Open Inspect sandboxes need, since they run pnpm and not the Vercel CLI. On
  Vercel it is overwritten by the pull. Its `applications` key must match this
  app's Vercel project name, and its routing paths must match the slug, or the
  build fails with `Could not find microfrontends configuration`.

Do not add `basePath`. Routing forwards `/apps/<slug>/*` and this app answers on
those paths through the group.
