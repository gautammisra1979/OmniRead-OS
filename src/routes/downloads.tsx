import { createFileRoute } from "@tanstack/react-router";
import { DownloadLedger } from "~/components/DownloadLedger";

export const Route = createFileRoute("/downloads")({
  component: DownloadsPage,
});

function DownloadsPage() {
  return <DownloadLedger />;
}
