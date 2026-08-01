import { useState, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { setAdminCredentials } from "~/data/adminRecovery";

interface AdminCredentialsFormProps {
  /** Authorizes the setAdminCredentials() call — either a freshly-generated
   *  or previously-verified 12-word recovery phrase. */
  recoveryPhrase: string;
  onSuccess: (passcode: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

/**
 * Shared email / passcode / confirm-passcode fields used both by the
 * account-recovery flow (AdminLogin.tsx) and the forced first-time setup
 * screen (AdminForcedSetup.tsx). Calls the same setAdminCredentials()
 * server function in both cases.
 */
export function AdminCredentialsForm({ recoveryPhrase, onSuccess, onCancel, submitLabel }: AdminCredentialsFormProps) {
  const { t } = useLanguage();
  const [newEmail, setNewEmail] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [newPasscodeConfirm, setNewPasscodeConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!newEmail.trim() || !newPasscode.trim()) return;
    if (newPasscode !== newPasscodeConfirm) {
      setError("Passcodes do not match.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await setAdminCredentials(newEmail.trim(), newPasscode, recoveryPhrase);
      onSuccess(newPasscode);
    } catch {
      setError("Could not save credentials. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [newEmail, newPasscode, newPasscodeConfirm, recoveryPhrase, onSuccess]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="new-email" className="block text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
          {t("admin.recovery.newEmail") ?? "New Admin Email"}
        </label>
        <input
          id="new-email"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="w-full rounded-lg border px-4 py-3 text-sm"
          style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
        />
      </div>
      <div>
        <label htmlFor="new-passcode" className="block text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
          {t("admin.recovery.newPasscode") ?? "New Passcode"}
        </label>
        <input
          id="new-passcode"
          type="password"
          value={newPasscode}
          onChange={(e) => setNewPasscode(e.target.value)}
          className="w-full rounded-lg border px-4 py-3 text-sm"
          style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
        />
      </div>
      <div>
        <label htmlFor="new-passcode-confirm" className="block text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
          {t("admin.recovery.confirmPasscode") ?? "Confirm Passcode"}
        </label>
        <input
          id="new-passcode-confirm"
          type="password"
          value={newPasscodeConfirm}
          onChange={(e) => setNewPasscodeConfirm(e.target.value)}
          className="w-full rounded-lg border px-4 py-3 text-sm"
          style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      )}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            {t("common.cancel") ?? "Cancel"}
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {submitLabel ?? t("admin.recovery.save") ?? "Save New Credentials"}
        </button>
      </div>
    </div>
  );
}
