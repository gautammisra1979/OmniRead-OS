import { createFileRoute } from "@tanstack/react-router";
import { LayoutMatrix } from "~/components/LayoutMatrix";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <LayoutMatrix />;
}