/**
 * Every operation this app sends, in one place.
 *
 * Plain strings, so both a server component and a client component can import
 * them without pulling the schema or the store into the browser bundle.
 */

const PATIENT_FIELDS = /* GraphQL */ `
  id
  name
  phone
  provider
  nextVisit
  status
  balance
`;

export const PATIENTS = /* GraphQL */ `
  query Patients {
    patients { ${PATIENT_FIELDS} }
  }
`;

export const ADD_PATIENT = /* GraphQL */ `
  mutation AddPatient($input: NewPatient!) {
    addPatient(input: $input) { ${PATIENT_FIELDS} }
  }
`;

export const CHANGE_PATIENT = /* GraphQL */ `
  mutation ChangePatient($id: ID!, $changes: PatientChanges!) {
    changePatient(id: $id, changes: $changes) { ${PATIENT_FIELDS} }
  }
`;

export const REMOVE_PATIENT = /* GraphQL */ `
  mutation RemovePatient($id: ID!) {
    removePatient(id: $id)
  }
`;
