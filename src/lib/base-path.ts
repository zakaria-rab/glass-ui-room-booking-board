import microfrontends from "../../microfrontends.json" with { type: "json" };
import pkg from "../../package.json" with { type: "json" };

/**
 * The path this app is served under, read from the config that already decides
 * it.
 *
 * Vercel Microfrontends routes `/apps/<slug>/*` to this app's deployment and
 * **does not strip the matched prefix**, so the app serves those paths itself.
 * That is what `basePath` in next.config.ts is for.
 *
 * The catch: `basePath` teaches Next's routing and `<Link>` about the prefix
 * and does not touch `fetch`. A root-relative `fetch("/api/graphql")` is sent
 * exactly as written, which is not where the route handler lives — and the
 * group forwards any path this app has not claimed to the default application,
 * so the request lands on the *shell's* GraphQL endpoint and fails with
 * `Unknown type "NewPatient"` rather than a clean 404. Reads keep working the
 * whole time, because the server executes the schema in-process, so only
 * writes break. Anything built for the browser must go through `appPath()`.
 *
 * Looked up by this app's own package name, not by "the entry that isn't the
 * shell". `vercel microfrontends pull` replaces this file at build time with
 * the group's authoritative copy, which lists *every* app in the group — so
 * picking the first non-default entry would silently pick a sibling app and
 * prefix every request with its slug. The package name is the right key
 * because it is the key the platform itself matches on: `withMicrofrontends`
 * fails with "Could not find microfrontends configuration for application
 * <name>" when the two disagree.
 */

type Application = { routing?: { paths?: string[] }[] };

function readBasePath(): string {
  const applications = microfrontends.applications as Record<string, Application>;
  const application = applications[pkg.name];

  if (!application) {
    throw new Error(
      `microfrontends.json has no application named "${pkg.name}". It must match ` +
        "this app's Vercel project name, or the group cannot route to it.",
    );
  }

  // The bare path, not the `:path*` variant, which is a pattern rather than a prefix.
  const prefix = application.routing?.[0]?.paths?.[0];
  if (!prefix?.startsWith("/")) {
    throw new Error(
      `microfrontends.json gives "${pkg.name}" no routing path to serve. ` +
        'Expected routing[0].paths[0] to look like "/apps/<slug>".',
    );
  }

  return prefix;
}

export const BASE_PATH = readBasePath();

/** Prefix a root-relative path for use from the browser. */
export function appPath(path: `/${string}`): string {
  return `${BASE_PATH}${path}`;
}
