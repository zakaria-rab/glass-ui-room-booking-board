---
name: glass-ui
description: Rules for the Overjet Glass UI internal apps portal (glass-ui-framework shell and glass-ui-* apps). Use whenever working in a repo named glass-ui-* or when asked to build, register, or restyle an internal Overjet app on Vercel: enforces the GraphQL-only data boundary with mocked registries, Overjet design-system tokens only, the shell/app split, and the app registration checklist.
---

# Glass UI — how to work in glass-ui-* repos

Glass UI is Overjet's internal apps portal.

- `glass-ui-framework` is the **shell**: left nav, a prompt UI for describing a new app, a marketplace grid, and a center pane that displays a selected app.
- Every `glass-ui-<name>` repo is a **standalone app**: its own GitHub repo, its own Vercel project, its own deployments and PR previews. The shell displays it in the center pane via an iframe pointed at the URL held in the app registry.

Always read the repo's `CLAUDE.md` first. If `AGENTS.md` exists, follow it too. These rules apply on top.

## 1. Data boundary: GraphQL only

- All data the UI needs crosses the frontend/backend boundary through GraphQL at `/api/graphql` (a graphql-yoga route handler in the shell).
- To add data: 1) add types/fields in `src/graphql/schema.ts`, 2) implement in `src/graphql/resolvers.ts`, 3) back it with JSON in `src/graphql/mocks/`. Nothing else.
- Resolvers read ONLY from `src/graphql/mocks/`. That folder is the single swap point for the future real backend. Never hardcode data in components. Never call REST from UI code. Never call `fetch` directly; use the one helper in `src/lib/graphql-client.ts`.
- Marketplace discovery is three registries merged: `registry.team.json`, `registry.org.json`, `registry.public.json` (team wins, then org, then public, on slug collision). This mirrors the intended production model of one registry per scope.

## 2. Brand: Overjet design system only

**Scope.** This section applies to the **shell** repo (`glass-ui-framework`), which owns the brand.
An individual app repo (`glass-ui-*`) keeps its own styling minimal and self-contained so it renders
correctly both standalone and embedded, and it does **not** copy the design system in. If a task
brief for an app repo conflicts with this section, the brief wins; say so in the pull request.

In the shell, the visual spec lives at `docs/design/`: three approved mockup screens plus
`docs/design/styles.css`, whose token blocks are copied verbatim from the live Overjet Design
System (a claude.ai Design project). **Read those files before writing any UI.** Upstream
source: `https://claude.ai/design/p/7542d71d-ff17-4ce1-88b0-304e907bc8bb`.

- The design system ships as **one global stylesheet**, and so does this app. `docs/design/styles.css`
  is copied unchanged to `src/design/glass-ui.css` and imported once in the root layout.
  Components reuse its existing class names (`gu-*` for shell pieces, `oj-*` for type roles)
  rather than redefining styles. Do not split it into CSS Modules or rename its classes.
- Never inline a hex value, px value, shadow or transition in a component. If a screen needs
  something the stylesheet does not cover, append a rule to `src/design/glass-ui.css` built
  only from existing token variables.
- Token values are copied verbatim from the upstream design project. Do not adjust them. If a
  token is missing, add it with a comment citing the source.
- Do not add Tailwind, shadcn, MUI, Ant Design, or any other UI library. The rule is
  "replace, don't blend": a screen is 100% Overjet design system.
- When you change UI, verify it visually. The mockups are in this repo, so serve `docs/design/`
  on a spare port, run the dev server, and screenshot both at 1440 wide with the `agent-browser`
  skill. Fix the implementation to match the mockup, never the reverse.
- Font is Inter. Icons are Lucide (`lucide-react`), 2px stroke, `currentColor`, 16-18px.

### Non-negotiables (violating these reads as off-brand)

- Canvas is warm off-white `#F9F7F5` (`--canvas`). Never pure white, never flat gray.
- Cards float on two-layer shadow (`--sh-xs` … `--sh-xl`). **Never a border on a card.**
  Borders appear only on inputs (1.5px `--border-input`) and as table/list row separators.
- Violet `#5100FE` (`--v600`) is the only brand primary. Green, amber, red and blue are
  semantic only, never decorative.
