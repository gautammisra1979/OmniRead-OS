import { createRouter } from "@tanstack/react-router";
import { getGlobalStartContext } from "@tanstack/react-start";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // undefined on the client (getGlobalStartContext is server-only) and
  // during any server-side call site outside a request (none exist here) —
  // see src/start.ts for where this is set.
  const cspNonce = (getGlobalStartContext() as { cspNonce?: string } | undefined)?.cspNonce;

  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultNotFoundComponent: () => <p>Not found</p>,
    ssr: cspNonce ? { nonce: cspNonce } : undefined,
  });
}
