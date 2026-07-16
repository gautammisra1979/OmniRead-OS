import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { type CatalogItem } from "~/data/catalog";
import { getMediaProgress, saveMediaProgress } from "~/data/mediaProgress";
import { generateVTTBlobUrl, parseVTTToCues, generateSampleVTT, type VTTCue } from "~/data/webvtt";

interface MediaPlayerProps {
  product: CatalogItem;
}

const SAMPLE_VIDEO = "https://www.w3schools.com/html/mov_bbb.mp4";
const SAMPLE_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export function MediaPlayer({ product }: MediaPlayerProps) {
  const { t } = useLanguage();
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vttUrl, setVttUrl] = useState("");
  const [cues, setCues] = useState<VTTCue[]>([]);
  const [activeCueIdx, setActiveCueIdx] = useState(-1);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Skip ebooks
  if (product.type === "ebook") return null;

  const isVideo = product.type === "video";
  const mediaUrl = product.mediaFile?.dataUrl || (isVideo ? SAMPLE_VIDEO : SAMPLE_AUDIO);

  // Load VTT
  useEffect(() => {
    const url = generateVTTBlobUrl();
    setVttUrl(url);
    const rawVtt = generateSampleVTT();
    setCues(parseVTTToCues(rawVtt));
    return () => URL.revokeObjectURL(url);
  }, []);

  // Restore playback position
  useEffect(() => {
    if (!mediaRef.current) return;
    const saved = getMediaProgress(product.id);
    if (saved > 0 && mediaRef.current) {
      mediaRef.current.currentTime = saved;
    }
  }, [product.id, vttUrl]);

  // Timeupdate handler
  const handleTimeUpdate = useCallback(() => {
    if (!mediaRef.current) return;
    const ct = mediaRef.current.currentTime;
    const dur = mediaRef.current.duration || 0;
    setCurrentTime(ct);
    setDuration(dur);

    // Debounced save every 5 seconds
    if (!saveTimerRef.current) {
      saveTimerRef.current = setTimeout(() => {
        saveMediaProgress(product.id, ct, dur);
        saveTimerRef.current = null;
      }, 5000);
    }

    // Update active cue
    const idx = cues.findIndex((c) => ct >= c.start && ct < c.end);
    setActiveCueIdx(idx);
  }, [product.id, cues]);

  const handleLoadedMetadata = useCallback(() => {
    if (!mediaRef.current) return;
    setDuration(mediaRef.current.duration || 0);
  }, []);

  const handleCueClick = useCallback((cue: VTTCue) => {
    if (!mediaRef.current) return;
    mediaRef.current.currentTime = cue.start;
    mediaRef.current.play();
    // Scroll cue into view
    if (transcriptRef.current) {
      const cueEl = transcriptRef.current.querySelector(`[data-cue-start="${cue.start}"]`);
      if (cueEl) cueEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const activeCue = activeCueIdx >= 0 ? cues[activeCueIdx] : null;

  return (
    <figure
      aria-label={isVideo ? t("media.videoLabel").replace("{title}", product.title) : t("media.audioLabel").replace("{title}", product.title)}
      className="mt-4 overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
      onContextMenu={handleContextMenu}
    >
      {/* Player */}
      <div className="relative bg-black/40">
        {isVideo ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={mediaUrl}
            className="w-full max-h-64 object-contain"
            controls
            aria-label={t("media.videoLabel").replace("{title}", product.title)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            preload="metadata"
          >
            {vttUrl && (
              <track kind="captions" src={vttUrl} srcLang="en" label="English" default />
            )}
          </video>
        ) : (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={mediaUrl}
            className="w-full"
            controls
            aria-label={t("media.audioLabel").replace("{title}", product.title)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            preload="metadata"
          >
            {vttUrl && (
              <track kind="captions" src={vttUrl} srcLang="en" label="English" default />
            )}
          </audio>
        )}
      </div>

      {/* Progress restored notice */}
      {getMediaProgress(product.id) > 0 && (
        <div className="px-4 py-2 text-xs" style={{ backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)", color: "var(--color-primary,#6366f1)" }}>
          {t("media.progressRestored").replace("{time}", formatTime(getMediaProgress(product.id)))}
        </div>
      )}

      {/* No media placeholder */}
      {!product.mediaFile?.dataUrl && (
        <div className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)", backgroundColor: "color-mix(in srgb, #fbbf24 10%, transparent)" }}>
          {t("media.noMedia")}
        </div>
      )}

      {/* Interactive Transcript */}
      <div className="border-t" style={{ borderColor: "var(--color-border,#334155)" }}>
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors hover:opacity-80"
          style={{ color: "var(--color-text,#f8fafc)" }}
          onClick={() => {
            const el = transcriptRef.current;
            if (el) el.style.display = el.style.display === "none" ? "block" : "none";
          }}
          aria-expanded={true}
          aria-label={t("media.transcript")}
        >
          <span>{t("media.transcript")}</span>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <div
          ref={transcriptRef}
          className="max-h-48 overflow-y-auto px-4 pb-3"
          role="list"
          aria-label={t("media.transcript")}
        >
          {cues.length === 0 ? (
            <p className="py-3 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("media.noTranscript")}
            </p>
          ) : (
            <div className="space-y-1">
              {cues.map((cue, idx) => (
                <button
                  key={idx}
                  type="button"
                  data-cue-start={cue.start}
                  onClick={() => handleCueClick(cue)}
                  className={`w-full text-left rounded px-2 py-1.5 text-xs transition-colors ${
                    idx === activeCueIdx ? "font-semibold" : ""
                  }`}
                  style={{
                    backgroundColor: idx === activeCueIdx ? "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)" : "transparent",
                    color: idx === activeCueIdx ? "var(--color-primary,#6366f1)" : "var(--color-text,#f8fafc)",
                  }}
                  aria-label={t("media.jumpTo").replace("{time}", formatTime(cue.start))}
                >
                  <span className="mr-2 text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                    {formatTime(cue.start)}
                  </span>
                  {cue.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeCue && (
        <div
          className="border-t px-4 py-2 text-xs font-medium text-center"
          style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-primary,#6366f1)", backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 8%, transparent)" }}
          aria-live="polite"
        >
          {activeCue.text}
        </div>
      )}
    </figure>
  );
}