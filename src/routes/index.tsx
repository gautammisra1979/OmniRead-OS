import { createFileRoute } from "@tanstack/react-router";
import { LayoutMatrix } from "~/components/LayoutMatrix";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return <LayoutMatrix />;
}
