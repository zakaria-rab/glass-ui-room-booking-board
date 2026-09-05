import { GraphQLError } from "graphql";

import type { Patient, VisitStatus } from "@/lib/types";

/**
 * Relative, not `@/server/...`, and it has to stay that way. `pnpm test` runs
 * these modules under plain Node, which does not read the `@/*` path alias from
 * tsconfig — a value import through the alias fails to resolve at test time.
 * Type-only imports are fine because they are erased before Node sees them.
 */
import { type PatientChanges, patientsSource } from "../server/patients-source.ts";

/**
 * The GraphQL tier's half of patients: validate the input, ask the source, turn
 * a missing row into a message someone can act on.
 *
 * No JSON import here, and there must never be one. This tier relays to a
 * backend and does not own data — a new field means a method on
 * `PatientsSource` and a resolver that calls it, never a file read in
 * `src/graphql/`. That rule is what keeps the seam from eroding once apps are
 * stamped from this template.
 */

/**
 * A message meant for the person who caused it.
 *
 * graphql-yoga masks thrown errors as "Unexpected error." by default, which is
 * correct for bugs and wrong for validation: an error must say what failed and
 * how to fix it. A `GraphQLError` is treated as safe to surface, so anything a
 * user can trigger must be thrown this way.
 */
function userError(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

/**
 * The schema already guarantees types, required fields and enum membership, so
 * this only checks what SDL cannot express: that strings carry something once
 * trimmed, that a date is a date, and that a balance is not negative.
 */
function clean(input: Record<string, unknown>): PatientChanges {
  const out: PatientChanges = {};

  for (const key of ["name", "phone", "provider", "nextVisit"] as const) {
    const value = input[key];
    if (value === undefined || value === null) continue;
    const trimmed = String(value).trim();
    if (!trimmed) throw userError(`${key} is blank. Type a value for it.`);
    out[key] = trimmed;
  }

  if (out.nextVisit !== undefined) {
    const date = out.nextVisit;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw userError(`nextVisit is "${date}". Use a date in YYYY-MM-DD form.`);
    /**
     * Round-trip rather than trust the parse: `Date.parse("2026-02-31")` does
     * not fail, it rolls over to 2026-03-03. Comparing the parsed date back
     * against the input is what rejects a day the month does not have.
     */
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)
      throw userError(`nextVisit is "${date}", which is not a real date. Check the month and day.`);
  }

  if (input.status !== undefined && input.status !== null) out.status = input.status as VisitStatus;

  if (input.balance !== undefined && input.balance !== null) {
    const balance = Number(input.balance);
    if (!Number.isFinite(balance) || balance < 0)
      throw userError(`balance is ${input.balance}. Use 0 or a positive amount.`);
    out.balance = balance;
  }

  return out;
}

export function listPatients(): Promise<Patient[]> {
  return patientsSource().list();
}

export function findPatient(id: string): Promise<Patient | null> {
  return patientsSource().get(id);
}

export function addPatient(input: Record<string, unknown>): Promise<Patient> {
  const fields = clean(input);
  return patientsSource().add({
    name: fields.name!,
    phone: fields.phone!,
    provider: fields.provider!,
    nextVisit: fields.nextVisit!,
    status: fields.status ?? "SCHEDULED",
    balance: fields.balance ?? 0,
  });
}

export async function changePatient(
  id: string,
  changes: Record<string, unknown>,
): Promise<Patient> {
  const fields = clean(changes);
  if (Object.keys(fields).length === 0)
    throw userError("No changes were sent. Include at least one field to change.");

  const patient = await patientsSource().change(id, fields);
  if (!patient) throw userError(`No patient has id ${id}. Reload the list and try again.`);
  return patient;
}

export async function removePatient(id: string): Promise<string> {
  const removed = await patientsSource().remove(id);
  if (!removed) throw userError(`No patient has id ${id}. It may already have been removed.`);
  return id;
}
