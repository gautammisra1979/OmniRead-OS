import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { LicenseGate } from "~/components/LicenseGate";
import { ProgressHub } from "~/components/ProgressHub";

export const Route = createFileRoute("/progress")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLanguage();
  return (
    <LicenseGate feature="progress" featureName={t("progress.title") ?? "Progress Hub"} featureIcon="📊">
      <main role="main">
        <ProgressHub />
      </main>
    </LicenseGate>
  );
}