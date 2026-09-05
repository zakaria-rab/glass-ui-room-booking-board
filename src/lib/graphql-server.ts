import { graphql } from "graphql";

import { schema } from "@/graphql/executable-schema";

/**
 * The server half of `gql`: run the query in this process.
 *
 * A server component asking this app's own route handler over HTTP would be a
 * network round trip for data the process already holds, and on Vercel it does
 * not survive contact with Deployment Protection — the request to the
 * deployment's own hostname is intercepted and answered with the SSO login page
 * as HTML, so every server render throws.
 */
export async function executeOnServer<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const result = await graphql({ schema, source: query, variableValues: variables });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join("; "));
  }
  if (!result.data) {
    throw new Error("The GraphQL query returned no data.");
  }

  // graphql-js assembles result objects with `Object.create(null)`, which React
  // Server Components refuse to serialise to a Client Component. The HTTP
  // transport never hit this because `JSON.parse` yields plain objects, so
  // round-trip here and hand both transports identical plain data.
  return JSON.parse(JSON.stringify(result.data)) as T;
}
