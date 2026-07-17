import { EvaluationScaffold } from "~/components/EvaluationScaffold";
import { ClassicGridLayout } from "~/components/ClassicGridLayout";
import { SpotlightLayout } from "~/components/SpotlightLayout";
import { MagazineLayout } from "~/components/MagazineLayout";
import { getActiveLayout } from "~/data/layoutMatrix";

export function LayoutMatrix() {
  // Enterprise white-label operational phases flag: "demo" | "in-progress" | "live"
  const storeOperationalStatus = "demo";

  if (storeOperationalStatus === "demo") {
    return <EvaluationScaffold />;
  }

  // Fallback engine layers if status transitions to provisioned/live views
  const layout = getActiveLayout();
  switch (layout) {
    case "classic": return <ClassicGridLayout />;
    case "spotlight": return <SpotlightLayout />;
    case "magazine":
    default: return <MagazineLayout />;
  }
}
