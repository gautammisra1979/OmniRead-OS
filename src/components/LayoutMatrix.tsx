import { ClassicGridLayout } from "~/components/ClassicGridLayout";
import { SpotlightLayout } from "~/components/SpotlightLayout";
import { MagazineLayout } from "~/components/MagazineLayout";
import { getActiveLayout } from "~/data/layoutMatrix";

export function LayoutMatrix() {
  const layout = getActiveLayout();

  switch (layout) {
    case "spotlight":
      return <SpotlightLayout />;
    case "magazine":
      return <MagazineLayout />;
    case "classic":
    default:
      return <ClassicGridLayout />;
  }
}