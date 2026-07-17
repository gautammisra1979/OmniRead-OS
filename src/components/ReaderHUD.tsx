import { useState, useCallback, useEffect, useRef } from "react";
import { useLanguage } from "~/components/LanguageProvider";

type ReaderTheme = "day" | "night" | "sepia";

interface ReaderHUDProps {
  title: string;
  author: string;
  content?: string;
  onClose: () => void;
  productId: string;
}

export function ReaderHUD({ title, author, content, onClose, productId }: ReaderHUDProps) {
  const { t } = useLanguage();
  const [theme, setTheme] = useState<ReaderTheme>("day");
  const [fontSize, setFontSize] = useState(18);
  const [showHud, setShowHud] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(50);
  const hudTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Theme colors
  const themeStyles: Record<ReaderTheme, React.CSSProperties> = {
    day: { backgroundColor: "#f8fafc", color: "#1e293b" },
    night: { backgroundColor: "#0f172a", color: "#e2e8f0" },
    sepia: { backgroundColor: "#f5e6c8", color: "#3e2c1a" },
  };

  const currentTheme = themeStyles[theme];

  // Auto-hide HUD on idle
  const resetHudTimer = useCallback(() => {
    setShowHud(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShowHud(false), 3000);
  }, []);

  useEffect(() => {
    resetHudTimer();
    return () => {
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    };
  }, [resetHudTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      resetHudTimer();
      if (e.key === "Escape") {
        if (showSidebar) setShowSidebar(false);
        else onClose();
      }
      if (e.key === "f" || e.key === "F") toggleFullscreen();
      if (e.key === "t" || e.key === "T") cycleTheme();
      if (e.key === "ArrowRight") setCurrentPage((p) => Math.min(p + 1, totalPages));
      if (e.key === "ArrowLeft") setCurrentPage((p) => Math.max(p - 1, 1));
      if (e.key === "b" || e.key === "B") setShowSidebar((s) => !s);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, showSidebar, resetHudTimer, totalPages]);

  // Touch swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) setCurrentPage((p) => Math.min(p + 1, totalPages));
      else setCurrentPage((p) => Math.max(p - 1, 1));
    }
    resetHudTimer();
  }, [touchStartX, touchStartY, totalPages, resetHudTimer]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const themes: ReaderTheme[] = ["day", "night", "sepia"];
      return themes[(themes.indexOf(prev) + 1) % themes.length];
    });
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ ...currentTheme, transition: "background-color 0.3s, color 0.3s" }}
      onMouseMove={resetHudTimer}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="application"
      aria-label={`Reader: ${title} by ${author}`}
    >
      {/* Top HUD Bar */}
      <div
        className={`flex items-center justify-between border-b px-4 py-2 transition-opacity duration-300 ${
          showHud ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ borderColor: "color-mix(in srgb, currentColor 20%, transparent)" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:opacity-70"
            aria-label={t("reader.close") ?? "Close Reader"}
            style={{ color: "currentColor" }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight truncate max-w-[200px]">{title}</span>
            <span className="text-[11px] opacity-60">{author}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={cycleTheme}
            className="rounded-lg p-2 text-xs transition-colors hover:opacity-70"
            style={{ color: "currentColor" }}
            aria-label={`${t("reader.themeDay") ?? "Theme"}: ${theme}`}
            title={`Theme: ${theme}`}
          >
            {theme === "day" ? "☀️" : theme === "night" ? "🌙" : "🟤"}
          </button>

          {/* Font size slider */}
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-[10px] opacity-60">A</span>
            <input
              type="range"
              min={12}
              max={32}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-20 h-1 cursor-pointer"
              aria-label={t("reader.fontSize") ?? "Font Size"}
            />
            <span className="text-sm opacity-60">A</span>
          </div>

          {/* Librarian toggle */}
          <button
            type="button"
            onClick={() => setShowSidebar((s) => !s)}
            className="rounded-lg p-2 text-xs transition-colors hover:opacity-70"
            style={{ color: "currentColor" }}
            aria-label={t("reader.librarian") ?? "Ask Librarian"}
          >
            📚
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-xs transition-colors hover:opacity-70"
            style={{ color: "currentColor" }}
            aria-label={t("reader.fullscreen") ?? "Fullscreen"}
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Main reading area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 lg:px-20 xl:px-32"
          onClick={resetHudTimer}
          style={{ fontSize: `${fontSize}px`, lineHeight: "1.8" }}
        >
          {content ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              <h1 className="text-3xl font-bold" style={{ color: "currentColor" }}>{title}</h1>
              <p className="opacity-70" style={{ fontSize: `${fontSize * 0.85}px` }}>by {author}</p>
              <hr className="opacity-20" />
              {/* Sample content */}
              <p>Chapter 1</p>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
              <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
              <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
              <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.</p>
              <p>Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.</p>
            </div>
          )}
        </div>

        {/* Librarian sidebar */}
        {showSidebar && (
          <div
            className="w-72 flex-shrink-0 border-l p-4 overflow-y-auto"
            style={{ borderColor: "color-mix(in srgb, currentColor 20%, transparent)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{t("reader.librarian") ?? "Ask Librarian"}</h3>
              <button
                type="button"
                onClick={() => setShowSidebar(false)}
                className="p-1 rounded hover:opacity-70"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>
            {/* Librarian chat placeholder */}
            <div className="rounded-lg border p-3 mb-3 text-xs opacity-70" style={{ borderColor: "color-mix(in srgb, currentColor 20%, transparent)" }}>
              <p className="font-semibold mb-1">📚 Librarian</p>
              <p>Ask me about this book for insights, summaries, and discussion questions.</p>
            </div>
            <input
              type="text"
              placeholder={t("chat.inputPlaceholder") ?? "Ask the Librarian..."}
              className="w-full rounded-lg border px-3 py-2 text-xs"
              style={{
                backgroundColor: "transparent",
                color: "currentColor",
                borderColor: "color-mix(in srgb, currentColor 20%, transparent)",
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom HUD progress bar */}
      <div
        className={`flex items-center justify-between border-t px-4 py-2 transition-opacity duration-300 ${
          showHud ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ borderColor: "color-mix(in srgb, currentColor 20%, transparent)" }}
      >
        <div className="flex items-center gap-2 text-xs opacity-60">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="p-1 rounded hover:opacity-70"
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            ◀
          </button>
          <span>{t("reader.progress")?.replace("{current}", String(currentPage)).replace("{total}", String(totalPages)) ?? `${currentPage} / ${totalPages}`}</span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="p-1 rounded hover:opacity-70"
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            ▶
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex-1 mx-4 h-1 rounded-full" style={{ backgroundColor: "color-mix(in srgb, currentColor 15%, transparent)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(currentPage / totalPages) * 100}%`, backgroundColor: "currentColor" }}
          />
        </div>

        <div className="flex items-center gap-2 text-xs opacity-60">
          <span>{fontSize}px</span>
          <span className="capitalize">{theme}</span>
        </div>
      </div>

      {/* Tap to reveal hint on mobile */}
      {!showHud && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs opacity-30 animate-pulse">Tap to reveal controls</span>
        </div>
      )}
    </div>
  );
}