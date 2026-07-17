import { useState, type FormEvent, useCallback, useEffect } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { verifyRecoveryKey, generateRecoveryKey, getRecoveryKey, setAdminCredentials, hasRecoveryKey, getAdminCredentials } from "~/data/adminRecovery";

const ADMIN_PASSWORD = "omnimeda-os-admin";

interface AdminLoginProps {
  onAuthenticated: () => void;
}

export function AdminLogin({ onAuthenticated }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [showNewCreds, setShowNewCreds] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [newPasscodeConfirm, setNewPasscodeConfirm] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [masterKey, setMasterKey] = useState("");
  const [keyRevealed, setKeyRevealed] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!hasRecoveryKey()) {
      generateRecoveryKey().then((key) => setMasterKey(key));
    } else {
      const stored = getRecoveryKey();
      if (stored) setMasterKey(stored);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const creds = getAdminCredentials();
    const validPassword = creds ? creds.passcode : ADMIN_PASSWORD;
    if (password === validPassword) {
      onAuthenticated();
    } else {
      setError(t("admin.login.error"));
      setPassword("");
    }
  };

  const handleRecoveryVerify = useCallback(async () => {
    const isValid = await verifyRecoveryKey(recoveryInput.trim());
    if (isValid) {
      setRecoverySuccess(true);
      setRecoveryError("");
      setShowNewCreds(true);
    } else {
      setRecoveryError("Invalid recovery key. Please check your 12-word phrase.");
    }
  }, [recoveryInput]);

  const handleSetNewCreds = useCallback(() => {
    if (!newEmail.trim() || !newPasscode.trim()) return;
    if (newPasscode !== newPasscodeConfirm) {
      setRecoveryError("Passcodes do not match.");
      return;
    }
    setAdminCredentials(newEmail.trim(), newPasscode);
    setShowNewCreds(false);
    setShowRecovery(false);
    // Show success message briefly
    setPassword(newPasscode);
    setRecoverySuccess(false);
    setRecoveryInput("");
  }, [newEmail, newPasscode, newPasscodeConfirm]);

  const handleRevealKey = useCallback(() => {
    setKeyRevealed(true);
  }, []);

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

          {!showRecovery ? (
            <>
              <form onSubmit={handleSubmit} className="mt-8 space-y-4" aria-label="Admin authentication form">
                <div>
                  <label htmlFor="admin-password" className="sr-only">
                    {t("admin.login.title")}
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
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

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowRecovery(true)}
                  className="w-full text-center text-xs underline underline-offset-2 hover:opacity-80"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {t("admin.recovery.reset") ?? "Reset / Change Admin Credentials"}
                </button>

                {!keyRevealed ? (
                  <button
                    type="button"
                    onClick={handleRevealKey}
                    className="w-full text-center text-xs hover:opacity-80"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {t("admin.recovery.showKey") ?? "Show Master Recovery Key"}
                  </button>
                ) : (
                  <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                    <p className="text-xs font-bold mb-1" style={{ color: "var(--color-text)" }}>
                      {t("admin.recovery.key") ?? "Your Master Recovery Key:"}
                    </p>
                    <p className="text-xs font-mono leading-relaxed break-all" style={{ color: "var(--color-primary)" }}>
                      {masterKey}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                      {t("admin.recovery.save") ?? "Save this in a safe place. It cannot be recovered."}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-8 space-y-4">
              <h2 className="text-base font-semibold text-center" style={{ color: "var(--color-text)" }}>
                {t("admin.recovery.title") ?? "Account Recovery"}
              </h2>

              {!showNewCreds ? (
                <>
                  <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
                    {t("admin.recovery.enterKey") ?? "Enter your 12-word Master Recovery Key to reset credentials."}
                  </p>
                  <div>
                    <label htmlFor="recovery-key" className="sr-only">
                      {t("admin.recovery.key") ?? "Master Recovery Key"}
                    </label>
                    <textarea
                      id="recovery-key"
                      value={recoveryInput}
                      onChange={(e) => { setRecoveryInput(e.target.value); setRecoveryError(""); }}
                      className="w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-1"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text)",
                        borderColor: recoveryError ? "#ef4444" : "var(--color-border)",
                      }}
                      rows={3}
                      placeholder="Enter your 12-word recovery phrase..."
                    />
                  </div>

                  {recoveryError && (
                    <p className="text-sm text-red-400" role="alert">{recoveryError}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleRecoveryVerify}
                    className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    {t("admin.recovery.verify") ?? "Verify & Reset"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-center text-emerald-400">
                    {t("admin.recovery.verified") ?? "Recovery key verified! Set new credentials."}
                  </p>
                  <div>
                    <label htmlFor="new-email" className="block text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                      {t("admin.recovery.newEmail") ?? "New Admin Email"}
                    </label>
                    <input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full rounded-lg border px-4 py-3 text-sm" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
                  </div>
                  <div>
                    <label htmlFor="new-passcode" className="block text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                      {t("admin.recovery.newPasscode") ?? "New Passcode"}
                    </label>
                    <input id="new-passcode" type="password" value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)}
                      className="w-full rounded-lg border px-4 py-3 text-sm" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
                  </div>
                  <div>
                    <label htmlFor="new-passcode-confirm" className="block text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                      {t("admin.recovery.confirmPasscode") ?? "Confirm Passcode"}
                    </label>
                    <input id="new-passcode-confirm" type="password" value={newPasscodeConfirm} onChange={(e) => setNewPasscodeConfirm(e.target.value)}
                      className="w-full rounded-lg border px-4 py-3 text-sm" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
                  </div>
                  {recoveryError && <p className="text-sm text-red-400" role="alert">{recoveryError}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowRecovery(false)}
                      className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                      {t("common.cancel") ?? "Cancel"}
                    </button>
                    <button type="button" onClick={handleSetNewCreds}
                      className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
                      style={{ backgroundColor: "var(--color-primary)" }}>
                      {t("admin.recovery.save") ?? "Save New Credentials"}
                    </button>
                  </div>
                </>
              )}

              <button type="button" onClick={() => { setShowRecovery(false); setShowNewCreds(false); setRecoveryInput(""); setRecoveryError(""); }}
                className="w-full text-center text-xs underline underline-offset-2 hover:opacity-80"
                style={{ color: "var(--color-text-muted)" }}>
                {t("common.cancel") ?? "Back to Login"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}