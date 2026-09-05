/**
 * The only way data enters this app.
 *
 * Components — server or client — call `gql`. Nothing calls `fetch` directly,
 * and nothing calls a REST endpoint. If you need new data, add it to
 * src/graphql/schema.ts, implement it in src/graphql/resolvers.ts, and back it
 * with a method on `PatientsSource` in src/server.
 *
 * One entry point, two transports, chosen by where the code is running:
 *
 * - On the server, execute against the executable schema in this process. No
 *   fetch and no origin to guess.
 * - In the browser, POST to /api/graphql, which is the same schema behind a
 *   graphql-yoga route handler.
 *
 * Callers cannot tell the difference and should not care.
 */

const GRAPHQL_PATH = "/api/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (typeof window === "undefined") {
    // Imported lazily so the schema, the resolvers and the mock JSON stay out
    // of the browser bundle.
    const { executeOnServer } = await import("./graphql-server");
    return executeOnServer<T>(query, variables);
  }

  let response: Response;
  try {
    response = await fetch(GRAPHQL_PATH, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
  } catch (cause) {
    throw new Error(
      `Could not reach the GraphQL endpoint at ${GRAPHQL_PATH}. Check that the app is running.`,
      { cause },
    );
  }

  if (!response.ok) {
    throw new Error(
      `The GraphQL endpoint at ${GRAPHQL_PATH} answered ${response.status} ${response.statusText}.`,
    );
  }

  const payload = (await response.json()) as GraphQLResponse<T>;

  if (payload.errors?.length) {
    // One error is the normal case and its message is written for the person
    // who caused it, so pass it through unchanged.
    throw new Error(payload.errors.map((error) => error.message).join(" "));
  }
  if (!payload.data) {
    throw new Error(`The GraphQL endpoint at ${GRAPHQL_PATH} returned no data.`);
  }

  return payload.data;
}
