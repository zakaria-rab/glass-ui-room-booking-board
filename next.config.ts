import { withMicrofrontends } from "@vercel/microfrontends/next/config";
import type { NextConfig } from "next";

/**
 * A microfrontend in the Glass UI group.
 *
 * `withMicrofrontends` is what makes this app servable under the shell's
 * domain: it generates the `vc-ap-*` asset prefix so this app's `/_next/*`
 * URLs cannot collide with the shell's or with another app's. That replaced a
 * hand-written `assetPrefix` derived from VERCEL_URL — the same problem, solved
 * by the platform instead of by us.
 *
 * The build command matters as much as this file. In a polyrepo the
 * authoritative `microfrontends.json` lives in the default application, so this
 * app pulls it at build time: `vercel microfrontends pull && next build`. A
 * build that cannot find the config fails outright rather than degrading, which
 * is why it is in vercel.json rather than left to whoever sets the project up.
 *
 * Still no `basePath`: routing strips nothing, the shell forwards
 * `/apps/<slug>/*` and this app answers on those paths through the group.
 * Still no `X-Frame-Options` or `frame-ancestors` — the shell embeds this app.
 */
const nextConfig: NextConfig = {};

export default withMicrofrontends(nextConfig);
