"use client";

import { useState } from "react";

import { createFlagsmithInstance } from "@flagsmith/flagsmith/isomorphic";
import { FlagsmithProvider, useFlags } from "@flagsmith/flagsmith/react";
import type { IState } from "@flagsmith/flagsmith/types";

/**
 * The browser half of the flag system, hydrated from the server's read.
 *
 * No `options` prop on purpose. The provider only calls `init` when it is
 * given options, so leaving it off means the browser SDK never opens a
 * connection to Flagsmith: it is handed `serverState` and nothing else. Two
 * things follow. No environment key reaches the bundle, and a user's own
 * network position never decides whether this app has flags — which matters
 * here, because Flagsmith sits behind a source-IP allowlist that a laptop off
 * the Jamf tunnel is not on.
 *
 * The cost is that flag changes land on the next request rather than pushing
 * to open tabs. For an internal portal that is the right trade; if live
 * updates are ever wanted, this is where `options` and `realtime` would go.
 */
export function FlagsProvider({
  serverState,
  children,
}: {
  serverState: IState | null;
  children: React.ReactNode;
}) {
  // One instance for the life of the mount. `createFlagsmithInstance` rather
  // than the SDK's default export, which is a module singleton.
  const [flagsmith] = useState(createFlagsmithInstance);

  return (
    <FlagsmithProvider flagsmith={flagsmith} serverState={serverState ?? undefined}>
      {children}
    </FlagsmithProvider>
  );
}

/**
 * Whether `name` is enabled, or `fallback` if the browser has no flag state —
 * which is what an unconfigured or unreachable Flagsmith looks like from here.
 *
 * The client mirror of `getFlag` in `@/lib/flags`, fallback discipline and
 * all: state the safe value at the call site.
 *
 * ```tsx
 * const showComposer = useFlag("app1_new_layout", false);
 * ```
 */
export function useFlag(name: string, fallback = false): boolean {
  const flags = useFlags([name]);
  return flags?.[name]?.enabled ?? fallback;
}
