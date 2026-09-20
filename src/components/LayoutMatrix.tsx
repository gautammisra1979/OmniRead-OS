import { useEffect, useState } from "react";
import { EvaluationScaffold } from "~/components/EvaluationScaffold";
import { ClassicGridLayout } from "~/components/ClassicGridLayout";
import { SpotlightLayout } from "~/components/SpotlightLayout";
import { MagazineLayout } from "~/components/MagazineLayout";
import { getStorefrontLayout } from "~/db/queries";
import type { LayoutType } from "~/data/layoutMatrix";

export function LayoutMatrix() {
  // Enterprise white-label operational phases flag: "demo" | "in-progress" | "live"
  const storeOperationalStatus = "demo";
  const [layout, setLayout] = useState<LayoutType>("magazine");

  // DB-backed (Step 26) — was a synchronous localStorage read. Skipped
  // entirely while storeOperationalStatus is "demo" since EvaluationScaffold
  // is what actually renders below; no point paying for the round-trip.
  useEffect(() => {
    if (storeOperationalStatus === "demo") return;
    let cancelled = false;
    getStorefrontLayout().then((settings) => {
      if (!cancelled) setLayout(settings.activeLayout);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (storeOperationalStatus === "demo") {
    return <EvaluationScaffold />;
  }

  // Fallback engine layers if status transitions to provisioned/live views
  switch (layout) {
    case "classic": return <ClassicGridLayout />;
    case "spotlight": return <SpotlightLayout />;
    case "magazine":
    default: return <MagazineLayout />;
  }
}
