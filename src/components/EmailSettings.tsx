import { useState, useEffect, useCallback } from "react";
import {
  getEmailSettings,
  saveEmailSettings,
  sendTestEmail,
  getVerifiedProviders,
  type EmailSettingsPublic,
} from "~/data/emailSettings";
import type { EmailProviderId } from "~/lib/email/types";

const PROVIDER_LABELS: Record<EmailProviderId, string> = {
  resend: "Resend",
  postmark: "Postmark",
  ses: "Amazon SES",
};

export function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<EmailSettingsPublic | null>(null);

  const [provider, setProvider] = useState<EmailProviderId>("resend");
  const [fromName, setFromName] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [postmarkApiKey, setPostmarkApiKey] = useState("");
  const [sesAccessKeyId, setSesAccessKeyId] = useState("");
  const [sesSecretAccessKey, setSesSecretAccessKey] = useState("");
  const [sesRegion, setSesRegion] = useState("us-east-1");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [testRecipient, setTestRecipient] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const verifiedProviders = getVerifiedProviders();

  const refresh = useCallback(async () => {
    const row = await getEmailSettings();
    setSettings(row);
    setProvider(row.provider);
    setFromName(row.fromName);
    setFromAddress(row.fromAddress);
    setSesAccessKeyId(row.ses.accessKeyId);
    setSesRegion(row.ses.region);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveEmailSettings({
        provider,
        fromName,
        fromAddress,
        resendApiKey: resendApiKey || undefined,
        postmarkApiKey: postmarkApiKey || undefined,
        sesAccessKeyId: sesAccessKeyId || undefined,
        sesSecretAccessKey: sesSecretAccessKey || undefined,
        sesRegion: sesRegion || undefined,
      });
      setResendApiKey("");
      setPostmarkApiKey("");
      setSesSecretAccessKey("");
      await refresh();
      setSaveMsg({ type: "success", text: "Email settings saved." });
    } catch {
      setSaveMsg({ type: "error", text: "Could not save email settings." });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }, [provider, fromName, fromAddress, resendApiKey, postmarkApiKey, sesAccessKeyId, sesSecretAccessKey, sesRegion, refresh]);

  const handleTestSend = useCallback(async () => {
    if (!testRecipient) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await sendTestEmail(testRecipient);
      setTestResult(
        result.success
          ? { type: "success", text: `Test email sent to ${testRecipient}.` }
          : { type: "error", text: result.error || "Send failed." },
      );
    } catch {
      setTestResult({ type: "error", text: "Send failed." });
    } finally {
      setTesting(false);
    }
  }, [testRecipient]);

  if (loading || !settings) return null;

  const inputStyle = {
    backgroundColor: "var(--color-bg,#0f172a)",
    color: "var(--color-text,#f8fafc)",
    borderColor: "var(--color-border,#334155)",
  };

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div
        className="rounded-xl border p-6"
        style={{
          borderColor: "var(--color-border,#334155)",
          backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 50%, transparent)",
        }}
      >
        <div className="mb-6">
          <h2 className="text-base font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            Transactional Email
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            Configure which provider sends real mail, and confirm it works with a test send.
          </p>
        </div>

        {saveMsg && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm ${saveMsg.type === "success" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`}
            role="status"
            aria-live="polite"
          >
            {saveMsg.text}
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as EmailProviderId)}
              className="w-full rounded-lg border px-3 py-2 text-xs"
              style={inputStyle}
            >
              {verifiedProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div />
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              From name
            </label>
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-xs"
              style={inputStyle}
              placeholder="Your Store"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              From address
            </label>
            <input
              type="text"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-xs"
              style={inputStyle}
              placeholder="no-reply@yourstore.com"
            />
          </div>
        </div>

        {(provider === "resend" || provider === "postmark") && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {PROVIDER_LABELS[provider]} API key
            </label>
            <input
              type="password"
              value={provider === "resend" ? resendApiKey : postmarkApiKey}
              onChange={(e) => (provider === "resend" ? setResendApiKey(e.target.value) : setPostmarkApiKey(e.target.value))}
              className="w-full rounded-lg border px-3 py-2 text-xs"
              style={inputStyle}
              placeholder={
                (provider === "resend" ? settings.resend.hasApiKey : settings.postmark.hasApiKey)
                  ? "•••••••••••••••• (leave blank to keep)"
                  : "Enter API key"
              }
            />
          </div>
        )}

        {provider === "ses" && (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                Access key ID
              </label>
              <input
                type="text"
                value={sesAccessKeyId}
                onChange={(e) => setSesAccessKeyId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                Secret access key
              </label>
              <input
                type="password"
                value={sesSecretAccessKey}
                onChange={(e) => setSesSecretAccessKey(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs"
                style={inputStyle}
                placeholder={settings.ses.hasSecret ? "•••••••••••••••• (leave blank to keep)" : "Enter secret access key"}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                Region
              </label>
              <input
                type="text"
                value={sesRegion}
                onChange={(e) => setSesRegion(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs"
                style={inputStyle}
                placeholder="us-east-1"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
          style={{ backgroundColor: "#10b981" }}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>

        <div className="mt-8 border-t pt-6" style={{ borderColor: "var(--color-border,#334155)" }}>
          <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            Send Test Email
          </h3>
          <p className="mb-3 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            Sends a real message through {PROVIDER_LABELS[provider]} using the saved settings above.
          </p>

          {testResult && (
            <div
              className={`mb-3 rounded-lg px-4 py-3 text-sm ${testResult.type === "success" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`}
              role="status"
              aria-live="polite"
            >
              {testResult.text}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="w-full max-w-sm rounded-lg border px-3 py-2 text-xs"
              style={inputStyle}
              placeholder="you@example.com"
            />
            <button
              type="button"
              onClick={handleTestSend}
              disabled={testing || !testRecipient}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
              style={{ backgroundColor: "#3b82f6" }}
            >
              {testing ? "Sending…" : "Send Test Email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
