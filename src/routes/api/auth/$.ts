import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return await auth.handler(request);
      },
      POST: async ({ request }: { request: Request }) => {
        // Public sign-up is now allowed: databaseHooks.user.create.before
        // (src/lib/auth.ts) rejects signups for ADMIN_EMAIL /
        // ADMIN_EMAIL_BACKUP unless a valid ADMIN_CLAIM_TOKEN is attached,
        // so the previous blanket block here is no longer needed to keep
        // those addresses safe — and blocking it entirely would also break
        // onLinkAccount (src/lib/mergeAnonymousUser.ts), which only fires
        // when a real sign-up/sign-in actually completes.
        return await auth.handler(request);
      },
    },
  },
});
