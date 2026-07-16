import { useState, type FormEvent } from "react";
import { useLanguage } from "~/components/LanguageProvider";

const ADMIN_PASSWORD = "omnimeda-os-admin";

interface AdminLoginProps {
  onAuthenticated: () => void;
}

export function AdminLogin({ onAuthenticated }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { t } = useLanguage();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onAuthenticated();
    } else {
      setError(t("admin.login.error"));
      setPassword("");
    }
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
              <label htmlFor="admin-password" className="sr-only">
                {t("admin.login.title")}
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder={t("admin.login.title")}
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

            {error && (
              <p id="password-error" className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {t("admin.login.button")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}