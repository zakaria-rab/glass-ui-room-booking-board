// node --experimental-strip-types --test src/lib/base-path.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { BASE_PATH, appPath } from "./base-path.ts";

/**
 * The two copies of this app's prefix must agree.
 *
 * `next.config.ts` holds a literal because provisioning rewrites it with
 * `/basePath:\s*"[^"]*"/`, and a regex that does not match replaces nothing and
 * reports nothing. `BASE_PATH` is derived from microfrontends.json, which
 * provisioning rewrites by parsing. If they ever disagree the app serves a path
 * the group never sends it: 404 everywhere through the shell, while working
 * perfectly at its own URL. This is the check that makes that loud.
 */
test("next.config.ts basePath matches the routed path in microfrontends.json", () => {
  const config = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");
  const literal = /basePath:\s*"([^"]*)"/.exec(config);

  assert.ok(
    literal,
    'next.config.ts has no `basePath: "..."` literal. Provisioning rewrites that ' +
      "line with a regex and silently does nothing when it does not match, so it " +
      "must stay a literal string.",
  );
  assert.equal(
    literal[1],
    BASE_PATH,
    "next.config.ts and microfrontends.json disagree about where this app is served.",
  );
});

test("appPath prefixes browser paths", () => {
  assert.equal(appPath("/api/graphql"), `${BASE_PATH}/api/graphql`);
});
