import { useState, useEffect, type FormEvent } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { authClient } from "~/lib/auth-client";
import { checkAppleSignInEnabled } from "~/lib/checkAppleSignInEnabled";

interface AdminLoginProps {
  onAuthenticated: () => void;
}

export function AdminLogin({ onAuthenticated }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Defaults to hidden: the server is the only side that knows whether
  // APPLE_CLIENT_ID etc. are set (see appleConfigured in src/lib/auth.ts),
  // so the button stays hidden until that check comes back rather than
  // flashing then disappearing for a storeowner who hasn't configured it.
  const [appleEnabled, setAppleEnabled] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    checkAppleSignInEnabled().then((enabled) => {
      if (!cancelled) setAppleEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    // Better Auth's own session cookie (not this call's return value) is
    // what every admin-mutating server function now checks via
    // requireAdmin() — that cookie is the real security boundary.
    const { error: signInError } = await authClient.signIn.email({ email, password });
    setSubmitting(false);
    if (!signInError) {
      onAuthenticated();
    } else {
      setError(t("admin.login.error"));
      setPassword("");
    }
  };

  const handleAppleSignIn = () => {
    // Full-page redirect through Apple — there's no local dev callback for
    // this (Apple doesn't support localhost/non-HTTPS redirect URIs at
    // all), so this can only be exercised on a real HTTPS deployment.
    // callbackURL carries a query flag admin.tsx looks for on return, since
    // OAuth's redirect-back is a fresh page load with no in-memory state to
    // call onAuthenticated() on directly (see the comment on that effect).
    authClient.signIn.social({
      provider: "apple",
      callbackURL: `${window.location.origin}/admin?appleAuth=1`,
    });
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl border p-8 shadow-xl backdrop-blur-sm"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "color-mix(in srgb, var(--color-surface) 50%, transparent)",
          }}
        >
          <div
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 20%, transparent)" }}
          >
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              style={{ color: "var(--color-primary)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>

          <h1 className="text-center text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            {t("admin.login.title")}
          </h1>
          <p className="mt-2 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("admin.login.subtitle")}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" aria-label="Admin authentication form">
            <div>
              <label htmlFor="admin-email" className="sr-only">
                {t("admin.login.email") ?? "Email"}
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder={t("admin.login.email") ?? "Email"}
                className="w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-1 placeholder-gray-500"
                style={{
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text)",
                  borderColor: error ? "#ef4444" : "var(--color-border)",
                }}
                autoFocus
                aria-invalid={!!error}
                aria-describedby={error ? "password-error" : undefined}
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="sr-only">
                {t("admin.login.password") ?? "Password"}
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder={t("admin.login.password") ?? "Password"}
                className="w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-1 placeholder-gray-500"
                style={{
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text)",
                  borderColor: error ? "#ef4444" : "var(--color-border)",
                }}
                aria-invalid={!!error}
                aria-describedby={error ? "password-error" : undefined}
              />
            </div>

            {error && (
              <p id="password-error" className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {t("admin.login.button")}
            </button>
          </form>

          {appleEnabled && (
            <>
              <div className="my-6 flex items-center gap-3" aria-hidden="true">
                <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {t("admin.login.or")}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
              </div>

              {/*
                Per Apple's Sign in with Apple Human Interface Guidelines:
                the official black mark, unmodified colors/proportions, not
                restyled to match this app's own --color-primary button
                system. https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple
              */}
              <button
                type="button"
                onClick={handleAppleSignIn}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.06 2.09-.98 3.935-.98 1.831 0 2.35.98 3.96.941 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.036-.013-3.19-1.226-3.216-4.85-.026-3.03 2.473-4.485 2.586-4.552-1.418-2.087-3.622-2.32-4.39-2.372-2.01-.16-3.69 1.083-4.6 1.083zM15.53 3.83c.843-1.012 1.4-2.426 1.245-3.83-1.207.052-2.665.805-3.532 1.818-.78.896-1.454 2.338-1.271 3.714 1.338.104 2.71-.688 3.559-1.701z" />
                </svg>
                {t("admin.login.appleSignIn")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
