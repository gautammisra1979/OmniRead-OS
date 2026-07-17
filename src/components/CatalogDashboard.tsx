import { useState, useCallback, useEffect, useRef, type DragEvent, type ChangeEvent } from "react";
import {
  getCatalogItems,
  saveCatalogItem,
  deleteCatalogItem,
  createCatalogItem,
  updateCatalogStatus,
  type CatalogItem,
  type CatalogStatus,
} from "~/data/catalog";
import { useLanguage } from "~/components/LanguageProvider";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function CatalogDashboard() {
  const { t } = useLanguage();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [toast, setToast] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [price, setPrice] = useState("");
  const [format, setFormat] = useState("PDF E-Book");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState("");
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);

  // Drag states
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [mediaDragOver, setMediaDragOver] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setItems(getCatalogItems());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setPrice("");
    setFormat("PDF E-Book");
    setDescription("");
    setCoverImage(null);
    setMediaName("");
    setMediaDataUrl(null);
  };

  const handleCoverFile = (file: File) => {
    if (!file.type.match(/^image\/(png|jpeg)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => setCoverImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleMediaFile = (file: File) => {
    const allowed = [".pdf", ".mp3", ".mp4"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) return;
    setMediaName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setMediaDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const makeDropHandler = (
    setter: (f: File) => void,
    dragSetter: (v: boolean) => void,
  ) => ({
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragSetter(false);
      const file = e.dataTransfer.files?.[0];
      if (file) setter(file);
    },
    onDragOver: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragSetter(true);
    },
    onDragLeave: () => dragSetter(false),
  });

  const coverDrop = makeDropHandler(handleCoverFile, setCoverDragOver);
  const mediaDrop = makeDropHandler(handleMediaFile, setMediaDragOver);

  const isFormValid =
    title.trim().length > 0 &&
    author.trim().length > 0 &&
    parseFloat(price) > 0;

  const handlePublish = () => {
    if (!isFormValid) return;
    const item = createCatalogItem({
      title: title.trim(),
      author: author.trim(),
      price: parseFloat(price),
      type: format === "PDF E-Book" ? "ebook" : format === "MP3 Audiobook" ? "audiobook" : "video",
      format,
      description: description.trim(),
      coverImage,
      mediaFile: { name: mediaName, dataUrl: mediaDataUrl },
    });
    saveCatalogItem(item);
    refresh();
    resetForm();
    showToast(t("admin.catalog.published"));

    // Notify analytics dashboard
    window.dispatchEvent(
      new CustomEvent("omnimeda-product-added", {
        detail: { title: item.title, price: item.price, type: item.type },
      }),
    );
  };

  const handleDelete = (id: string) => {
    deleteCatalogItem(id);
    refresh();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const typeDisplay = (fmt: string) => {
    if (fmt === "PDF E-Book") return t("admin.catalog.typeEbook");
    if (fmt === "MP3 Audiobook") return t("admin.catalog.typeAudiobook");
    if (fmt === "MP4 Video Guide") return t("admin.catalog.typeVideo");
    return fmt;
  };

  return (
    <div className="mt-12 border-t border-[var(--color-border,#334155)] pt-10">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--color-text,#f8fafc)]">
          {t("admin.catalog.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted,#94a3b8)]">
          {t("admin.catalog.desc")}
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="mb-4 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg"
          style={{ backgroundColor: "var(--color-primary)" }}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30 p-5">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-text,#f8fafc)]">
          {t("admin.catalog.addTitle")}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Asset Title */}
          <div>
            <label htmlFor="cat-title" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
              {t("admin.catalog.titleLabel")}
            </label>
            <input
              id="cat-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-4 py-2.5 text-sm text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
              placeholder="The Resilient Mind"
            />
          </div>
          {/* Author */}
          <div>
            <label htmlFor="cat-author" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
              {t("admin.catalog.authorLabel")}
            </label>
            <input
              id="cat-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={80}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-4 py-2.5 text-sm text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
              placeholder="Dr. Amara Osei"
            />
          </div>
          {/* Price */}
          <div>
            <label htmlFor="cat-price" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
              {t("admin.catalog.priceLabel")}
            </label>
            <input
              id="cat-price"
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-4 py-2.5 text-sm text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
              placeholder="14.99"
            />
          </div>
          {/* Asset Type */}
          <div>
            <label htmlFor="cat-type" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
              {t("admin.catalog.typeLabel")}
            </label>
            <select
              id="cat-type"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-4 py-2.5 text-sm text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
            >
              <option value="PDF E-Book">{t("admin.catalog.typeEbook")}</option>
              <option value="MP3 Audiobook">{t("admin.catalog.typeAudiobook")}</option>
              <option value="MP4 Video Guide">{t("admin.catalog.typeVideo")}</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4">
          <label htmlFor="cat-desc" className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
            {t("admin.catalog.descLabel")}
          </label>
          <textarea
            id="cat-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1.5 w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-4 py-2.5 text-sm text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
            placeholder="A transformative guide to building mental toughness..."
          />
        </div>

        {/* Two upload slots */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Cover Art */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
              {t("admin.catalog.coverLabel")}
            </label>
            <div
              className={`relative mt-1.5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 transition-colors ${
                coverDragOver
                  ? "border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10"
                  : "border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30"
              }`}
              {...coverDrop}
              role="button"
              tabIndex={0}
              aria-label="Cover art upload area"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  coverInputRef.current?.click();
                }
              }}
              onClick={() => coverInputRef.current?.click()}
            >
              <input
                ref={coverInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverFile(file);
                }}
                className="hidden"
                aria-hidden="true"
              />
              {coverImage ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={coverImage} alt="Cover preview" className="max-h-24 max-w-36 rounded object-contain" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCoverImage(null); if (coverInputRef.current) coverInputRef.current.value = ""; }}
                    className="rounded-lg border border-[var(--color-border,#334155)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted,#94a3b8)] hover:bg-[var(--color-surface,#1e293b)]"
                  >
                    {t("admin.catalog.remove")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="h-8 w-8 text-[var(--color-text-muted,#94a3b8)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-xs text-[var(--color-text-muted,#94a3b8)]">{t("admin.catalog.dropHint")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Media File */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
              {t("admin.catalog.mediaLabel")}
            </label>
            <div
              className={`relative mt-1.5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 transition-colors ${
                mediaDragOver
                  ? "border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10"
                  : "border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30"
              }`}
              {...mediaDrop}
              role="button"
              tabIndex={0}
              aria-label="Media file upload area"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  mediaInputRef.current?.click();
                }
              }}
              onClick={() => mediaInputRef.current?.click()}
            >
              <input
                ref={mediaInputRef}
                type="file"
                accept=".pdf,.mp3,.mp4"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) handleMediaFile(file);
                }}
                className="hidden"
                aria-hidden="true"
              />
              {mediaDataUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <svg className="h-8 w-8 text-[var(--color-primary,#6366f1)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-xs font-medium text-[var(--color-text,#f8fafc)] truncate max-w-full">{mediaName}</p>
                  <p className="text-xs text-[var(--color-text-muted,#94a3b8)]">{formatFileSize(mediaDataUrl.length * 0.75)}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMediaDataUrl(null); setMediaName(""); if (mediaInputRef.current) mediaInputRef.current.value = ""; }}
                    className="rounded-lg border border-[var(--color-border,#334155)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted,#94a3b8)] hover:bg-[var(--color-surface,#1e293b)]"
                  >
                    {t("admin.catalog.remove")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="h-8 w-8 text-[var(--color-text-muted,#94a3b8)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-xs text-[var(--color-text-muted,#94a3b8)]">{t("admin.catalog.dropHint")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Publish button */}
        <div className="mt-6">
          <button
            type="button"
            disabled={!isFormValid}
            onClick={handlePublish}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            {t("admin.catalog.publish")}
          </button>
        </div>
      </div>

      {/* CSV Bulk Import */}
      <CSVBulkImport onImportComplete={refresh} showToast={showToast} />

      {/* Recent Products */}
      {items.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
            {t("admin.catalog.recent")}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border,#334155)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/50">
                  <th className="px-4 py-3 font-medium text-[var(--color-text-muted,#94a3b8)]">{t("admin.catalog.titleLabel")}</th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-muted,#94a3b8)]">{t("admin.catalog.authorLabel")}</th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-muted,#94a3b8)]">{t("admin.catalog.typeLabel")}</th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-muted,#94a3b8)]">{t("admin.catalog.priceLabel")}</th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-muted,#94a3b8)]">{t("catalog.statusLabel")}</th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-muted,#94a3b8)]">Date</th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-muted,#94a3b8)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--color-border,#334155)] last:border-0">
                    <td className="px-4 py-3 text-[var(--color-text,#f8fafc)]">{item.title}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted,#94a3b8)]">{item.author}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted,#94a3b8)]">{typeDisplay(item.format)}</td>
                    <td className="px-4 py-3 text-[var(--color-text,#f8fafc)]">${item.price.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status ?? "live"}
                        onChange={(e) => {
                          updateCatalogStatus(item.id, e.target.value as CatalogStatus);
                          refresh();
                        }}
                        className="rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-2 py-1 text-xs text-[var(--color-text,#f8fafc)]"
                        aria-label={`Status for ${item.title}`}
                      >
                        <option value="live">{t("catalog.statusLive")}</option>
                        <option value="coming-soon">{t("catalog.statusComingSoon")}</option>
                        <option value="retired">{t("catalog.statusRetired")}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted,#94a3b8)]">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg border border-red-800/50 px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/20"
                        aria-label={`${t("admin.catalog.delete")} ${item.title}`}
                      >
                        {t("admin.catalog.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── CSV Bulk Import Component ─── */

interface CSVImportRow {
  title: string;
  creator: string;
  price: string;
  type: string;
  cover_url: string;
  content_url: string;
  quiz_mood?: string;
  quiz_format?: string;
  quiz_hook?: string;
  quiz_pace?: string;
}

interface ValidationError {
  row: number;
  message: string;
}

function parseCSV(text: string): CSVImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse a single CSV line, handling basic quoting
  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          fields.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
  const requiredHeaders = ["title", "creator", "price", "type", "cover_url", "content_url"];
  const optionalHeaders = ["quiz_mood", "quiz_format", "quiz_hook", "quiz_pace"];

  // Check all required headers are present (order independent)
  const headerSet = new Set(headers);
  const allRequired = requiredHeaders.every((h) => headerSet.has(h));
  if (!allRequired) return [];

  const rows: CSVImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length < requiredHeaders.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { if (idx < vals.length) row[h] = vals[idx]; });
    rows.push({
      title: row.title || "",
      creator: row.creator || "",
      price: row.price || "",
      type: row.type || "",
      cover_url: row.cover_url || "",
      content_url: row.content_url || "",
      quiz_mood: row.quiz_mood || undefined,
      quiz_format: row.quiz_format || undefined,
      quiz_hook: row.quiz_hook || undefined,
      quiz_pace: row.quiz_pace || undefined,
    });
  }
  return rows;
}

function CSVBulkImport({
  onImportComplete,
  showToast,
}: {
  onImportComplete: () => void;
  showToast: (msg: string) => void;
}) {
  const { t } = useLanguage();
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [validationSummary, setValidationSummary] = useState<{
    success: number;
    errors: ValidationError[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSV = useCallback(
    (text: string) => {
      const rows = parseCSV(text);
      const errors: ValidationError[] = [];
      let successCount = 0;

      // Check headers
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        errors.push({ row: 1, message: t("admin.catalog.csvErrorHeaders") });
        setValidationSummary({ success: 0, errors });
        return;
      }

      // Validate headers — must have at least the 6 required
      const firstLine = lines[0].toLowerCase();
      const requiredRegexHeaders = ["title", "creator", "price", "type", "cover_url", "content_url"];
      const hasAllHeaders = requiredRegexHeaders.every((h) => firstLine.includes(h));

      if (!hasAllHeaders) {
        errors.push({ row: 1, message: t("admin.catalog.csvErrorHeaders") });
        setValidationSummary({ success: 0, errors });
        return;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // 1-based, header is row 1
        let rowHasError = false;

        // Validate type
        const validTypes = ["PDF", "MP3", "MP4"];
        if (!validTypes.includes(row.type)) {
          errors.push({
            row: rowNum,
            message: t("admin.catalog.csvErrorType").replace("{type}", row.type),
          });
          rowHasError = true;
        }

        // Validate price
        const priceNum = parseFloat(row.price);
        if (isNaN(priceNum) || priceNum <= 0) {
          errors.push({
            row: rowNum,
            message: t("admin.catalog.csvInvalidPrice").replace("{value}", row.price),
          });
          rowHasError = true;
        }

        if (!rowHasError) {
          // Determine mapping
          let internalType: "ebook" | "audiobook" | "video";
          let internalFormat: string;
          switch (row.type) {
            case "PDF":
              internalType = "ebook";
              internalFormat = "PDF E-Book";
              break;
            case "MP3":
              internalType = "audiobook";
              internalFormat = "MP3 Audiobook";
              break;
            case "MP4":
              internalType = "video";
              internalFormat = "MP4 Video Guide";
              break;
            default:
              continue;
          }

          // Extract filename from content_url
          const contentName = row.content_url.split("/").pop() || row.content_url || "file";

          // Parse optional quiz fields — split comma-separated values
          const parseQuizTags = (val: string | undefined): string[] | undefined => {
            if (!val || val.trim() === "") return undefined;
            return val.split(",").map((s) => s.trim()).filter(Boolean);
          };

          const item = createCatalogItem({
            title: row.title || "Untitled",
            author: row.creator || "Unknown",
            price: parseFloat(row.price),
            type: internalType,
            format: internalFormat,
            description: "",
            coverImage: row.cover_url || null,
            mediaFile: { name: contentName, dataUrl: row.content_url || null },
            quizMood: parseQuizTags(row.quiz_mood),
            quizFormat: parseQuizTags(row.quiz_format),
            quizHook: parseQuizTags(row.quiz_hook),
            quizPace: parseQuizTags(row.quiz_pace),
          });

          saveCatalogItem(item);

          // Dispatch custom event matching existing pattern
          window.dispatchEvent(
            new CustomEvent("omnimeda-product-added", {
              detail: { title: item.title, price: item.price, type: item.type },
            }),
          );

          successCount++;
        }
      }

      setValidationSummary({ success: successCount, errors });

      if (successCount > 0) {
        onImportComplete();
        showToast(t("admin.catalog.csvSuccess").replace("{count}", String(successCount)));
      }
    },
    [t, onImportComplete, showToast],
  );

  const handleCsvFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv") && !file.type.includes("csv")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) processCSV(text);
      };
      reader.readAsText(file);
    },
    [processCSV],
  );

  const handleCsvDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setCsvDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleCsvFile(file);
    },
    [handleCsvFile],
  );

  const handleCsvDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setCsvDragOver(true);
  }, []);

  const handleCsvDragLeave = useCallback(() => {
    setCsvDragOver(false);
  }, []);

  const handleTemplateDownload = useCallback(() => {
    const sampleContent =
      "title,creator,price,type,cover_url,content_url,quiz_mood,quiz_format,quiz_hook,quiz_pace\n" +
      "\"The Resilient Mind\",Dr. Amara Osei,14.99,PDF,https://example.com/cover1.jpg,https://example.com/ebook1.pdf,inspiring,deep-dive,self-discovery,bite-sized\n" +
      "\"Spanish for Travelers\",Carlos Mendez,24.99,MP3,https://example.com/cover2.jpg,https://example.com/audio2.mp3,light,audio,adventure,commute\n" +
      "\"Figma Masterclass\",Elena Voss,39.99,MP4,https://example.com/cover3.jpg,https://example.com/video3.mp4,empowering,interactive,creative,course";
    const blob = new Blob([sampleContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_catalog.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="mt-8 border-t border-[var(--color-border,#334155)] pt-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--color-text,#f8fafc)]">
          {t("admin.catalog.csvImport")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted,#94a3b8)]">
          {t("admin.catalog.csvDesc")}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30 p-5">
        {/* CSV Drop Zone */}
        <div
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            csvDragOver
              ? "border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10"
              : "border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30"
          }`}
          onDrop={handleCsvDrop}
          onDragOver={handleCsvDragOver}
          onDragLeave={handleCsvDragLeave}
          role="button"
          tabIndex={0}
          aria-label={t("admin.catalog.csvDropHint")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (file) handleCsvFile(file);
            }}
            className="hidden"
            aria-hidden="true"
          />
          <svg
            className="mb-3 h-10 w-10 text-[var(--color-text-muted,#94a3b8)]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm text-[var(--color-text-muted,#94a3b8)]">
            {t("admin.catalog.csvDropHint")}
          </p>
        </div>

        {/* Template Download Link */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleTemplateDownload}
            className="text-sm font-medium text-[var(--color-primary,#6366f1)] underline underline-offset-2 transition-colors hover:text-[var(--color-primary,#6366f1)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={t("admin.catalog.csvDownload")}
          >
            {t("admin.catalog.csvDownload")}
          </button>
        </div>
      </div>

      {/* Validation Summary */}
      {validationSummary && (validationSummary.success > 0 || validationSummary.errors.length > 0) && (
        <div
          className="mt-4 rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30 p-4"
          role="status"
          aria-live="polite"
          aria-label="CSV import validation summary"
        >
          {validationSummary.success > 0 && (
            <p className="text-sm font-medium text-emerald-400">
              {t("admin.catalog.csvSuccess").replace("{count}", String(validationSummary.success))}
            </p>
          )}
          {validationSummary.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-red-400">
                {validationSummary.errors.length} error(s) found:
              </p>
              <ul className="mt-1 space-y-1">
                {validationSummary.errors.map((err, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-red-300"
                  >
                    {t("admin.catalog.csvError")
                      .replace("{row}", String(err.row))
                      .replace("{error}", err.message)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}