- Frosted glass (`--surface-glass` + `backdrop-filter: blur(12px)`) only on the sidebar and
  topbar. The sidebar collapses to an icon rail at 1024px and hides at 640px.
- Sentence case everywhere. Tabular numerals in every data context. Negative letter-spacing
  on headings.
- Verb-first button labels that name the action and its object. **Never "Submit" or "OK".**
  Errors state what failed and how to fix it.
- AI-generated output carries the violet `✦` badge.
- 4px spacing grid. Motion is 200ms `cubic-bezier(0.16, 1, 0.3, 1)`, no bounces. Focus ring is
  always visible: `0 0 0 3px rgba(81,0,254,.20)`.

Note: the GitHub repo `overjetdental/overjet-design-system` is a **different, older** Ant
Design spike. Do not take component patterns from it.

## 3. Shell and apps: how they compose

We deliberately do **not** use the paid Vercel Microfrontends product. Each app is an ordinary, independently deployed Next.js app on Vercel, and the shell embeds it. This keeps per-PR previews (the actual goal) without per-project routing fees.

- **Apps are standalone.** An app must work correctly when opened directly at its own Vercel URL. Do not set `basePath`. Do not set `assetPrefix`. Do not add `@vercel/microfrontends`.
- **The shell embeds by URL.** The registry entry for each app carries a `url` (its Vercel production URL). `/marketplace/[slug]` renders an iframe pointed at that URL, inside the shell's persistent nav, so the shell never reloads when switching apps.
- **Environment overrides.** The shell reads an optional env var per app (e.g. `NEXT_PUBLIC_APP1_URL`) and prefers it over the registry `url`, so a preview of the shell can be pointed at a preview of an app.
- **Apps must be embeddable.** Do not send `X-Frame-Options: DENY` or a restrictive `frame-ancestors`. If a CSP is added later, it must allow the shell's origin.
- **Previews.** Every PR in an app repo gets its own Vercel preview URL automatically. That is the preview story: open the app's preview directly, or point the shell's env override at it to see it in context.
- **Deployment protection and the iframe.** Vercel projects here have Vercel Authentication on
  (`all_except_custom_domains`), and the protection page sends `X-Frame-Options: DENY`, so a plain
  iframe of a protected deployment renders a login screen instead of the app. Do not disable
  protection. Instead, append Vercel's documented bypass parameters to the iframe URL once:
  `?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=samesitenone`. That sets a
  `SameSite=None` cookie, after which ordinary iframe requests to that deployment return the app.
  The secret is the project's Protection Bypass for Automation secret, read from an environment
  variable, never committed. Verified working on 2026-09-02.
  Note the tradeoff: the secret appears in the shell's rendered HTML, so it is only acceptable
  because the shell itself is protected and the apps hold no sensitive data. The durable fix is
  same-origin proxying, where the shell attaches the bypass header server-side and the browser
  never sees it.
- If same-origin paths are ever needed (shared cookies, deep links under one domain), the migration is Next.js Multi-Zones `rewrites()` in the shell mapping `/apps/<name>/:path*` to the app's domain. Do not do this preemptively.

## 4. Registering a new app (the factory checklist)

1. Create the repo from the template: `gh repo create overjetdental/glass-ui-<name> --template overjetdental/glass-ui-app1 --private`.
2. Ask an org owner to add the new repo to the **Open-Inspect-Overjet** GitHub App installation (org members cannot do this).
3. Import the repo into Vercel as a project named `glass-ui-<name>`. Note its production URL.
4. In the shell, add an entry to the appropriate registry JSON: `slug`, `name`, `description`, `url`, `scope`, `owner`, `tags`, `repo`. Prefer `pnpm register-app` (`scripts/register-app.ts`), which does this idempotently.
5. Open a PR on the shell. Verify the marketplace card appears and the center pane renders the app.

## 5. Repo hygiene

- Keep `.openinspect/setup.sh` (install dependencies) and `.openinspect/start.sh` (start the dev server) working; Open Inspect runs them when a session starts.
- Run `pnpm lint` and `pnpm build` before opening a PR. Screenshot changed pages with the `agent-browser` skill and attach them to the PR.
- Log anything that blocked you as a row in `docs/open-inspect-findings.md` (Date | Prompt/Step | What happened | Workaround | Suggested fix).
- In the PR description, list every file created or changed and any deviation from the instructions you were given.
