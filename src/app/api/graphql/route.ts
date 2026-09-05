import { GraphQLError } from "graphql";
import { createYoga } from "graphql-yoga";

import { type RouteContext, schema } from "@/graphql/executable-schema";

/**
 * The GraphQL boundary as an HTTP endpoint.
 *
 * The browser talks to this app through here. Server components execute the
 * same schema in-process instead — see src/lib/graphql-server.ts — so this
 * handler and that executor deliberately share the one schema from
 * src/graphql/executable-schema.ts rather than each building their own.
 */
const { handleRequest } = createYoga<RouteContext>({
  schema,
  graphqlEndpoint: "/api/graphql",
  // Yoga builds its reply with whatever Response implementation it is handed.
  // Next.js needs its own, so pass the runtime's global explicitly.
  fetchAPI: { Response },

  /**
   * Say what went wrong. Yoga masks anything that is not a GraphQLError as
   * "Unexpected error." — the exact message our own rules forbid. This app is
   * an internal portal whose errors are written to be read by the person who
   * hit them, so the trade goes the other way. Logged as well as returned.
   */
  maskedErrors: {
    maskError(error, message) {
      console.error("[graphql]", error);
      if (error instanceof GraphQLError) return error;
      return new GraphQLError(error instanceof Error ? error.message : message, {
        originalError: error instanceof Error ? error : undefined,
      });
    },
  },
});

export { handleRequest as GET, handleRequest as OPTIONS, handleRequest as POST };
