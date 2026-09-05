/**
 * Types shared across the GraphQL boundary.
 *
 * Kept here rather than in src/graphql so a client component can import the
 * status list without pulling the resolvers, the store and the mock JSON into
 * the browser bundle. Mirrors the schema in src/graphql/schema.ts; the SDL is
 * the contract and this follows it.
 */

export const VISIT_STATUSES = ["SCHEDULED", "CHECKED_IN", "COMPLETED", "NO_SHOW"] as const;

export type VisitStatus = (typeof VISIT_STATUSES)[number];

export type Patient = {
  id: string;
  name: string;
  phone: string;
  provider: string;
  nextVisit: string;
  status: VisitStatus;
  balance: number;
};
