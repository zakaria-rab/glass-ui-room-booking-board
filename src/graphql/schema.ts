/**
 * The one contract between this app's frontend and its backend.
 *
 * To add data: add it here first, then implement it in ./resolvers.ts, then
 * back it with a method on `PatientsSource` in src/server. Nothing reaches a
 * component any other way, and no resolver reads a file.
 */
export const typeDefs = /* GraphQL */ `
  """How far a patient has got through their appointment."""
  enum VisitStatus {
    SCHEDULED
    CHECKED_IN
    COMPLETED
    NO_SHOW
  }

  type Patient {
    id: ID!
    name: String!
    phone: String!
    provider: String!
    """The appointment date, as ISO-8601 \`YYYY-MM-DD\`."""
    nextVisit: String!
    status: VisitStatus!
    """
    Outstanding balance in dollars. A Float because this is demo data; real
    money needs integer cents or a Decimal scalar, not a binary float.
    """
    balance: Float!
  }

  """Every field a new patient needs. Status and balance default at the store."""
  input NewPatient {
    name: String!
    phone: String!
    provider: String!
    nextVisit: String!
    status: VisitStatus
    balance: Float
  }

  """
  A partial update: every field optional, and an omitted field is left alone.
  Sending none of them is an error rather than a no-op, so a mistyped field
  name fails loudly instead of silently doing nothing.
  """
  input PatientChanges {
    name: String
    phone: String
    provider: String
    nextVisit: String
    status: VisitStatus
    balance: Float
  }

  type Query {
    patients: [Patient!]!
    patient(id: ID!): Patient
  }

  type Mutation {
    addPatient(input: NewPatient!): Patient!
    changePatient(id: ID!, changes: PatientChanges!): Patient!
    """Returns the id that was removed, so a client can drop it from its list."""
    removePatient(id: ID!): ID!
  }
`;
