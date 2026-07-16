import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  type DownloadRecord,
  seedDemoDownloads,
  getDownloads,
} from "~/data/downloads";
import { RefundForm } from "~/components/RefundForm";

/* ------------------------------------------------------------------ */
/*  Toast helper                                                       */
/* ------------------------------------------------------------------ */

function Toast({
  message,
  visible,
  onClose,
}: {
  message: string;
  visible: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg transition-all"
      style={{ backgroundColor: "var(--color-primary)" }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Type badge                                                         */
/* ------------------------------------------------------------------ */

function TypeBadge({ type }: { type: DownloadRecord["productType"] }) {
  const label =
    type === "ebook"
      ? "PDF E-Book"
      : type === "audiobook"
        ? "MP3 Audiobook"
        : "MP4 Video Guide";
  const colors = {
    ebook: "border-indigo-700/40 text-indigo-300 bg-indigo-900/20",
    audiobook: "border-amber-700/40 text-amber-300 bg-amber-900/20",
    video: "border-emerald-700/40 text-emerald-300 bg-emerald-900/20",
  };

  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${colors[type]}`}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary header                                                     */
/* ------------------------------------------------------------------ */

function SummaryHeader({
  records,
}: {
  records: DownloadRecord[];
}) {
  const { t } = useLanguage();
  const totalPurchases = records.length;
  const totalSpend = records.reduce((sum, r) => sum + r.price, 0);
  const mostRecent = records.length
    ? [...records].sort(
        (a, b) =>
          new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime(),
      )[0]
    : null;

  return (
    <div
      className="mb-6 grid gap-4 sm:grid-cols-3"
      role="region"
      aria-label="Download summary"
    >
      {/* Total purchases */}
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor:
            "color-mix(in srgb, var(--color-surface) 50%, transparent)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t("downloads.totalPurchases")}
        </p>
        <p
          className="mt-1 text-2xl font-bold"
          style={{ color: "var(--color-text)" }}
        >
          {totalPurchases}
        </p>
      </div>

      {/* Total spend */}
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor:
            "color-mix(in srgb, var(--color-surface) 50%, transparent)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t("downloads.totalSpend")}
        </p>
        <p
          className="mt-1 text-2xl font-bold"
          style={{ color: "var(--color-primary)" }}
        >
          ${totalSpend.toFixed(2)}
        </p>
      </div>

      {/* Most recent purchase */}
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor:
            "color-mix(in srgb, var(--color-surface) 50%, transparent)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t("downloads.mostRecent")}
        </p>
        <p
          className="mt-1 text-sm font-medium truncate"
          style={{ color: "var(--color-text)" }}
        >
          {mostRecent
            ? mostRecent.productTitle
            : t("downloads.noPurchases")}
        </p>
        {mostRecent && (
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {formatDate(mostRecent.purchasedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border py-16"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor:
          "color-mix(in srgb, var(--color-surface) 30%, transparent)",
      }}
      role="region"
      aria-label="No downloads"
    >
      <svg
        className="mb-4 h-16 w-16"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1}
        stroke="currentColor"
        aria-hidden="true"
        style={{ color: "var(--color-text-muted)" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
      <h3
        className="text-lg font-semibold"
        style={{ color: "var(--color-text)" }}
      >
        {t("downloads.emptyTitle")}
      </h3>
      <p
        className="mt-2 max-w-sm text-center text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        {t("downloads.emptyDesc")}
      </p>
      <a
        href="/"
        className="mt-6 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {t("downloads.browseCatalog")}
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function daysSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function DownloadLedger() {
  const { t } = useLanguage();
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [sortAsc, setSortAsc] = useState(false);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [refundingRecord, setRefundingRecord] = useState<DownloadRecord | null>(null);

  const refresh = useCallback(() => {
    seedDemoDownloads();
    setRecords(getDownloads());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showToast = (msg: string) => {
    setToast(msg);
    setToastVisible(true);
  };

  const handleDismissToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  const handleDownload = (record: DownloadRecord) => {
    // Update localStorage
    const all = getDownloads();
    const found = all.find((r) => r.id === record.id);
    if (found) {
      found.downloadCount += 1;
      found.lastDownloadedAt = new Date().toISOString();
      localStorage.setItem("omnimedos_downloads", JSON.stringify(all));
      setRecords(all);

      // Dispatch analytics event
      window.dispatchEvent(new CustomEvent("omnimeda-download-triggered", {
        detail: { productId: record.productId, title: record.productTitle },
      }));
    }
    showToast(`${t("downloads.downloadStarted")} ${record.productTitle}`);
  };

  // Sort records by purchasedAt (default newest first)
  const sorted = [...records].sort((a, b) => {
    const diff =
      new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
    return sortAsc ? -diff : diff;
  });

  const toggleSort = () => setSortAsc((prev) => !prev);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--color-text)" }}
        >
          {t("downloads.pageTitle")}
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t("downloads.pageDesc")}
        </p>
      </div>

      {records.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <SummaryHeader records={records} />

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border md:block" style={{ borderColor: "var(--color-border)" }}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor:
                      "color-mix(in srgb, var(--color-surface) 50%, transparent)",
                  }}
                >
                  <th
                    className="px-4 py-3 font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {t("downloads.colProduct")}
                  </th>
                  <th
                    className="px-4 py-3 font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {t("downloads.colType")}
                  </th>
                  <th
                    className="px-4 py-3 font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {t("downloads.colPrice")}
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 font-medium select-none"
                    style={{ color: "var(--color-text-muted)" }}
                    onClick={toggleSort}
                    aria-label={
                      sortAsc
                        ? t("downloads.sortNewest")
                        : t("downloads.sortOldest")
                    }
                    role="columnheader"
                    aria-sort={sortAsc ? "ascending" : "descending"}
                  >
                    <span className="flex items-center gap-1">
                      {t("downloads.colPurchased")}
                      <svg
                        className={`h-3 w-3 transition-transform ${sortAsc ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </span>
                  </th>
                  <th
                    className="px-4 py-3 font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {t("downloads.colDownloads")}
                  </th>
                  <th
                    className="px-4 py-3 font-medium"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {t("downloads.colAction")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b last:border-0"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--color-text)" }}
                    >
                      {record.productTitle}
                      <span
                        className="ml-2 text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        by {record.productAuthor}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={record.productType} />
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--color-text)" }}
                    >
                      ${record.price.toFixed(2)}
                    </td>
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {daysSince(record.purchasedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {record.downloadCount}{" "}
                        {record.lastDownloadedAt &&
                          `· Last ${daysSince(record.lastDownloadedAt)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(record)}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          style={{ backgroundColor: "var(--color-primary)" }}
                          aria-label={`${t("downloads.download")} ${record.productTitle}`}
                        >
                          {t("downloads.download")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRefundingRecord(record)}
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                          aria-label={`${t("checkout.requestRefund")} ${record.productTitle}`}
                        >
                          {t("checkout.requestRefund")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="space-y-4 md:hidden">
            {sorted.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border p-4"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor:
                    "color-mix(in srgb, var(--color-surface) 50%, transparent)",
                }}
                role="region"
                aria-label={`${record.productTitle} download`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      {record.productTitle}
                    </h3>
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      by {record.productAuthor}
                    </p>
                  </div>
                  <TypeBadge type={record.productType} />
                </div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {t("downloads.colPrice")}: ${record.price.toFixed(2)}
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {daysSince(record.purchasedAt)}
                  </span>
                </div>
                <div className="mb-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {t("downloads.colDownloads")}: {record.downloadCount}
                  {record.lastDownloadedAt &&
                    ` · ${t("downloads.last")} ${daysSince(record.lastDownloadedAt)}`}
                </div>
                <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(record)}
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
                  style={{ backgroundColor: "var(--color-primary)" }}
                  aria-label={`${t("downloads.download")} ${record.productTitle}`}
                >
                  {t("downloads.download")}
                </button>
                <button
                  type="button"
                  onClick={() => setRefundingRecord(record)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                  aria-label={`${t("checkout.requestRefund")} ${record.productTitle}`}
                >
                  {t("checkout.requestRefund")}
                </button>
              </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Toast
        message={toast}
        visible={toastVisible}
        onClose={handleDismissToast}
      />

      {/* Refund Form Modal */}
      {refundingRecord && (
        <RefundForm
          downloadId={refundingRecord.id}
          productId={refundingRecord.productId}
          productTitle={refundingRecord.productTitle}
          transactionId={refundingRecord.id}
          onClose={() => setRefundingRecord(null)}
          onSubmitted={() => {
            setRefundingRecord(null);
            showToast(`Refund requested for "${refundingRecord.productTitle}"`);
          }}
        />
      )}
    </div>
  );
}
