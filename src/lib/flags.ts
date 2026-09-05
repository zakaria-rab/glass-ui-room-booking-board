import { cache } from "react";

import { createFlagsmithInstance } from "@flagsmith/flagsmith/isomorphic";
import type { IFlagsmith, IState } from "@flagsmith/flagsmith/types";

/**
 * Feature flags, read from Overjet's self-hosted Flagsmith.
 *
 * Stamped from the template, so every app gets flags on the day it is
 * provisioned rather than bolting them on later. Give each app its own
 * Flagsmith environment key; the flag names are the app's own.
 *
 * One SDK for both halves: this module reads flags during the render, and
 * `FlagsProvider` hands the same state to the browser so client components
 * read them through `useFlag` without a second round trip. The browser never
 * talks to Flagsmith itself, so no environment key reaches the bundle and a
 * user's own network position never decides whether this app has flags.
 *
 * Remote evaluation. Local evaluation would need
 * `/api/v1/environment-document/`, which is deliberately never exposed outside
 * our own clusters (CDP-3481) because a server-side key returns every flag and
 * segment rule for every clinic. So this asks `/api/v1/flags/` — the endpoint
 * CDP-3481 part 2 makes internet-reachable and key-gated — and `cache()`
 * collapses it to one call per request however many flags a page reads.
 *
 * Read `flagsStatus()` before believing a flag. See the note on it: until
 * CDP-3481 part 2 lands, deployed reads fail and every flag takes its
 * call-site fallback.
 */

const DEFAULT_API_URL = "https://flagsmith.nonprod.tools.overjet.ai/api/v1/";

/**
 * The SDK has no request timeout and retries internally: against an unroutable
 * address `init` took 10.5s to reject, which is 10.5s of blank page. A flag is
 * not worth waiting for, so the timeout lives in the `fetch` we hand it.
 */
const REQUEST_TIMEOUT_MS = 2000;

/**
 * - `live` — Flagsmith answered; flag values are real.
 * - `unconfigured` — no `FLAGSMITH_ENVIRONMENT_KEY`. Every flag is its fallback.
 * - `unreachable` — key set, Flagsmith did not answer. Every flag is its fallback.
 */
export type FlagsStatus = "live" | "unconfigured" | "unreachable";

export type ServerFlags = {
  /** Hydrates the browser SDK. Null unless the status is `live`. */
  state: IState | null;
  status: FlagsStatus;
};

const timeoutFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

/**
 * One `/api/v1/flags/` call per request, shared by every read in the render.
 *
 * A fresh instance per request, never the SDK's default export: that one is a
 * module-level singleton, and on a server it would leak one request's identity
 * and traits into the next.
 */
const load = cache(
  async (): Promise<{ flagsmith: IFlagsmith | null; status: FlagsStatus }> => {
    const environmentID = process.env.FLAGSMITH_ENVIRONMENT_KEY?.trim();
    if (!environmentID) {
      report("unconfigured");
      return { flagsmith: null, status: "unconfigured" };
    }

    const flagsmith = createFlagsmithInstance();
    try {
      await flagsmith.init({
        environmentID,
        api: process.env.FLAGSMITH_API_URL?.trim() || DEFAULT_API_URL,
        fetch: timeoutFetch,
        // Server-side: no localStorage to cache into, and a cache would
        // outlive the request it belongs to.
        cacheFlags: false,
        enableLogs: false,
      });
      return { flagsmith, status: "live" };
    } catch (error) {
      report("unreachable", error);
      return { flagsmith: null, status: "unreachable" };
    }
  },
);

/**
 * Whether `name` is enabled, or `fallback` if Flagsmith cannot say — an
 * unknown flag, a missing key, an unreachable API. State the safe value at
 * the call site and a Flagsmith outage is a no-op:
 *
 * ```ts
 * if (await getFlag("app1_new_layout", false)) { ... }
 * ```
 */
export async function getFlag(name: string, fallback = false): Promise<boolean> {
  const { flagsmith } = await load();
  return flagsmith?.hasFeature(name, { fallback }) ?? fallback;
}

/** Server state plus status, for `FlagsProvider` in the root layout. */
export async function getServerFlags(): Promise<ServerFlags> {
  const { flagsmith, status } = await load();
  return { state: flagsmith?.getState() ?? null, status };
}

/** Whether the flags in this render are real. */
export async function flagsStatus(): Promise<FlagsStatus> {
  return (await load()).status;
}

/**
 * Say so, loudly and once.
 *
 * A flag system that quietly serves fallbacks is worse than one that is
 * visibly unwired, because someone ships a flag-gated change believing the
 * flag is off.
 *
 * So: no key is a loud log, a broken key is a thrown error in development.
 * Absence of configuration is a legitimate state — a fresh clone and every
 * Open Inspect sandbox run `pnpm dev` without a Flagsmith key, and throwing
 * there would break the portal over a flag nobody is using yet. A key that is
 * set and does not work is always a mistake, and locally it is a mistake you
 * can fix, because Flagsmith *is* reachable from a Jamf-connected Mac.
 *
 * Deployed, both are an error log plus a `status` the UI can surface. Throwing
 * would take the portal down for a flag, and today it would take down every
 * deployment, since Vercel's egress is not on Flagsmith's Cloud Armor
 * allowlist until CDP-3481 part 2 lands.
 *
 * ponytail: console + status is the floor. If a flag ever gates something a
 * user could lose data over, this needs to reach a human — page it, or show
 * `status` in the shell chrome.
 */
function report(status: Exclude<FlagsStatus, "live">, error?: unknown): void {
  const detail =
    status === "unconfigured"
      ? "FLAGSMITH_ENVIRONMENT_KEY is not set"
      : `Flagsmith did not answer: ${error instanceof Error ? error.message : String(error)}`;
  const message =
    `[flagsmith] FLAGS ARE NOT LIVE (${status}): ${detail}. ` +
    "Every flag is reading its call-site fallback, so a flag-gated change is " +
    "NOT gated by Flagsmith right now. An HTML 403 means Cloud Armor blocked " +
    "the request (expected from Vercel until CDP-3481 part 2); a JSON 403 " +
    "means the environment key is wrong.";

  if (process.env.NODE_ENV === "development" && status === "unreachable") {
    throw new Error(message);
  }
  console.error(message);
}
