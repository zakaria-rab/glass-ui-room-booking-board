# Open Inspect findings

Anything that blocked an agent session in this repo, and how it was worked around.

| Date | Prompt/Step | What happened | Workaround | Suggested fix |
| --- | --- | --- | --- | --- |
| 2026-09-02 | `pnpm build` while scaffolding the Hello World app | The Open Inspect sandbox exports `NODE_ENV=development` globally. `next build` warned "You are using a non-standard NODE_ENV value" and then failed prerendering `/_global-error` with `TypeError: Cannot read properties of null (reading 'useContext')` (React dev/prod mismatch). | Run `NODE_ENV=production pnpm build`. Vercel builds are unaffected — they set `NODE_ENV=production` themselves. | Have the Open Inspect sandbox leave `NODE_ENV` unset so tooling can pick the right value per command. |
