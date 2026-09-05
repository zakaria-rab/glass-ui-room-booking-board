import { createSchema } from "graphql-yoga";

import { resolvers } from "./resolvers";
import { typeDefs } from "./schema";

/**
 * The server context Next.js hands a route handler as its second argument.
 * The resolvers do not read it, but yoga's schema and server generics have to
 * agree on it, so it is declared once here and imported by the route handler.
 */
export type RouteContext = {
  params: Promise<Record<string, string | string[]>>;
};

/**
 * The schema, built once per server process.
 *
 * Both consumers share it: the `/api/graphql` route handler (for the browser)
 * and the in-process executor used by server components. Building it twice
 * would mean two copies of the in-memory patient list, so a mutation sent over
 * HTTP would not be visible to a server render.
 */
export const schema = createSchema<RouteContext>({ typeDefs, resolvers });
