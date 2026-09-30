import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import type { CatalogItem } from "~/data/catalog";
import {
  getProgressForProduct,
  saveProgressEntry,
  getPacingConfig,
  savePacingConfig,
  calculateDeviation,
  getCurrentChallengeDay,
  type ProgressEntry,
  type PacingConfig,
} from "~/data/progress";

const PROGRESS_SAVE_DELAY_MS = 5000;
const PACING_SAVE_DELAY_MS = 500;

interface ProgressTrackerProps {
  product: CatalogItem;
}

export function ProgressTracker({ product }: ProgressTrackerProps) {
  const { t } = useLanguage();
  const [entry, setEntry] = useState<ProgressEntry | undefined>(undefined);
  const [pacingConfig, setPacingConfigState] = useState<PacingConfig | null>(null);
  const [dailyTarget, setDailyTarget] = useState(50);
  const [manualUnits, setManualUnits] = useState("");
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentDay = getCurrentChallengeDay(pacingConfig);
  const isEbook = product.type === "ebook";
  const isAudio = product.type === "audiobook";
  const isVideo = product.type === "video";
  const hasMedia = !!product.mediaFile?.dataUrl;

  // Latest values and save bookkeeping live in refs so the save scheduling and the
  // DOM listeners never depend on (and never re-subscribe for) React state.
  const productIdRef = useRef(product.id);
  const currentDayRef = useRef(currentDay);
  currentDayRef.current = currentDay;
  const latestEntryRef = useRef<ProgressEntry | undefined>(undefined);
  const pendingEntryRef = useRef<ProgressEntry | null>(null); // non-null = dirty
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInFlightRef = useRef<Promise<void> | null>(null);
  const latestPacingRef = useRef<PacingConfig | null>(null);
  const pendingPacingRef = useRef<PacingConfig | null>(null); // non-null = dirty
  const pacingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pacingInFlightRef = useRef<Promise<void> | null>(null);
  const progressUrgentRef = useRef(false);
  const pacingUrgentRef = useRef(false);

  // Save the pending progress entry. At most one save in flight; the last value wins.
  // `urgent` (pause, ended, Add, hide, pagehide, product change, unmount) means "save
  // now, and if newer progress lands during the save, save that immediately too".
  // A non-urgent (timer) call that finds newer progress after a save re-arms the timer.
  const runProgress = useCallback((urgent: boolean) => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (!pendingEntryRef.current) return;
    if (progressInFlightRef.current) {
      if (urgent) progressUrgentRef.current = true; // honoured when the in-flight save finishes
      return;
    }
    const snapshot = pendingEntryRef.current;
    pendingEntryRef.current = null;
    progressUrgentRef.current = false;
    const done = () => {
      progressInFlightRef.current = null;
      if (!pendingEntryRef.current) return;
      if (progressUrgentRef.current) {
        runProgress(false);
      } else if (!progressTimerRef.current) {
        progressTimerRef.current = setTimeout(() => runProgress(false), PROGRESS_SAVE_DELAY_MS);
      }
    };
    progressInFlightRef.current = saveProgressEntry(snapshot)
      .catch((err) => {
        console.error("Failed to save progress:", err);
      })
      .then(done);
  }, []);
  const flushProgress = useCallback(() => runProgress(true), [runProgress]);

  // Same rules for the pacing config (500 ms timer).
  const runPacing = useCallback((urgent: boolean) => {
    if (pacingTimerRef.current) {
      clearTimeout(pacingTimerRef.current);
      pacingTimerRef.current = null;
    }
    if (!pendingPacingRef.current) return;
    if (pacingInFlightRef.current) {
      if (urgent) pacingUrgentRef.current = true;
      return;
    }
    const snapshot = pendingPacingRef.current;
    pendingPacingRef.current = null;
    pacingUrgentRef.current = false;
    const done = () => {
      pacingInFlightRef.current = null;
      if (!pendingPacingRef.current) return;
      if (pacingUrgentRef.current) {
        runPacing(false);
      } else if (!pacingTimerRef.current) {
        pacingTimerRef.current = setTimeout(() => runPacing(false), PACING_SAVE_DELAY_MS);
      }
    };
    pacingInFlightRef.current = savePacingConfig(snapshot)
      .catch((err) => {
        console.error("Failed to save pacing config:", err);
      })
      .then(done);
  }, []);
  const flushPacing = useCallback(() => runPacing(true), [runPacing]);

  // Load the saved pacing config and progress entry (or a stub entry)
  useEffect(() => {
    let cancelled = false;
    productIdRef.current = product.id;
    (async () => {
      try {
        // A pacing save flushed by the previous product's cleanup must land before we read
        if (pacingInFlightRef.current) await pacingInFlightRef.current;
        if (cancelled) return;
        let config = await getPacingConfig();
        if (cancelled) return;
        if (config) {
          setDailyTarget(config.dailyTarget);
        } else {
          // First visit: start the challenge clock with the default target
          config = { dailyTarget: 50, dayStart: new Date().toISOString() };
          await savePacingConfig(config);
          if (cancelled) return;
        }
        latestPacingRef.current = config;
        setPacingConfigState(config);
        const existing = await getProgressForProduct(product.id);
        if (cancelled) return;
        if (existing) {
          latestEntryRef.current = existing;
          setEntry(existing);
        } else {
          // Create a stub entry (state only; it is saved once real progress happens)
          const totalUnits = isEbook ? 200 : 3600; // default 200 pages or 1 hour
          const stub: ProgressEntry = {
            productId: product.id,
            productTitle: product.title,
            format: product.type,
            totalUnits,
            completedUnits: 0,
            lastUpdated: new Date().toISOString(),
            day: getCurrentChallengeDay(config),
          };
          latestEntryRef.current = stub;
          setEntry(stub);
        }
      } catch (err) {
        console.error("Failed to load challenge progress:", err);
      }
    })();
    return () => {
      cancelled = true;
      // Product change or unmount: save what the OLD product had pending. The pending
      // entry carries its own productId, so this is correct after the prop has changed.
      flushProgress();
      flushPacing();
    };
  }, [product.id, product.title, product.type, isEbook, flushProgress, flushPacing]);

  // Best-effort flush when the tab is hidden or closed
  useEffect(() => {
    const flushAll = () => {
      flushProgress();
      flushPacing();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushAll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushAll);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushAll);
    };
  }, [flushProgress, flushPacing]);

  // Pacing slider: UI moves immediately, the save is trailing-debounced (500 ms)
  const handleTargetChange = useCallback(
    (value: number) => {
      setDailyTarget(value);
      const config: PacingConfig = {
        dailyTarget: value,
        dayStart: latestPacingRef.current?.dayStart ?? new Date().toISOString(),
      };
      latestPacingRef.current = config;
      setPacingConfigState(config);
      pendingPacingRef.current = config;
      if (pacingTimerRef.current) clearTimeout(pacingTimerRef.current);
      pacingTimerRef.current = setTimeout(() => runPacing(false), PACING_SAVE_DELAY_MS);
    },
    [runPacing],
  );

  const updateProgress = useCallback(
    (completed: number, total: number) => {
      const base = latestEntryRef.current;
      // No entry yet, or the entry still belongs to the previous product
      if (!base || base.productId !== productIdRef.current) return;
      const completedUnits = Math.min(completed, total);
      const totalUnits = Math.max(total, base.totalUnits);
      if (completedUnits === base.completedUnits && totalUnits === base.totalUnits) return;
      const updated: ProgressEntry = {
        ...base,
        completedUnits,
        totalUnits,
        lastUpdated: new Date().toISOString(),
        day: currentDayRef.current,
      };
      latestEntryRef.current = updated;
      pendingEntryRef.current = updated;
      setEntry(updated);
      if (!progressTimerRef.current) {
        progressTimerRef.current = setTimeout(() => runProgress(false), PROGRESS_SAVE_DELAY_MS);
      }
    },
    [runProgress],
  );

  // Audio/Video timeupdate
  useEffect(() => {
    if (!hasMedia || (!isAudio && !isVideo)) return;
    const el = audioRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      if (el.duration && isFinite(el.duration)) {
        updateProgress(Math.floor(el.currentTime), Math.floor(el.duration));
      }
    };
    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("pause", flushProgress);
    el.addEventListener("ended", flushProgress);
    return () => {
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("pause", flushProgress);
      el.removeEventListener("ended", flushProgress);
    };
  }, [hasMedia, isAudio, isVideo, updateProgress, flushProgress]);

  // PDF scroll tracking
  useEffect(() => {
    if (!isEbook || !scrollRef.current) return;
    const el = scrollRef.current;
    const handleScroll = () => {
      const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight);
      if (ratio > 0 && isFinite(ratio)) {
        const total = latestEntryRef.current?.totalUnits ?? 200;
        updateProgress(Math.floor(ratio * total), total);
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isEbook, updateProgress]);

  const handleManualUpdate = useCallback(() => {
    const units = parseInt(manualUnits, 10);
    if (isNaN(units) || units < 0) return;
    const base = latestEntryRef.current;
    const total = base?.totalUnits ?? 200;
    const current = base?.completedUnits ?? 0;
    updateProgress(current + units, total);
    flushProgress();
    setManualUnits("");
  }, [manualUnits, updateProgress, flushProgress]);

  const deviation = entry && pacingConfig ? calculateDeviation(entry, pacingConfig) : "on-track";

  const deviationColors: Record<string, string> = {
    ahead: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    "on-track": "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    behind: "text-red-400 bg-red-500/10 border-red-500/30",
  };

  const deviationLabels: Record<string, string> = {
    ahead: t("challenge.statusAhead"),
    "on-track": t("challenge.statusOnTrack"),
    behind: t("challenge.statusBehind"),
  };

  // Build calendar grid
  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const dayNum = i + 1;
    const hasProgress = entry && entry.day >= dayNum;
    const isComplete = entry && entry.day >= dayNum && entry.completedUnits >= entry.totalUnits;
    const isActive = activeDay === dayNum;
    return { dayNum, hasProgress: !!hasProgress, isComplete: !!isComplete, isActive };
  });

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: "var(--color-border,#334155)",
        backgroundColor: "var(--color-surface,#1e293b)/30",
      }}
    >
      {/* Day Counter with Progress Ring */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-border)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="var(--color-primary,#6366f1)"
              strokeWidth="3"
              strokeDasharray={`${(currentDay / 30) * 100} ${100 - (currentDay / 30) * 100}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-sm font-bold" style={{ color: "var(--color-text)" }}>
            {currentDay}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {t("challenge.dayCount").replace("{current}", String(currentDay)).replace("{total}", "30")}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {product.title}
          </p>
        </div>
      </div>

      {/* Pacing Slider */}
      <div className="mt-4">
        <label htmlFor="pacing-slider" className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          {t("challenge.pacingLabel")}: {dailyTarget} units/day
        </label>
        <input
          id="pacing-slider"
          type="range"
          min={1}
          max={100}
          value={dailyTarget}
          onChange={(e) => handleTargetChange(parseInt(e.target.value, 10))}
          className="mt-2 w-full"
          style={{ accentColor: "var(--color-primary,#6366f1)" }}
          aria-label={t("challenge.pacingDesc")}
        />
        <p className="mt-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          {t("challenge.pacingDesc")}
        </p>
      </div>

      {/* Deviation Badge */}
      {entry && (
        <div className="mt-3">
          <span
            className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${
              deviationColors[deviation]
            }`}
          >
            {deviationLabels[deviation]} — {entry.completedUnits}/{entry.totalUnits} units
          </span>
        </div>
      )}

      {/* Media-specific tracker */}
      {hasMedia && (isAudio || isVideo) && (
        <div className="mt-4">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
            {isAudio ? "Audio" : "Video"} playback progress
          </p>
          <audio
            ref={audioRef}
            src={product.mediaFile?.dataUrl ?? undefined}
            controls
            className="w-full"
            aria-label={`${isAudio ? "Audio" : "Video"} player for ${product.title}`}
          />
        </div>
      )}

      {isEbook && (
        <div className="mt-4">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
            Scroll to track page progress
          </p>
          <div
            ref={scrollRef}
            className="h-40 overflow-y-auto rounded-lg border p-4 text-xs leading-relaxed"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text-muted)",
            }}
            tabIndex={0}
            role="region"
            aria-label="Scrollable content area for tracking reading progress"
          >
            {Array.from({ length: 30 }, (_, i) => (
              <p key={i} className="mb-3">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Manual fallback */}
      {(!hasMedia || !isEbook) && (
        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="manual-units" className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Manual progress (units)
            </label>
            <input
              id="manual-units"
              type="number"
              min={0}
              value={manualUnits}
              onChange={(e) => setManualUnits(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                borderColor: "var(--color-border)",
              }}
              placeholder="Enter units completed"
            />
          </div>
          <button
            type="button"
            onClick={handleManualUpdate}
            disabled={!manualUnits}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            Add
          </button>
        </div>
      )}

      {!hasMedia && !isEbook && (
        <p className="mt-2 text-xs italic" style={{ color: "var(--color-text-muted)" }}>
          No media file available for auto-tracking. Use manual entry above.
        </p>
      )}

      {/* 30-Day Calendar */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          30-Day Calendar
        </p>
        <div className="grid grid-cols-10 gap-1.5" role="grid" aria-label="30-day reading calendar">
          {calendarDays.map((d) => (
            <button
              key={d.dayNum}
              type="button"
              onClick={() => setActiveDay(d.isActive ? null : d.dayNum)}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium transition-all ${
                d.isComplete
                  ? "bg-[var(--color-primary,#6366f1)] text-white"
                  : d.hasProgress
                  ? "border-2 border-[var(--color-primary,#6366f1)] text-[var(--color-primary,#6366f1)]"
                  : "border border-[var(--color-border,#334155)] text-[var(--color-text-muted,#94a3b8)]"
              } ${d.isActive ? "ring-2 ring-offset-1 ring-[var(--color-primary,#6366f1)]" : ""}`}
              style={d.isActive ? ({ "--tw-ring-color": "var(--color-primary)" } as React.CSSProperties) : undefined}
              aria-label={`Day ${d.dayNum}${d.isComplete ? " — completed" : d.hasProgress ? " — in progress" : " — no progress"}`}
            >
              {d.dayNum}
            </button>
          ))}
        </div>
        {activeDay && entry && (
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            Day {activeDay}: {entry.day >= activeDay ? `${entry.completedUnits}/${entry.totalUnits} units` : "No progress"}
          </p>
        )}
      </div>
    </div>
  );
}