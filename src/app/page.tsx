import { connection } from "next/server";

import { PATIENTS } from "@/graphql/queries";
import { gql } from "@/lib/graphql-client";
import type { Patient } from "@/lib/types";

import { PatientsView } from "./patients-view";

/**
 * What to say when Vercel tells us nothing.
 *
 * Running locally, none of the VERCEL_* variables are set. On a deployment
 * created by uploading files rather than from a Git connection — which is how
 * the portal provisions an app — `VERCEL_ENV` is set but the `VERCEL_GIT_*`
 * variables are not. Reporting "local" in that case is simply wrong, so the two
 * cases get different words.
 */
const NOT_DEPLOYED = "local";
const NO_GIT_METADATA = "uploaded";

/** Which deployment you are looking at. Kept from the template's Hello World. */
function Deployment() {
  const deployed = Boolean(process.env.VERCEL_ENV);
  const unknown = deployed ? NO_GIT_METADATA : NOT_DEPLOYED;

  return (
    <footer className="deployment">
      <span className="deployment-label">deployment:</span>
      <span className="deployment-value" title="Vercel environment">
        {process.env.VERCEL_ENV || NOT_DEPLOYED}
      </span>
      <span className="deployment-sep">·</span>
      <span className="deployment-value" title="Git branch">
        {process.env.VERCEL_GIT_COMMIT_REF || unknown}
      </span>
      <span className="deployment-sep">·</span>
      <span className="deployment-value" title="Git commit">
        {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || unknown}
      </span>
    </footer>
  );
}

/**
 * The first list is fetched here, on the server, so the page arrives with data
 * rather than blank. `gql` executes against the schema in this process, so
 * there is no round trip and no origin to guess. Everything after this — the
 * mutations — happens in the client component over /api/graphql.
 */
export default async function Home() {
  /**
   * Read the patient list at request time instead of freezing it into the
   * build. `gql` on the server touches no request data, so without this Next
   * prerenders the page and serves the build-time seed for ever — a reload
   * after any change would show stale rows, with no error anywhere.
   *
   * `connection()` rather than `export const dynamic = "force-dynamic"`, to
   * match the shell: glass-ui-framework's CLAUDE.md requires every page that
   * queries on the server to call it first, and one idiom beats two.
   *
   * Called at the top of the page with no `<Suspense>` boundary, so this page
   * is as all-dynamic as force-dynamic would have made it. What `connection()`
   * preserves is the *option*: it is a runtime marker Next can isolate, where
   * segment config forecloses partial prerendering for the segment and its
   * children outright. Collecting that option means moving the query into a
   * component inside a boundary, with the chrome outside it — the shape in
   * Next's caching guide. Not worth restructuring a page this size to chase.
   */
  await connection();

  const { patients } = await gql<{ patients: Patient[] }>(PATIENTS);

  return <PatientsView initialPatients={patients} footer={<Deployment />} />;
}
