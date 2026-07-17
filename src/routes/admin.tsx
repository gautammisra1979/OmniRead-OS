import { useState, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminLogin } from "~/components/AdminLogin";
import { FeatureSwitchboard } from "~/components/FeatureSwitchboard";
import { AnalyticsDashboard } from "~/components/AnalyticsDashboard";
import { useLanguage } from "~/components/LanguageProvider";
import { defaultQuiz, type QuizQuestion } from "~/data/defaultQuiz";
import { getWallet, addCredits, getCostPer1K, saveCostPer1K } from "~/data/wallet";
import {
  getKnowledgeBase,
  saveKnowledgeRow,
  deleteKnowledgeRow,
  upsertKnowledgeRows,
  generateKnowledgeRowId,
  type KnowledgeRow,
  type KnowledgeType,
  KNOWLEDGE_TYPES,
} from "~/data/knowledgeBase";
import {
  getDraftConfig,
  saveDraftConfig,
  publishConfig,
  getPublishedConfig,
  hasPublishedConfig,
  type LoyaltyConfig,
  type LoyaltyTier,
} from "~/data/loyalty";
import {
  getAffiliateProfile,
  getAffiliateLedger,
  getUnpaidEarnings,
  getTotalPaidOut,
  getTotalEarnings,
  markLedgerAsPaid,
  type AffiliateLedgerEntry,
} from "~/data/affiliate";
import {
  getPromoSettings,
  savePromoSettings,
  calculateDiscountedPrice,
  type PromoSettings,
  type PromoOverride,
} from "~/data/promotions";
import {
  hasKeyPair,
  generateKeyPair,
  getKeyPair,
  getLicenses,
  issueLicense,
  revokeLicense,
  deleteLicense,
  exportLicenseToken,
  seedDemoLicense,
  getLicenseById,
  resetFeatureCache,
  type License,
} from "~/data/licensing";
import { dispatchLicenseChange } from "~/components/LicenseGate";
import { DeveloperLicenseFactory } from "~/components/DeveloperLicenseFactory";
import { OffboardingCenter } from "~/components/OffboardingCenter";
import { RefundClaimsManager } from "~/components/RefundClaimsManager";
import { PlatformFactoryReset } from "~/components/PlatformFactoryReset";
import { StorageConsole } from "~/components/StorageConsole";
import { StyleCustomizer, AnnouncementConfigSection } from "~/components/StyleCustomizer";
import { MembershipConfigSection, CatalogAccessControl } from "~/components/CheckoutUpsells";
import { DisclaimerConfigSection, InfoModalConfigSection } from "~/components/DisclaimerModal";
import { getCatalogItems, updateCatalogStatus, updateCatalogRating, type CatalogItem, type CatalogStatus } from "~/data/catalog";
import {
  getActiveLayout,
  setActiveLayout,
  getFeaturedProductId,
  setFeaturedProductId,
  type LayoutType,
} from "~/data/layoutMatrix";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const auth = sessionStorage.getItem("omnimeda_admin_auth");
    if (auth === "true") setAuthenticated(true);
  }, []);

  const handleAuth = () => {
    sessionStorage.setItem("omnimeda_admin_auth", "true");
    setAuthenticated(true);
  };

  if (!authenticated) {
    return <AdminLogin onAuthenticated={handleAuth} />;
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Admin header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in srgb, var(--color-surface) 50%, transparent)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg shadow-sm" style={{ backgroundColor: "var(--color-primary)" }}>
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: "var(--color-text)" }}>{t("admin.title")}</h1>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t("admin.subtitle")}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("omnimeda_admin_auth");
              setAuthenticated(false);
            }}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            aria-label="Logout of admin panel"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            {t("admin.logout")}
          </button>
        </div>
      </div>

      {/* License Status Readout */}
      <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-lg border px-4 py-3" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)" }} aria-hidden="true">
            <svg className="h-4 w-4" style={{ color: "var(--color-primary,#6366f1)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("license.adminTitle") ?? "License Status"}</span>
              <LicenseStatusBadge />
            </div>
          </div>
          <a
            href="/activate"
            className="rounded-lg px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            {t("license.activate")}
          </a>
        </div>
      </div>

      <FeatureSwitchboard />

      {/* Analytics Dashboard */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <AnalyticsDashboard />
      </div>

      {/* Quiz Tag Reference Accordion */}
      <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
          {t("quiz.tagReference")}
        </h2>
        <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          Reference all valid quiz tags organized by category for catalog tagging.
        </p>
        <div className="space-y-3">
          {defaultQuiz.map((q) => (
            <QuizAccordion key={q.id} question={q} />
          ))}
        </div>
      </div>

      {/* Librarian Control Engine */}
      <LibrarianControlSection />

      {/* Loyalty Rewards Configuration */}
      <LoyaltyConfigSection />

      {/* Affiliate Payroll & Management */}
      <AffiliateAdminSection />

      {/* Promotions & Discounts */}
      <PromotionsAdminSection />

      {/* Catalog Status Management */}
      <CatalogStatusManagement />

      {/* Storefront Layout Settings */}
      <StorefrontLayoutSettings />

      {/* Storefront Style Customizer */}
      <StyleCustomizer />
      <AnnouncementConfigSection />

      {/* Membership & Catalog Control */}
      <MembershipConfigSection />
      <CatalogAccessControl />
      <DisclaimerConfigSection />
      <InfoModalConfigSection />

      {/* Developer License Factory */}
      <DeveloperLicenseFactorySection />

      {/* Offboarding Control Center */}
      <OffboardingCenter />

      {/* Refund & Claims Manager */}
      <RefundClaimsManager />

      {/* Storage & Sync Console */}
      <div className="mt-12 border-t border-[var(--color-border,#334155)] pt-10">
        <StorageConsole />
      </div>

      {/* Platform Factory Reset */}
      <PlatformFactoryReset />
    </div>
  );
}

function QuizAccordion({ question }: { question: QuizQuestion }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const columnLabels: Record<string, string> = {
    quiz_mood: "Mood",
    quiz_format: "Format",
    quiz_hook: "Hook/Setting",
    quiz_pace: "Pace/Investment",
  };

  return (
    <div className="overflow-hidden rounded-xl border transition-all" style={{ borderColor: "var(--color-border,#334155)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ backgroundColor: "var(--color-surface,#1e293b)/30" }}
        aria-expanded={open}
        aria-label={`${question.question} — ${columnLabels[question.column] ?? question.column}`}
      >
        <div className="flex-1">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {columnLabels[question.column] ?? question.column}
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{question.question}</p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("quiz.column").replace("{name}", question.column)}
          </p>
        </div>
        <svg className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--color-text-muted,#94a3b8)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="border-t px-5 py-4" style={{ borderColor: "var(--color-border,#334155)" }}>
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => (
              <span key={opt.tag} className="rounded-md border px-2.5 py-1 text-xs font-medium"
                style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg)", color: "var(--color-text,#f8fafc)" }}>
                {opt.tag}
                <span className="ml-1.5 opacity-60" style={{ color: "var(--color-text-muted,#94a3b8)" }}>— {opt.text}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Librarian Control Engine ─── */

function LibrarianControlSection() {
  const { t } = useLanguage();
  const [cost, setCost] = useState(getCostPer1K());
  const [freeAmount, setFreeAmount] = useState("100");
  const [kbRows, setKbRows] = useState<KnowledgeRow[]>([]);
  const [kbRefresh, setKbRefresh] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBookId, setNewBookId] = useState("");
  const [newType, setNewType] = useState<KnowledgeType>("theme");
  const [newMarker, setNewMarker] = useState("");
  const [newContent, setNewContent] = useState("");
  const [csvSummary, setCsvSummary] = useState<{ success: number; errors: string[] } | null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setKbRows(getKnowledgeBase()); }, [kbRefresh]);

  const handleCostChange = useCallback((val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0 && n <= 0.05) { setCost(n); saveCostPer1K(n); }
  }, []);

  const handleFreeCredits = useCallback(() => {
    const amount = parseInt(freeAmount, 10);
    if (!isNaN(amount) && amount > 0) addCredits(amount);
  }, [freeAmount]);

  const handleAddRow = useCallback(() => {
    if (!newBookId.trim() || !newMarker.trim() || !newContent.trim()) return;
    saveKnowledgeRow({ id: generateKnowledgeRowId(), book_id: newBookId.trim(), knowledge_type: newType, marker_reference: newMarker.trim(), content_body: newContent.trim() });
    setNewBookId(""); setNewMarker(""); setNewContent(""); setShowAddForm(false);
    setKbRefresh((r) => r + 1);
  }, [newBookId, newType, newMarker, newContent]);

  const handleDeleteRow = useCallback((id: string) => { deleteKnowledgeRow(id); setKbRefresh((r) => r + 1); }, []);

  const handleCsvFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const requiredHeaders = ["book_id", "knowledge_type", "marker_reference", "content_body"];
      const hasAll = requiredHeaders.every((h) => headers.includes(h));
      if (!hasAll) { setCsvSummary({ success: 0, errors: ["Missing required headers"] }); return; }
      const rows: KnowledgeRow[] = []; const errors: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        if (vals.length < 4) continue;
        if (!KNOWLEDGE_TYPES.includes(vals[1] as KnowledgeType)) { errors.push(`Row ${i + 1}: invalid type '${vals[1]}'`); continue; }
        rows.push({ id: generateKnowledgeRowId(), book_id: vals[0], knowledge_type: vals[1] as KnowledgeType, marker_reference: vals[2], content_body: vals[3] });
      }
      if (rows.length > 0) { upsertKnowledgeRows(rows); setKbRefresh((r) => r + 1); }
      setCsvSummary({ success: rows.length, errors });
    };
    reader.readAsText(file);
  }, []);

  const wallet = getWallet();
  const profitMargin = cost > 0
    ? (((wallet.refillPrice / (wallet.totalPurchased || 1)) - cost / 1000) / (wallet.refillPrice / (wallet.totalPurchased || 1))) * 100
    : 0;

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>OmniRead Librarian Control Engine</h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Manage token costs, credits, and the knowledge base.</p>

      {/* Cost Settings */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("admin.chat.costLabel")}</h3>
        <label htmlFor="cost-input" className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("admin.chat.costDesc")}</label>
        <div className="mt-2 flex items-center gap-3">
          <input id="cost-input" type="number" min={0} max={0.05} step={0.001} value={cost}
            onChange={(e) => handleCostChange(e.target.value)}
            className="w-32 rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
          <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("admin.chat.profitMargin").replace("{margin}", profitMargin.toFixed(1))}
          </span>
        </div>
      </div>

      {/* Free Credit Grant */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("admin.chat.freeCredits")}</h3>
        <div className="flex items-center gap-3">
          <input type="number" min={1} value={freeAmount} onChange={(e) => setFreeAmount(e.target.value)}
            className="w-24 rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
          <button type="button" onClick={handleFreeCredits}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}>{t("admin.chat.freeCredits")}</button>
          <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Balance: {wallet.credits}</span>
        </div>
      </div>

      {/* KB CSV Import */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("admin.chat.kbImport")}</h3>
        <p className="mb-3 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("admin.chat.kbImportDesc")}</p>
        <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${csvDragOver ? "border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10" : "border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30"}`}
          onDrop={(e) => { e.preventDefault(); setCsvDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleCsvFile(f); }}
          onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true); }} onDragLeave={() => setCsvDragOver(false)}
          role="button" tabIndex={0} aria-label={t("admin.chat.kbImportDrop")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
          onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" aria-hidden="true"
            onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
          <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("admin.chat.kbImportDrop")}</p>
        </div>
        {csvSummary && (
          <div className="mt-3" role="status" aria-live="polite">
            {csvSummary.success > 0 && <p className="text-sm text-emerald-400">{t("admin.chat.kbImportSuccess").replace("{count}", String(csvSummary.success))}</p>}
            {csvSummary.errors.length > 0 && csvSummary.errors.map((err, i) => (
              <p key={i} className="text-xs text-red-400">{t("admin.chat.kbImportError").replace("{row}", String(i + 2)).replace("{error}", err)}</p>
            ))}
          </div>
        )}
      </div>

      {/* KB CRUD Grid */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("admin.chat.kbGrid")} ({kbRows.length})</h3>
          <button type="button" onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}>{t("admin.chat.kbAdd")}</button>
        </div>
        {showAddForm && (
          <div className="mb-4 rounded-lg border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg)" }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="text" value={newBookId} onChange={(e) => setNewBookId(e.target.value)} placeholder="Book ID"
                className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
              <select value={newType} onChange={(e) => setNewType(e.target.value as KnowledgeType)}
                className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }}>
                {KNOWLEDGE_TYPES.map((kt) => (<option key={kt} value={kt}>{kt}</option>))}
              </select>
              <input type="text" value={newMarker} onChange={(e) => setNewMarker(e.target.value)} placeholder="Marker (e.g. Page 45)"
                className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
              <input type="text" value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Content body"
                className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
            </div>
            <button type="button" onClick={handleAddRow} disabled={!newBookId.trim() || !newMarker.trim() || !newContent.trim()}
              className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}>{t("admin.chat.kbAdd")}</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Book ID</th>
                <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Type</th>
                <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Marker</th>
                <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Content</th>
                <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {kbRows.map((row) => (
                <tr key={row.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                  <td className="px-3 py-2" style={{ color: "var(--color-text,#f8fafc)" }}>{row.book_id}</td>
                  <td className="px-3 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{row.knowledge_type}</td>
                  <td className="px-3 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{row.marker_reference}</td>
                  <td className="max-w-[200px] truncate px-3 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{row.content_body}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => handleDeleteRow(row.id)}
                      className="rounded border border-red-800/50 px-2 py-0.5 text-[10px] text-red-400 transition-colors hover:bg-red-900/20"
                      aria-label={`${t("admin.chat.kbDelete")} ${row.book_id} ${row.marker_reference}`}>{t("admin.chat.kbDelete")}</button>
                  </td>
                </tr>
              ))}
              {kbRows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No knowledge records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Loyalty Rewards Config Section ─── */

function LoyaltyConfigSection() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<LoyaltyConfig>(getDraftConfig());
  const [published, setPublished] = useState<LoyaltyConfig>(getPublishedConfig());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"draft" | "published">("draft");

  useEffect(() => {
    setConfig(getDraftConfig());
    setPublished(getPublishedConfig());
  }, [refreshKey]);

  const updateTier = useCallback((idx: number, field: keyof LoyaltyTier, value: string | number) => {
    setConfig((prev) => {
      const tiers = [...prev.tiers];
      tiers[idx] = {
        ...tiers[idx],
        [field]: field === "multiplier" ? parseFloat(value as string) || 0 : field === "pointsRequired" ? parseInt(value as string) || 0 : value,
      };
      return { ...prev, tiers };
    });
  }, []);

  const addTier = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      tiers: [...prev.tiers, { name: "New Tier", pointsRequired: 0, multiplier: 1 }],
    }));
  }, []);

  const removeTier = useCallback((idx: number) => {
    setConfig((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== idx),
    }));
  }, []);

  const handleSaveDraft = useCallback(() => {
    saveDraftConfig(config);
    setRefreshKey((k) => k + 1);
  }, [config]);

  const handlePublish = useCallback(() => {
    saveDraftConfig(config);
    publishConfig(config);
    setShowPublishModal(false);
    setRefreshKey((k) => k + 1);
  }, [config]);

  return (
    <div
      className="mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:px-8"
      style={{ color: "var(--color-text,#f8fafc)" }}
    >
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("admin.loyalty.title")}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("admin.loyalty.desc")}
      </p>

      {/* Tab Switcher */}
      <div className="mb-4 flex gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("draft")}
          className="rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
          style={{
            backgroundColor: activeTab === "draft" ? "var(--color-primary,#6366f1)" : "transparent",
            color: activeTab === "draft" ? "#fff" : "var(--color-text-muted,#94a3b8)",
            border: activeTab === "draft" ? "none" : "1px solid var(--color-border,#334155)",
          }}
        >
          {t("admin.loyalty.tabDraft")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("published")}
          className="rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
          style={{
            backgroundColor: activeTab === "published" ? "var(--color-primary,#6366f1)" : "transparent",
            color: activeTab === "published" ? "#fff" : "var(--color-text-muted,#94a3b8)",
            border: activeTab === "published" ? "none" : "1px solid var(--color-border,#334155)",
          }}
        >
          {t("admin.loyalty.tabPublished")}
        </button>
      </div>

      {activeTab === "draft" && (
        <>
          {/* Base Settings */}
          <div
            className="mb-6 rounded-xl border p-5"
            style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
          >
            <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
              {t("admin.loyalty.baseSettings")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor="loyalty-ppp" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("admin.loyalty.ppp")}
                </label>
                <input
                  id="loyalty-ppp"
                  type="number"
                  min={1}
                  value={config.pointsPerPurchase}
                  onChange={(e) => setConfig((p) => ({ ...p, pointsPerPurchase: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>
              <div>
                <label htmlFor="loyalty-ecm" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("admin.loyalty.ecm")}
                </label>
                <input
                  id="loyalty-ecm"
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={config.extraCreditsMultiplier}
                  onChange={(e) => setConfig((p) => ({ ...p, extraCreditsMultiplier: parseFloat(e.target.value) || 1 }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>
              <div>
                <label htmlFor="loyalty-cr" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("admin.loyalty.cr")}
                </label>
                <input
                  id="loyalty-cr"
                  type="number"
                  min={1}
                  value={config.conversionRate}
                  onChange={(e) => setConfig((p) => ({ ...p, conversionRate: parseInt(e.target.value) || 1 }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>
              <div>
                <label htmlFor="loyalty-min" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("admin.loyalty.min")}
                </label>
                <input
                  id="loyalty-min"
                  type="number"
                  min={1}
                  value={config.minimumRedeem}
                  onChange={(e) => setConfig((p) => ({ ...p, minimumRedeem: parseInt(e.target.value) || 1 }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>
            </div>
          </div>

          {/* Tiers */}
          <div
            className="mb-6 rounded-xl border p-5"
            style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                {t("admin.loyalty.tiers")}
              </h3>
              <button
                type="button"
                onClick={addTier}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
                style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
              >
                {t("admin.loyalty.addTier")}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {t("admin.loyalty.tierName")}
                    </th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {t("admin.loyalty.tierPoints")}
                    </th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {t("admin.loyalty.tierMult")}
                    </th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {t("admin.loyalty.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {config.tiers.map((tier, idx) => (
                    <tr key={idx} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => updateTier(idx, "name", e.target.value)}
                          className="w-full rounded border px-2 py-1 text-xs"
                          style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                          aria-label={`Tier ${idx + 1} name`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={tier.pointsRequired}
                          onChange={(e) => updateTier(idx, "pointsRequired", e.target.value)}
                          className="w-20 rounded border px-2 py-1 text-xs"
                          style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                          aria-label={`Tier ${idx + 1} points required`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0.5}
                          max={10}
                          step={0.1}
                          value={tier.multiplier}
                          onChange={(e) => updateTier(idx, "multiplier", e.target.value)}
                          className="w-20 rounded border px-2 py-1 text-xs"
                          style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                          aria-label={`Tier ${idx + 1} multiplier`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeTier(idx)}
                          className="rounded border border-red-800/50 px-2 py-0.5 text-[10px] text-red-400 transition-colors hover:bg-red-900/20"
                          aria-label={`Remove tier ${tier.name}`}
                        >
                          {t("admin.loyalty.remove")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Draft / Publish Controls */}
          <div
            className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border p-5"
            style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
          >
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
            >
              {t("admin.loyalty.saveDraft")}
            </button>
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: "#059669" }}
            >
              {t("admin.loyalty.publish")}
            </button>
            <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {hasPublishedConfig() ? t("admin.loyalty.publishedExists") : t("admin.loyalty.noPublished")}
            </span>
          </div>
        </>
      )}

      {activeTab === "published" && (
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("admin.loyalty.currentPublished")}
          </h3>
          <div className="space-y-2 text-sm">
            <p style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("admin.loyalty.ppp")}: <span className="font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{published.pointsPerPurchase}</span>
            </p>
            <p style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("admin.loyalty.ecm")}: <span className="font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{published.extraCreditsMultiplier}x</span>
            </p>
            <p style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("admin.loyalty.cr")}: <span className="font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{published.conversionRate} pts = $1</span>
            </p>
            <p style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("admin.loyalty.min")}: <span className="font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{published.minimumRedeem}</span>
            </p>
            <div className="pt-2">
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("admin.loyalty.tiers")}</p>
              {published.tiers.map((tier, idx) => (
                <p key={idx} className="text-xs ml-2" style={{ color: "var(--color-text,#f8fafc)" }}>
                  {tier.name}: {tier.pointsRequired} pts → {tier.multiplier}x
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t("admin.loyalty.publishConfirm")}
        >
          <div
            className="mx-4 w-full max-w-md rounded-xl border p-6 shadow-xl"
            style={{ backgroundColor: "var(--color-surface,#1e293b)", borderColor: "var(--color-border,#334155)" }}
          >
            <h3 className="text-base font-bold mb-2" style={{ color: "var(--color-text,#f8fafc)" }}>
              {t("admin.loyalty.publishConfirm")}
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("admin.loyalty.publishWarning")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text-muted,#94a3b8)" }}
              >
                {t("admin.loyalty.cancel")}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
                style={{ backgroundColor: "#059669" }}
              >
                {t("admin.loyalty.confirmPublish")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Affiliate Payroll & Management ─── */

function AffiliateAdminSection() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(getAffiliateProfile());
  const [ledger, setLedger] = useState<AffiliateLedgerEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "paid">("all");
  const [settleMsg, setSettleMsg] = useState("");

  useEffect(() => {
    setProfile(getAffiliateProfile());
    setLedger(getAffiliateLedger());
  }, [refreshKey]);

  const handleSettle = useCallback(() => {
    if (!profile) return;
    markLedgerAsPaid(profile.handle);
    setSettleMsg(`Ledger cleared for @${profile.handle}!`);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSettleMsg(""), 3000);
  }, [profile]);

  const filteredLedger = statusFilter === "all"
    ? ledger
    : ledger.filter((e) => e.status === statusFilter);

  const unpaid = profile ? getUnpaidEarnings(profile.handle) : 0;
  const paidOut = profile ? getTotalPaidOut(profile.handle) : 0;
  const total = profile ? getTotalEarnings(profile.handle) : 0;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "var(--color-text-muted,#94a3b8)",
      approved: "#fbbf24",
      paid: "#34d399",
    };
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "color-mix(in srgb, " + (colors[status] ?? "#94a3b8") + " 20%, transparent)", color: colors[status] ?? "#94a3b8" }}>
        {status === "pending" ? t("affiliate.statusPending") : status === "approved" ? t("affiliate.statusApproved") : t("affiliate.statusPaid")}
      </span>
    );
  };

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("affiliate.adminTitle")}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        Manage affiliate profiles, review sales, and process payouts.
      </p>

      {!profile ? (
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: "var(--color-border,#334155)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No affiliate profile registered yet.</p>
        </div>
      ) : (
        <>
          {/* Profile Summary */}
          <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                  {profile.brandName}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  @{profile.handle} — {profile.paymentMethod}: {profile.paymentDetail}
                </p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Unpaid</p>
                  <p className="text-sm font-bold" style={{ color: "#fbbf24" }}>${unpaid.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Paid Out</p>
                  <p className="text-sm font-bold" style={{ color: "#34d399" }}>${paidOut.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Total</p>
                  <p className="text-sm font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>${total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Ledger */}
          <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                {t("affiliate.ledger")} ({ledger.length})
              </h3>
              <div className="flex gap-1">
                {(["all", "pending", "approved", "paid"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setStatusFilter(f)}
                    className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
                    style={{
                      color: statusFilter === f ? "var(--color-primary,#6366f1)" : "var(--color-text-muted,#94a3b8)",
                      backgroundColor: statusFilter === f ? "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)" : "transparent",
                    }}>
                    {f === "all" ? "All" : f === "pending" ? t("affiliate.statusPending") : f === "approved" ? t("affiliate.statusApproved") : t("affiliate.statusPaid")}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Date</th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Book</th>
                    <th className="px-3 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Value</th>
                    <th className="px-3 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Comm.</th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((entry) => (
                    <tr key={entry.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--color-text,#f8fafc)" }}>{entry.bookTitle}</td>
                      <td className="px-3 py-2 text-right" style={{ color: "var(--color-text,#f8fafc)" }}>${entry.purchaseValue.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right" style={{ color: "#34d399" }}>${entry.commissionSlice.toFixed(2)}</td>
                      <td className="px-3 py-2">{statusBadge(entry.status)}</td>
                    </tr>
                  ))}
                  {filteredLedger.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No entries match filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Settlement Action */}
          <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSettle}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
                style={{ backgroundColor: "#059669" }}
                aria-label={t("affiliate.markSettled")}>
                {t("affiliate.markSettled")}
              </button>
              {settleMsg && (
                <span className="text-sm text-emerald-400" role="status" aria-live="polite">{settleMsg}</span>
              )}
              <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                Marks all approved entries as paid.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Promotions & Discounts Admin Section ─── */

function PromotionsAdminSection() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<PromoSettings>(getPromoSettings());
  const [saved, setSaved] = useState(false);
  const [bulkCatalogs, setBulkCatalogs] = useState(getCatalogItems());
  const [bulkRefresh, setBulkRefresh] = useState(0);
  const [bulkOverrideActive, setBulkOverrideActive] = useState(false);
  const [bulkOverrideType, setBulkOverrideType] = useState<"percentage" | "flat" | "fixed">("percentage");
  const [bulkOverrideValue, setBulkOverrideValue] = useState("20");

  useEffect(() => {
    setSettings(getPromoSettings());
    setBulkCatalogs(getCatalogItems());
  }, [bulkRefresh]);

  const handleSaveSettings = useCallback(() => {
    savePromoSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const handleBulkToggle = useCallback((idx: number, val: boolean) => {
    setBulkCatalogs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], promoOverride: val ? { hasOverride: true, overrideType: "percentage", overrideValue: 20 } : undefined };
      return next;
    });
  }, []);

  const handleBulkType = useCallback((idx: number, val: "percentage" | "flat" | "fixed") => {
    setBulkCatalogs((prev) => {
      const next = [...prev];
      const current = next[idx].promoOverride;
      if (current) next[idx] = { ...next[idx], promoOverride: { ...current, overrideType: val } };
      return next;
    });
  }, []);

  const handleBulkValue = useCallback((idx: number, val: number) => {
    setBulkCatalogs((prev) => {
      const next = [...prev];
      const current = next[idx].promoOverride;
      if (current) next[idx] = { ...next[idx], promoOverride: { ...current, overrideValue: val } };
      return next;
    });
  }, []);

  const handleApplyToAll = useCallback(() => {
    setBulkCatalogs((prev) =>
      prev.map((item) => ({
        ...item,
        promoOverride: bulkOverrideActive
          ? { hasOverride: true, overrideType: bulkOverrideType, overrideValue: parseFloat(bulkOverrideValue) || 0 }
          : undefined,
      }))
    );
  }, [bulkOverrideActive, bulkOverrideType, bulkOverrideValue]);

  const handleSaveBulk = useCallback(() => {
    if (typeof window === "undefined") return;
    const existing = getCatalogItems();
    const updated = existing.map((existingItem) => {
      const bulkItem = bulkCatalogs.find((b) => b.id === existingItem.id);
      if (bulkItem) return { ...existingItem, promoOverride: bulkItem.promoOverride };
      return existingItem;
    });
    localStorage.setItem("omnimedos_catalog", JSON.stringify(updated));
    setBulkRefresh((k) => k + 1);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [bulkCatalogs]);

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("promo.title")}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("promo.desc")}
      </p>

      {/* Settings Panel */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Settings</h3>

        <div className="space-y-4">
          {/* Master Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={settings.isPromoModuleEnabled}
              aria-label={t("promo.masterToggle")}
              onClick={() => setSettings((p) => ({ ...p, isPromoModuleEnabled: !p.isPromoModuleEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.isPromoModuleEnabled ? "bg-emerald-500" : "bg-gray-600"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.isPromoModuleEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm" style={{ color: "var(--color-text,#f8fafc)" }}>{t("promo.masterToggle")}</span>
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("promo.discountType")}</label>
            <select
              value={settings.globalDiscountType}
              onChange={(e) => setSettings((p) => ({ ...p, globalDiscountType: e.target.value as "percentage" | "flat" | "coupon" }))}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
            >
              <option value="percentage">{t("promo.percentage")}</option>
              <option value="flat">{t("promo.flat")}</option>
              <option value="coupon">{t("promo.coupon")}</option>
            </select>
          </div>

          {/* Discount Value */}
          <div>
            <label htmlFor="promo-value" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("promo.discountValue")}
            </label>
            <input
              id="promo-value"
              type="number"
              min={0}
              value={settings.globalDiscountValue}
              onChange={(e) => setSettings((p) => ({ ...p, globalDiscountValue: parseFloat(e.target.value) || 0 }))}
              className="w-32 rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
            />
          </div>

          {/* Coupon Code */}
          {settings.globalDiscountType === "coupon" && (
            <div>
              <label htmlFor="promo-coupon" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("promo.couponCode")}
              </label>
              <input
                id="promo-coupon"
                type="text"
                value={settings.activeCouponCode}
                onChange={(e) => setSettings((p) => ({ ...p, activeCouponCode: e.target.value }))}
                className="w-48 rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              />
            </div>
          )}

          {/* Format Restriction — only for coupon type */}
          {settings.globalDiscountType === "coupon" && (
            <div>
              <label htmlFor="promo-format-restr" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("promo.formatRestriction")}
              </label>
              <select
                id="promo-format-restr"
                value={settings.couponFormatRestriction ?? "all"}
                onChange={(e) => setSettings((p) => ({ ...p, couponFormatRestriction: e.target.value as "all" | "ebook" | "audiobook" | "video" }))}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              >
                <option value="all">{t("promo.allFormats")}</option>
                <option value="ebook">{t("promo.ebooksOnly")}</option>
                <option value="audiobook">{t("promo.audiobooksOnly")}</option>
                <option value="video">{t("promo.videosOnly")}</option>
              </select>
            </div>
          )}

          {/* Announcement Text */}
          <div>
            <label htmlFor="promo-announce" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("promo.announcement")}
            </label>
            <input
              id="promo-announce"
              type="text"
              value={settings.announcementText}
              onChange={(e) => setSettings((p) => ({ ...p, announcementText: e.target.value }))}
              className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
            />
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            {saved ? t("promo.saved") : t("promo.saveSettings")}
          </button>
        </div>
      </div>

      {/* Catalog Bulk Editor */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("promo.bulkEditor")} ({bulkCatalogs.length})
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={bulkOverrideActive}
                onChange={(e) => setBulkOverrideActive(e.target.checked)}
                className="rounded"
              />
              <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("promo.hasOverride")}</span>
            </label>
            <select
              value={bulkOverrideType}
              onChange={(e) => setBulkOverrideType(e.target.value as "percentage" | "flat" | "fixed")}
              className="rounded border px-2 py-1 text-[10px]"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              disabled={!bulkOverrideActive}
            >
              <option value="percentage">%</option>
              <option value="flat">$</option>
              <option value="fixed">Fix</option>
            </select>
            <input
              type="number"
              min={0}
              value={bulkOverrideValue}
              onChange={(e) => setBulkOverrideValue(e.target.value)}
              className="w-16 rounded border px-2 py-1 text-[10px]"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              disabled={!bulkOverrideActive}
            />
            <button
              type="button"
              onClick={handleApplyToAll}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
            >
              {t("promo.applyToAll")}
            </button>
            <button
              type="button"
              onClick={handleSaveBulk}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
              style={{ backgroundColor: "#059669" }}
            >
              {t("promo.saveBulk")}
            </button>
          </div>
        </div>

        {bulkCatalogs.length === 0 ? (
          <p className="py-6 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No catalog items yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                  <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Title</th>
                  <th className="px-3 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Price</th>
                  <th className="px-3 py-2 font-medium text-center" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("promo.hasOverride")}</th>
                  <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("promo.overrideType")}</th>
                  <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("promo.overrideValue")}</th>
                </tr>
              </thead>
              <tbody>
                {bulkCatalogs.map((item, idx) => (
                  <tr key={item.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                    <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: "var(--color-text,#f8fafc)" }}>{item.title}</td>
                    <td className="px-3 py-2 text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>${item.price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!item.promoOverride?.hasOverride}
                        onChange={(e) => handleBulkToggle(idx, e.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {item.promoOverride?.hasOverride ? (
                        <select
                          value={item.promoOverride.overrideType}
                          onChange={(e) => handleBulkType(idx, e.target.value as "percentage" | "flat" | "fixed")}
                          className="rounded border px-2 py-1 text-[10px]"
                          style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                        >
                          <option value="percentage">%</option>
                          <option value="flat">$</option>
                          <option value="fixed">Fix</option>
                        </select>
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {item.promoOverride?.hasOverride ? (
                        <input
                          type="number"
                          min={0}
                          value={item.promoOverride.overrideValue}
                          onChange={(e) => handleBulkValue(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 rounded border px-2 py-1 text-[10px]"
                          style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                        />
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Catalog Status Management ─── */
function CatalogStatusManagement() {
  const { t } = useLanguage();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setCatalog(getCatalogItems());
  }, [refreshKey]);

  const handleStatusChange = useCallback((id: string, status: CatalogStatus) => {
    updateCatalogStatus(id, status);
    setSaved(`Status updated for item ${id}`);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSaved(""), 2000);
  }, []);

  const handleRatingChange = useCallback((id: string, rating: number) => {
    updateCatalogRating(id, rating);
    setRefreshKey((k) => k + 1);
  }, []);

  if (catalog.length === 0) {
    return (
      <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
          {t("admin.catalog.statusManagement")}
        </h2>
        <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {t("admin.catalog.statusDesc")}
        </p>
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: "var(--color-border,#334155)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No catalog items yet. Add products first.</p>
        </div>
      </div>
    );
  }

  const statusBadge = (status: string | undefined) => {
    if (!status || status === "live") {
      return <span className="rounded bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Live</span>;
    }
    if (status === "coming-soon") {
      return <span className="rounded bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-400">Coming Soon</span>;
    }
    return <span className="rounded bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-400">Retired</span>;
  };

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("admin.catalog.statusManagement")}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("admin.catalog.statusDesc")}
      </p>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
          {saved}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-border,#334155)" }}>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
              <th className="px-4 py-3 font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Title</th>
              <th className="px-4 py-3 font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Status</th>
              <th className="px-4 py-3 font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Rating</th>
              <th className="px-4 py-3 font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Reviews</th>
              <th className="px-4 py-3 font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((item) => (
              <tr key={item.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: "var(--color-border,#334155)" }}>
                <td className="max-w-[200px] truncate px-4 py-3 font-medium" style={{ color: "var(--color-text,#f8fafc)" }}>
                  {item.title}
                </td>
                <td className="px-4 py-3">{statusBadge(item.status)}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={item.rating ?? 0}
                    onChange={(e) => handleRatingChange(item.id, parseFloat(e.target.value) || 0)}
                    className="w-16 rounded border px-2 py-1 text-[10px]"
                    style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                    aria-label={`Rating for ${item.title}`}
                  />
                </td>
                <td className="px-4 py-3" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {item.reviewCount ?? 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, "live")}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${item.status === "live" || !item.status ? "bg-emerald-900/30 text-emerald-400" : "text-gray-500 hover:text-emerald-400"}`}
                      aria-label={`Set ${item.title} to Live`}
                    >
                      Live
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, "coming-soon")}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${item.status === "coming-soon" ? "bg-amber-900/30 text-amber-400" : "text-gray-500 hover:text-amber-400"}`}
                      aria-label={`Set ${item.title} to Coming Soon`}
                    >
                      Coming
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, "retired")}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${item.status === "retired" ? "bg-red-900/30 text-red-400" : "text-gray-500 hover:text-red-400"}`}
                      aria-label={`Set ${item.title} to Retired`}
                    >
                      Retire
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Storefront Layout Settings ─── */
function StorefrontLayoutSettings() {
  const { t } = useLanguage();
  const [layout, setLayoutState] = useState<LayoutType>(getActiveLayout());
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [featuredId, setFeaturedIdState] = useState<string | null>(getFeaturedProductId());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCatalog(getCatalogItems());
  }, []);

  const handleLayoutChange = useCallback((newLayout: LayoutType) => {
    setLayoutState(newLayout);
    setActiveLayout(newLayout);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const handleFeaturedChange = useCallback((id: string) => {
    setFeaturedIdState(id);
    setFeaturedProductId(id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const allProducts = catalog.length > 0 ? catalog : [];

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("layout.title")}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        Choose your storefront layout and configure featured content.
      </p>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
          Settings saved!
        </div>
      )}

      {/* Layout selector — radio cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {([
          { value: "classic" as LayoutType, labelKey: "layout.classic", descKey: "layout.classicDesc", icon: "📐" },
          { value: "spotlight" as LayoutType, labelKey: "layout.spotlight", descKey: "layout.spotlightDesc", icon: "🔦" },
          { value: "magazine" as LayoutType, labelKey: "layout.magazine", descKey: "layout.magazineDesc", icon: "📰" },
        ]).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleLayoutChange(opt.value)}
            className={`rounded-xl border p-5 text-left transition-all hover:opacity-80 ${
              layout === opt.value ? "ring-2" : ""
            }`}
            style={{
              borderColor: layout === opt.value ? "var(--color-primary,#6366f1)" : "var(--color-border,#334155)",
              backgroundColor: layout === opt.value
                ? "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)"
                : "var(--color-surface,#1e293b)/30",
              ringColor: "var(--color-primary,#6366f1)",
            }}
            aria-label={t(opt.labelKey)}
          >
            <div className="mb-2 text-2xl" aria-hidden="true">{opt.icon}</div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
              {t(opt.labelKey)}
            </h3>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t(opt.descKey)}
            </p>
          </button>
        ))}
      </div>

      {/* Spotlight featured product selector */}
      {layout === "spotlight" && (
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("layout.featuredProduct")}
          </h3>
          {allProducts.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              No catalog items yet. Add products to select a featured item.
            </p>
          ) : (
            <select
              value={featuredId ?? ""}
              onChange={(e) => handleFeaturedChange(e.target.value)}
              className="w-full max-w-xs rounded-lg border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--color-bg,#0f172a)",
                color: "var(--color-text,#f8fafc)",
                borderColor: "var(--color-border,#334155)",
              }}
              aria-label={t("layout.featuredProduct")}
            >
              <option value="">{t("layout.featuredProduct")}</option>
              {allProducts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} — ${item.price.toFixed(2)}
                </option>
              ))}
            </select>
          )}
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("layout.spotlightDesc")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── License Status Badge ─── */
function LicenseStatusBadge() {
  const [licenses, setLicenses] = useState<License[]>([]);
  useEffect(() => { setLicenses(getLicenses()); }, []);
  const { t } = useLanguage();

  const validLicenses = licenses.filter(
    (l) => !l.revoked && new Date(l.expiresAt) > new Date()
  );
  const hasActive = validLicenses.length > 0;
  const hasAllFeatures = validLicenses.some((l) => l.features.includes("all"));

  const statusClass = hasActive
    ? "bg-emerald-900/30 text-emerald-400"
    : "bg-amber-900/30 text-amber-400";
  const statusText = hasActive
    ? hasAllFeatures
      ? t("license.allFeatures")
      : t("license.active")
    : t("license.inactive");

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>
      <span className={`mr-1 h-1.5 w-1.5 rounded-full ${hasActive ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />
      {statusText}
    </span>
  );
}

/* ─── Developer License Factory Section ─── */
function DeveloperLicenseFactorySection() {
  return <DeveloperLicenseFactory />;
}