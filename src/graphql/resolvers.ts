import {
  addPatient,
  changePatient,
  findPatient,
  listPatients,
  removePatient,
} from "./patients";

/**
 * Resolvers read only from ./patients, which validates and then delegates to
 * `PatientsSource` in src/server. That interface is the single swap point for a
 * real backend: when one exists, one implementation is added and nothing here,
 * in the schema, or in any component changes.
 */
export const resolvers = {
  Query: {
    patients: () => listPatients(),
    patient: (_: unknown, { id }: { id: string }) => findPatient(id),
  },
  Mutation: {
    addPatient: (_: unknown, { input }: { input: Record<string, unknown> }) => addPatient(input),
    changePatient: (
      _: unknown,
      { id, changes }: { id: string; changes: Record<string, unknown> },
    ) => changePatient(id, changes),
    removePatient: (_: unknown, { id }: { id: string }) => removePatient(id),
  },
};
