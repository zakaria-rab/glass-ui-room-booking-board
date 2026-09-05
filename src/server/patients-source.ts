import type { Patient } from "@/lib/types";

import { StaticPatientsSource } from "./static-patients.ts";

/**
 * What the GraphQL tier needs from wherever patients actually live.
 *
 * The point of this file is the seam. This app's GraphQL layer relays to a
 * backend; it does not own data. Today the only backend is a JSON file, which
 * is what Gopi asked for to prove end-to-end connectivity, but the shape that
 * proves connectivity and the shape that can later point at an internal
 * service are not the same shape — and only one of them is a relay tier.
 * Resolvers that import JSON satisfy the demo and have to be rewritten; these
 * resolvers depend on this interface and swapping the implementation is one
 * file.
 *
 * Every method is async even though the only implementation is synchronous.
 * That is deliberate: an HTTP-backed source is unavoidably async, and if the
 * interface were sync today, adding one later would change every caller — the
 * rewrite this seam exists to prevent.
 *
 * THE SECOND IMPLEMENTATION IS NOT HERE ON PURPOSE. When an internal service
 * exists and the network allows reaching it — which is what the GKE sandboxes
 * are for — add `HttpPatientsSource` next to `StaticPatientsSource` and select
 * it in `patientsSource()` on `PATIENTS_SERVICE_URL` being set. Writing that
 * client now would put an unused HTTP layer into every app stamped from this
 * template, for a service that does not exist yet.
 */
export type NewPatientFields = Omit<Patient, "id">;

export type PatientChanges = Partial<NewPatientFields>;

export interface PatientsSource {
  list(): Promise<Patient[]>;
  get(id: string): Promise<Patient | null>;
  add(fields: NewPatientFields): Promise<Patient>;
  /** Null when no patient has that id, so the caller decides what to say. */
  change(id: string, changes: PatientChanges): Promise<Patient | null>;
  /** False when no patient has that id. */
  remove(id: string): Promise<boolean>;
}

/**
 * The one the app uses.
 *
 * A module-level instance is fine even though Next evaluates this module once
 * per server graph: `StaticPatientsSource` keeps no state of its own, and the
 * list it reads is pinned to the global object precisely so two instances see
 * one array.
 *
 * When a real service exists this becomes a branch on `PATIENTS_SERVICE_URL`
 * and nothing above it changes — not the resolvers, not the schema, not a
 * single component.
 */
const staticSource = new StaticPatientsSource();

export function patientsSource(): PatientsSource {
  return staticSource;
}
