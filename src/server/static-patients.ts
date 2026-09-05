import type { Patient } from "@/lib/types";

import type { NewPatientFields, PatientChanges, PatientsSource } from "./patients-source.ts";

import patientSeed from "./patients.json" with { type: "json" };

/**
 * Patients from a JSON file, with writes kept in memory.
 *
 * READ THIS BEFORE POINTING AN APP AT ANYTHING THAT MATTERS.
 *
 * A write lands in one instance and only that instance. It is gone on the next
 * deploy, gone when the instance goes idle, and invisible to anyone served by a
 * different one — so two people using the app at the same time can genuinely
 * see different lists. Nothing here reports that; the mutation returns 200 and
 * the row appears, which is exactly why it needs saying rather than
 * discovering.
 *
 * That is the right trade for a schedule of invented patients whose job is to
 * show what a Glass UI app looks like, and the wrong one for anything a user
 * expects to find again. The fix is to replace *this file* — not the resolvers,
 * which never learn how a patient is stored.
 *
 * The seed is never written back. Vercel function filesystems are read-only
 * outside `/tmp`, so writing here would work on a laptop and 500 on every
 * mutation in production while reads kept succeeding, leaving the app looking
 * healthy.
 *
 * A real store is also not what would make real patient data acceptable.
 * Patient records are PHI and do not belong in this repo, its JSON, or any
 * deployment of it, whether the store is memory or Postgres.
 */

/**
 * Pinned to the global object rather than module scope. Next builds the route
 * handler and the page as separate server module graphs, so a module-scope
 * `const` is evaluated once per graph and the app would end up with two
 * independent lists — a mutation over `/api/graphql` would be invisible to a
 * server render. Pin every piece of mutable state the graphs must agree on;
 * ids here come from `crypto.randomUUID()` precisely so there is no counter
 * that would also need pinning.
 */
const GLOBAL_KEY = "__glassUiApp1Patients";

type WithStore = typeof globalThis & { [GLOBAL_KEY]?: Patient[] };

const store = globalThis as WithStore;

store[GLOBAL_KEY] ??= (patientSeed as Patient[]).map((seed) => ({ ...seed }));

const patients: Patient[] = store[GLOBAL_KEY];

export class StaticPatientsSource implements PatientsSource {
  async list(): Promise<Patient[]> {
    return patients;
  }

  async get(id: string): Promise<Patient | null> {
    return patients.find((patient) => patient.id === id) ?? null;
  }

  async add(fields: NewPatientFields): Promise<Patient> {
    const patient: Patient = { id: crypto.randomUUID(), ...fields };
    patients.push(patient);
    return patient;
  }

  async change(id: string, changes: PatientChanges): Promise<Patient | null> {
    const patient = await this.get(id);
    if (!patient) return null;
    Object.assign(patient, changes);
    return patient;
  }

  async remove(id: string): Promise<boolean> {
    const at = patients.findIndex((patient) => patient.id === id);
    if (at === -1) return false;
    patients.splice(at, 1);
    return true;
  }
}
