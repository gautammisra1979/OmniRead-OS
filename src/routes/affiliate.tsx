import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { LicenseGate } from "~/components/LicenseGate";
import { AffiliateSetup } from "~/components/AffiliateSetup";
import { AffiliateDashboard } from "~/components/AffiliateDashboard";
import { getMyAffiliateProfile } from "~/data/affiliateProgram";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/affiliate")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLanguage();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMyAffiliateProfile().then((profile) => {
      if (!cancelled) setHasProfile(profile !== null);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // UX convenience only — the real enforcement is server-side in
  // registerAffiliateProfile() (see affiliateProgram.ts's
  // AffiliateRegistrationRequiresAccountError).
  const isAnonymous = !sessionPending && !!session?.user?.isAnonymous;

  return (
    <LicenseGate feature="affiliate" featureName={t("affiliate.title")} featureIcon="🤝">
      <main role="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("affiliate.title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("affiliate.subtitle")}
          </p>
        </div>

        {sessionPending || hasProfile === null ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Loading…</p>
        ) : hasProfile ? (
          <AffiliateDashboard />
        ) : isAnonymous ? (
          <div
            className="mx-auto max-w-2xl rounded-xl border p-6 text-center"
            style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-text,#f8fafc)" }}>
              Sign up for an account to register as an affiliate.
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              Affiliate profiles are tied to a real account so payouts and login persist over time.
            </p>
          </div>
        ) : (
          <AffiliateSetup onComplete={handleComplete} />
        )}
      </main>
    </LicenseGate>
  );
}
