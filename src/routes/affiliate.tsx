import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { LicenseGate } from "~/components/LicenseGate";
import { AffiliateSetup } from "~/components/AffiliateSetup";
import { AffiliateDashboard } from "~/components/AffiliateDashboard";
import { getAffiliateProfile } from "~/data/affiliate";

export const Route = createFileRoute("/affiliate")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLanguage();
  const [hasProfile, setHasProfile] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setHasProfile(getAffiliateProfile() !== null);
  }, [refreshKey]);

  const handleComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

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

        {hasProfile ? (
          <AffiliateDashboard />
        ) : (
          <AffiliateSetup onComplete={handleComplete} />
        )}
      </main>
    </LicenseGate>
  );
}