# glass-ui-app1

A standalone [Glass UI](https://github.com/overjetdental/glass-ui-framework) app —
Overjet's internal apps portal. It is an ordinary Next.js app (App Router,
TypeScript, pnpm) with its own Vercel project, its own production URL and its own
PR preview deployments.

The Glass UI **shell** (`overjetdental/glass-ui-framework`) does not build or bundle
this app. It embeds it in an iframe in its center pane, pointed at the URL stored in
the shell's app registry. That means:

- this app must work when opened directly at its own URL — no `basePath`, no
  `assetPrefix`, no `rewrites()`, no Vercel Microfrontends;
- it must stay embeddable — no `X-Frame-Options`, no `frame-ancestors` CSP.

The page at `/` renders "Hello World" plus a footer naming the deployment it is
served from (`VERCEL_ENV`, `VERCEL_GIT_COMMIT_REF`, short `VERCEL_GIT_COMMIT_SHA`,
each falling back to `local`), so a preview deployment is visibly different from
production.

## This repo is the template for future Glass UI apps

New apps are created from it:

```bash
gh repo create overjetdental/glass-ui-<name> --template overjetdental/glass-ui-app1 --private
```

Then the repo is imported into Vercel as `glass-ui-<name>` and registered with the
shell so it shows up in the marketplace. The full checklist lives in the shell repo:
[`glass-ui-framework/docs/adding-an-app.md`](https://github.com/overjetdental/glass-ui-framework/blob/main/docs/adding-an-app.md).

## Development

```bash
pnpm install
pnpm dev     # http://localhost:3001
pnpm lint
pnpm build
```

See [CLAUDE.md](./CLAUDE.md) for the rules this repo is held to.

## Why `vercel.json` declares the framework

A Vercel project created through the API or `vercel project add` has no framework preset — only a
dashboard import auto-detects one. Without it Vercel runs a static build, finds no `public`
directory, and fails *after* `next build` has already succeeded, so the error reads as if the app
is broken when only a project setting is missing.

Declaring it here rather than on the project matters because of *when*. Once a repository is
connected to its Vercel project, the first build fires on the first push, and there is no moment
in which provisioning could patch the setting first. A committed file is already in place.

Verified in `zakaria-rab/glass-ui-poc`: the same code failed without this file and built with it.

## Web Analytics

`<Analytics/>` from `@vercel/analytics` is in `src/app/layout.tsx` and reports to this app's own
Vercel project. Do not remove it when adapting this template: an app is deployed on its own and
also embedded in the Glass UI shell, and page views only attribute correctly if each app reports
for itself.

Nothing needs enabling in code. Web Analytics has to be switched on once per project in the
Vercel dashboard, under the project's Analytics tab.
