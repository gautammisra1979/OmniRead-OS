import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { extractOAuthTokenFromCallback } from "~/data/cloudSync";
import { useLanguage } from "~/components/LanguageProvider";

export const Route = createFileRoute("/cloud-callback")({
  component: CloudCallback,
});

function CloudCallback() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Small delay to let the URL fragment be processed
    const timer = setTimeout(() => {
      const token = extractOAuthTokenFromCallback();
      if (token) {
        setStatus("success");
        // Redirect to admin after 2 seconds
        setTimeout(() => navigate({ to: "/admin" }), 2000);
      } else {
        setStatus("error");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div
          className="rounded-2xl border p-8 shadow-xl"
          style={{
            borderColor: "var(--color-border, #334155)",
            backgroundColor: "color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent)",
          }}
        >
          {status === "processing" && (
            <>
              <svg className="mx-auto h-12 w-12 mb-4 animate-spin" style={{ color: "var(--color-primary, #6366f1)" }} fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <h1 className="text-lg font-semibold" style={{ color: "var(--color-text, #f8fafc)" }}>
                {t("cloud.callbackProcessing")}
              </h1>
            </>
          )}

          {status === "success" && (
            <>
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: "#22c55e" }} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h1 className="text-lg font-semibold" style={{ color: "var(--color-text, #f8fafc)" }}>
                {t("cloud.callbackSuccess")}
              </h1>
              <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
                {t("cloud.callbackRedirect")}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" color="#ef4444" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <h1 className="text-lg font-semibold" style={{ color: "var(--color-text, #f8fafc)" }}>
                {t("cloud.callbackError")}
              </h1>
              <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
                {t("cloud.callbackErrorDesc")}
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/admin" })}
                className="mt-6 inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
                style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
              >
                {t("cloud.backToAdmin")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}