import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { claimAdminAccount } from "~/data/adminClaim";

/**
 * Hidden, token-gated route — not linked from any nav/footer/UI. It is the
 * only way to create or reset the account attached to ADMIN_EMAIL /
 * ADMIN_EMAIL_BACKUP (see src/lib/auth.ts): the public signup form refuses
 * those two addresses unless this route's ADMIN_CLAIM_TOKEN accompanies the
 * request. This route stays live permanently — not one-time/inert after
 * first use — since the owner may need to claim the backup email later, or
 * re-register after rotating ADMIN_EMAIL to a new address.
 *
 * The actual claim logic (token/email checks, account creation or password
 * reset) lives server-side in src/data/adminClaim.ts — see that file for
 * how the two cases (fresh claim vs. lockout recovery) are handled.
 *
 * Filename note: `admin_.claim.tsx` (trailing underscore on `admin_`) is
 * TanStack Router's file-based-routing escape for "don't nest this under
 * routes/admin.tsx's layout" — without it, `/admin/claim` would be a child
 * route requiring admin.tsx to render an <Outlet/>, which it doesn't (it's
 * a page, not a layout), making this route unreachable.
 */

export const Route = createFileRoute("/admin_/claim")({
  component: AdminClaimPage,
});

function AdminClaimPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await claimAdminAccount({ email, password, token });
      if (result.ok) {
        navigate({ to: "/admin" });
        return;
      }
      setError("Claim failed.");
    } catch {
      setError("Claim failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 p-8 shadow-xl">
          <h1 className="text-center text-2xl font-bold text-black">Claim admin account</h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            Creates or resets the account for a reserved admin email. Requires the claim token.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" aria-label="Admin claim form">
            <div>
              <label htmlFor="claim-email" className="sr-only">Email</label>
              <input
                id="claim-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="Email"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-1"
                autoFocus
                required
              />
            </div>

            <div>
              <label htmlFor="claim-password" className="sr-only">Password</label>
              <input
                id="claim-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-1"
                required
              />
            </div>

            <div>
              <label htmlFor="claim-token" className="sr-only">Claim token</label>
              <input
                id="claim-token"
                type="password"
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(""); }}
                placeholder="Claim token"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-1"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Claim account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
