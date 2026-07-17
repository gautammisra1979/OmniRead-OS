import { ClassicGridLayout } from "~/components/ClassicGridLayout";
import { SpotlightLayout } from "~/components/SpotlightLayout";
import { MagazineLayout } from "~/components/MagazineLayout";
import { getActiveLayout } from "~/data/layoutMatrix";

export function LayoutMatrix() {
  const layout = getActiveLayout();

  switch (layout) {
    case "classic":
      return <ClassicGridLayout />;
    case "spotlight":
      return <SpotlightLayout />;
    case "magazine":
    default:
      return <MagazineLayout />;
  }
}