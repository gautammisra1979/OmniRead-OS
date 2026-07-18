import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Visual-language pass helpers — slow fade in/out for popups & overlays,
// a slower "swipe-like" scroll to section anchors, and a scroll-reveal
// fade-in for shelves. (Site Review 2, points 2/2a, 4a, 6, 11.)
// ---------------------------------------------------------------------------

/** Keeps a conditionally-shown overlay mounted long enough to fade out
 *  before it's removed from the DOM, instead of vanishing instantly. */
function useFadeMount(open: boolean, duration = 320) {
  const [mounted, setMounted] = useState(open);
  const [show, setShow] = useState(open);

  useEffect(() => {
    let raf = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      setMounted(true);
      raf = requestAnimationFrame(() => setShow(true));
    } else {
      setShow(false);
      timeout = setTimeout(() => setMounted(false), duration);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (timeout) clearTimeout(timeout);
    };
  }, [open, duration]);

  return { mounted, show };
}

/** Slower, deliberate scroll to a section — reads more like a page swipe
 *  than the browser's default (fast) smooth-scroll. */
function slowScrollTo(id: string, duration = 900) {
  const el = document.getElementById(id);
  if (!el) return;
  const startY = window.scrollY;
  const targetY = el.getBoundingClientRect().top + window.scrollY - 24;
  const distance = targetY - startY;
  const start = performance.now();

  const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out cubic

  function step(now: number) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    window.scrollTo(0, startY + distance * ease(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Fades + slides a section in the first time it scrolls into view. */
function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}

/* ============================================================================
 * EvaluationScaffold — Demo Mode
 *
 * This is the "first look" experience shown when storeOperationalStatus
 * is "demo" (see LayoutMatrix.tsx). It is intentionally standalone: it does
 * NOT read BrandingProvider / catalog / theme state, because that state is
 * empty until an owner configures their store (this is what broke the
 * layout previously — see Site Review 1, Step 2).
 *
 * It implements the visual + structural spec from the "Step 25" prompt
 * (Storefront Style Customizer, Header/Announcements, Mega-menus, Hero,
 * Shelves, Kindle-style Product/Reader experience) using a sample bookstore
 * ("The Reading Room") so evaluators see a real storefront, not engine
 * jargon. Style + typography presets below use the exact values from the
 * Step 25 prompt — when the real Style Customizer is built, these constants
 * can be copied directly into src/data/stylePresets.ts.
 * ========================================================================*/

// ---------------------------------------------------------------------------
// Style + typography presets (exact Step 25 values)
// ---------------------------------------------------------------------------

type StylePresetId = "classicRetro" | "modernElegant" | "kindlePaperwhite";
type TypographyPresetId = "literary" | "kindleStandard" | "tech";

const STYLE_PRESETS: Record<
  StylePresetId,
  { name: string; bg: string; card: string; radius: string; iconTone: string }
> = {
  classicRetro: {
    name: "Classic Retro",
    bg: "bg-white",
    card: "bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
    radius: "rounded-none",
    iconTone: "text-black",
  },
  modernElegant: {
    name: "Modern Elegant",
    bg: "bg-white",
    card: "bg-white border border-neutral-200 shadow-md shadow-neutral-100/80",
    radius: "rounded-xl",
    iconTone: "text-neutral-800",
  },
  kindlePaperwhite: {
    name: "Kindle Paperwhite",
    bg: "bg-[#fdfdfd]",
    card: "bg-[#fdfdfd] border border-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.07)]",
    radius: "rounded-2xl",
    iconTone: "text-neutral-900",
  },
};

const TYPOGRAPHY_PRESETS: Record<
  TypographyPresetId,
  { name: string; heading: string; body: string }
> = {
  literary: {
    name: "Traditional Literary",
    heading: "'Playfair Display', Georgia, serif",
    body: "Georgia, 'Times New Roman', serif",
  },
  kindleStandard: {
    name: "Kindle Standard",
    heading: "'Merriweather', Georgia, serif",
    body: "'Bookerly', Georgia, 'Baskerville', serif",
  },
  tech: {
    name: "Contemporary Tech",
    heading: "'Inter', -apple-system, sans-serif",
    body: "'Lora', Georgia, serif",
  },
};

// ---------------------------------------------------------------------------
// Mock content (sample storefront — deliberately not the engine's own brand)
// ---------------------------------------------------------------------------

const STORE_NAME = "The Reading Room";
const STORE_INITIALS = "TRR"; // matches ^[A-Z0-9&+-/]{0,4}$
const STORE_SUBTEXT = "Digital+Hardcover";

const ANNOUNCEMENTS = [
  "Free digital delivery on every order, every day.",
  "New: The Librarian now recommends read-alikes for every title.",
  "Join membership and stream unlimited audiobooks this month.",
];

const HERO_SLIDES = [
  {
    eyebrow: "New Arrivals",
    heading: "Stories worth staying up for",
    sub: "Thousands of e-books, audiobooks, and video courses — curated, not algorithmic.",
    cta: "Browse Products",
    secondaryCta: "Watch Demo",
  },
  {
    eyebrow: "Membership",
    heading: "Ask the Librarian anything",
    sub: "Your reading companion knows every title in the catalog — plot questions, read-alikes, spoiler-free recaps.",
    cta: "Subscribe to access the Librarian",
    secondaryCta: "Learn more",
  },
  {
    eyebrow: "30-Day Challenge",
    heading: "Build a reading habit that sticks",
    sub: "Daily pacing, streaks, and a shelf of rewards waiting at the finish line.",
    cta: "Start the Challenge",
    secondaryCta: "See how it works",
  },
];

const FORMATS = ["E-Book", "Audio", "Video"] as const;

type MockBook = {
  id: string;
  title: string;
  author: string;
  format: (typeof FORMATS)[number];
  price: string;
  rating: number;
  ratingCount: number;
};

function makeBooks(seed: string, n: number): MockBook[] {
  const titles = [
    "The Quiet Harbor",
    "Where the Ferns Grow",
    "A Longer Kind of Light",
    "Salt & Marrow",
    "The Cartographer's Wife",
    "Midnight in the Stacks",
    "Between Two Winters",
    "The Last Lighthouse Keeper",
    "Paper Moons",
    "The Weight of Small Things",
  ];
  const authors = ["Elena Marchetti", "R. J. Okafor", "Ines Bergman", "Thomas O Riain", "Priya Nandakumar"];
  return Array.from({ length: n }).map((_, i) => ({
    id: `${seed}-${i}`,
    title: titles[(i + seed.length) % titles.length],
    author: authors[(i * 3 + seed.length) % authors.length],
    format: FORMATS[i % FORMATS.length],
    price: (9.99 + ((i * 3) % 5) * 2).toFixed(2),
    rating: 4 + (i % 2 === 0 ? 0.5 : 0),
    ratingCount: 40 + i * 17,
  }));
}

const SHELVES: { id: string; label: string; books: MockBook[] }[] = [
  { id: "bestsellers", label: "Bestsellers", books: makeBooks("best", 6) },
  { id: "recommended", label: "Recommended", books: makeBooks("rec", 6) },
  { id: "latest", label: "Latest Arrivals", books: makeBooks("latest", 6) },
  { id: "coming-soon", label: "Coming Soon", books: makeBooks("soon", 4) },
];

const MEGA_MENU: Record<"books" | "audio" | "video", { columns: { heading: string; items: string[] }[] }> = {
  books: {
    columns: [
      { heading: "Genre", items: ["Fiction", "Mystery & Thriller", "Romance", "Sci-Fi & Fantasy", "Biography"] },
      { heading: "Format", items: ["E-Book", "Hardcover", "E-Book + Hardcover"] },
      { heading: "Collections", items: ["Staff Picks", "Award Winners", "Book Club Picks"] },
    ],
  },
  audio: {
    columns: [
      { heading: "Genre", items: ["Fiction", "True Crime", "Memoir", "Self-Development"] },
      { heading: "Length", items: ["Under 5 hours", "5-10 hours", "10+ hours"] },
      { heading: "Collections", items: ["Narrated by the Author", "Full Cast"] },
    ],
  },
  video: {
    columns: [
      { heading: "Subject", items: ["Writing Craft", "History", "Language Learning", "Author Talks"] },
      { heading: "Length", items: ["Short Course", "Full Masterclass"] },
      { heading: "Collections", items: ["New This Month", "Most Watched"] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Inline B&W line icons (no icon library is installed in this project)
// ---------------------------------------------------------------------------

function Icon({
  path,
  className = "w-5 h-5",
  strokeWidth = 1.6,
}: {
  path: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  search: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm10.5 3-5.4-5.4",
  cart: "M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20.5 8H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  gear: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 12a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.4 3H9.6l-.5 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.5 2.6h4.8l.5-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z",
  glasses: "M3 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm12 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM9 12h6M3 12c0-2.5.8-5 2-6M21 12c0-2.5-.8-5-2-6",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.2-12.2-2 5-5 2 2-5 5-2Z",
  flag: "M5 21V4m0 0h11l-2.2 3L16 10H5",
  caretLeft: "m15 6-6 6 6 6",
  caretRight: "m9 6 6 6-6 6",
  close: "M6 6l12 12M18 6 6 18",
  flip: "M4 12a8 8 0 0 1 14.2-5M20 12a8 8 0 0 1-14.2 5M17 4v4h-4M7 20v-4h4",
  sun: "M12 4v2m0 12v2m8-8h-2M6 12H4m12.9-6.9-1.4 1.4M6.5 17.5l-1.4 1.4m0-13.8 1.4 1.4M17.5 17.5l1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  moon: "M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z",
  sepia: "M4 4h16v16H4z M8 8h8v8H8z",
  star: "m12 3 2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3 1.4-6.3-4.8-4.3 6.4-.6L12 3Z",
  chevronDown: "m6 9 6 6 6-6",
  hamburger: "M4 7h16M4 12h16M4 17h16",
};

// ---------------------------------------------------------------------------
// Small shared UI pieces
// ---------------------------------------------------------------------------

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-black" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} path={ICONS.star} className="w-3 h-3" strokeWidth={i < Math.round(rating) ? 0 : 1.4} />
      ))}
    </div>
  );
}

function RevealSection({
  id,
  ariaLabel,
  children,
}: {
  id: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const { ref, revealed } = useScrollReveal<HTMLElement>();
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      ref={ref}
      className={`transition-all duration-700 ease-out ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      {children}
    </section>
  );
}

export function EvaluationScaffold() {
  // --- Demo/eval controls (not a real storefront feature — lets a reviewer
  // preview how Step 25's Style Customizer will reskin the whole page) ---
  const [stylePreset, setStylePreset] = useState<StylePresetId>("kindlePaperwhite");
  const [typography, setTypography] = useState<TypographyPresetId>("kindleStandard");
  const [controlsOpen, setControlsOpen] = useState(false);

  const style = STYLE_PRESETS[stylePreset];
  const type = TYPOGRAPHY_PRESETS[typography];

  // --- Generic "not wired up yet" modal, used by anything that needs a
  // real backend/data layer (checkout, sign in, membership, etc.) ---
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);
  const infoModalFade = useFadeMount(infoModal !== null);
  const [displayedInfoModal, setDisplayedInfoModal] = useState<{ title: string; body: string } | null>(null);
  useEffect(() => {
    if (infoModal) setDisplayedInfoModal(infoModal);
  }, [infoModal]);

  // --- Announcement bar ---
  const [announceIdx, setAnnounceIdx] = useState(0);

  // --- Header / mega menu ---
  const [megaOpen, setMegaOpen] = useState<null | "books" | "audio" | "video">(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const megaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMega = (menu: "books" | "audio" | "video") => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
    setMegaOpen(menu);
  };
  const closeMegaSoon = () => {
    megaTimeout.current = setTimeout(() => setMegaOpen(null), 150);
  };

  // --- Hero carousel ---
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  // --- Product overlay (Kindle-style order page) ---
  const [activeBook, setActiveBook] = useState<MockBook | null>(null);
  const [coverFlipped, setCoverFlipped] = useState(false);
  const productOverlayFade = useFadeMount(activeBook !== null);
  const [displayedBook, setDisplayedBook] = useState<MockBook | null>(null);
  useEffect(() => {
    if (activeBook) setDisplayedBook(activeBook);
  }, [activeBook]);

  // --- Immersive reader HUD ---
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerTheme, setReaderTheme] = useState<"day" | "night" | "sepia">("day");
  const [hudVisible, setHudVisible] = useState(true);
  const [librarianOpen, setLibrarianOpen] = useState(false);
  const librarianFade = useFadeMount(librarianOpen);
  const hudIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHudIdleTimer = useCallback(() => {
    if (hudIdleTimer.current) clearTimeout(hudIdleTimer.current);
    hudIdleTimer.current = setTimeout(() => setHudVisible(false), 5000);
  }, []);

  useEffect(() => {
    if (readerOpen && hudVisible) resetHudIdleTimer();
    return () => {
      if (hudIdleTimer.current) clearTimeout(hudIdleTimer.current);
    };
  }, [readerOpen, hudVisible, resetHudIdleTimer]);

  const openReader = (book: MockBook) => {
    setActiveBook(book);
    setReaderOpen(true);
    setHudVisible(true);
  };

  const showComingSoon = (title: string, body: string) => setInfoModal({ title, body });

  const readerThemeClasses =
    readerTheme === "day"
      ? "bg-white text-black"
      : readerTheme === "night"
        ? "bg-[#1b1b1b] text-[#d8d8d8]"
        : "bg-[#f4ecd8] text-[#5b4636]";

  return (
    <div
      className={`w-full min-h-screen flex flex-col antialiased selection:bg-black selection:text-white ${style.bg} text-black`}
      style={{ fontFamily: type.body }}
    >
      {/* Google Fonts for the three Step 25 typography pairings (falls back
          to system Georgia/Inter serif/sans-serif stacks if offline). */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Merriweather:wght@400;700&family=Inter:wght@400;600;700&family=Lora:ital@0;1&display=swap');
        .demo-heading { font-family: ${type.heading}; }
      `}</style>

      {/* Kindle-device frame: a thin margined border running the height of
          the screen, giving the page the feel of a device bezel. Desktop /
          tablet only — on mobile the phone itself is the frame, so this is
          reserved for the Reader HUD instead (see below). */}
      <div
        aria-hidden="true"
        className="hidden md:block fixed inset-3 lg:inset-4 rounded-2xl border border-black/15 pointer-events-none z-30"
      />

      {/* ================= 1. TOP ANNOUNCEMENT BAR ================= */}
      <div className="w-full bg-black text-white text-xs sm:text-sm select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-9 flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-black tracking-widest border border-white/40 px-1.5 py-0.5">{STORE_INITIALS}</span>
            {STORE_SUBTEXT && <span className="hidden sm:inline opacity-80">{STORE_SUBTEXT}</span>}
          </div>
          <button
            type="button"
            aria-label="Previous announcement"
            onClick={() => setAnnounceIdx((i) => (i - 1 + ANNOUNCEMENTS.length) % ANNOUNCEMENTS.length)}
            className="p-1 hover:opacity-70 cursor-pointer"
          >
            <Icon path={ICONS.caretLeft} className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 min-w-0 text-center truncate">{ANNOUNCEMENTS[announceIdx]}</div>
          <button
            type="button"
            aria-label="Next announcement"
            onClick={() => setAnnounceIdx((i) => (i + 1) % ANNOUNCEMENTS.length)}
            className="p-1 hover:opacity-70 cursor-pointer"
          >
            <Icon path={ICONS.caretRight} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ================= 2. HEADER ================= */}
      <header className="w-full border-b border-black sticky top-0 z-40 bg-inherit">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          {/* Utility row: feature links (left) + account links (right) */}
          <div className="flex items-center justify-between h-11 text-xs sm:text-sm border-b border-black/10">
            <nav className="hidden md:flex items-center gap-5 font-semibold" aria-label="Store features">
              <button
                type="button"
                onClick={() =>
                  showComingSoon(
                    "Concierge",
                    "A free diagnostic quiz the store owner provides — helps a reader find their next book in four questions. Available with membership or as an individual buy per title. Sign in, sign up, or view membership options to continue.",
                  )
                }
                className="flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Icon path={ICONS.compass} className="w-4 h-4" /> Concierge
              </button>
              <button
                type="button"
                onClick={() =>
                  showComingSoon(
                    "The Challenge",
                    "A 30-day guided reading companion with daily pacing and streaks. Available with membership or as an individual buy. Sign in, sign up, or view membership options to continue.",
                  )
                }
                className="flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Icon path={ICONS.flag} className="w-4 h-4" /> The Challenge
              </button>
              <button
                type="button"
                onClick={() =>
                  showComingSoon(
                    "Librarian",
                    "Your AI reading companion — ask about plot, characters, or get a spoiler-free recap. Available with membership or as an individual buy per title. Sign in, sign up, or view membership options to continue.",
                  )
                }
                className="flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Icon path={ICONS.glasses} className="w-4 h-4" /> Librarian
              </button>
            </nav>

            <button
              type="button"
              className="md:hidden p-1 cursor-pointer"
              aria-label="Open menu"
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              <Icon path={ICONS.hamburger} className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 font-semibold">
              <button
                type="button"
                onClick={() => showComingSoon("Join Membership", "Choose a monthly plan for unlimited streaming across e-books, audio, and video.")}
                className="hidden sm:inline hover:underline cursor-pointer"
              >
                Join Membership
              </button>
              <button
                type="button"
                onClick={() => showComingSoon("Sign In", "Sign in with the email on file — the same login routes individual readers, affiliates, and the store owner to the right dashboard.")}
                className="hover:underline cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                aria-label="Cart"
                onClick={() => showComingSoon("Cart", "Review items before checkout. Physical Hardcover formats will calculate shipping automatically.")}
                className="p-1.5 hover:opacity-70 cursor-pointer relative"
              >
                <Icon path={ICONS.cart} className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Account settings"
                onClick={() =>
                  showComingSoon(
                    "Settings",
                    "Login, sign up, membership, order history, progress, dashboard, affiliates, store owner tools, and FAQ all live in one User Control Center.",
                  )
                }
                className="p-1.5 hover:opacity-70 cursor-pointer"
              >
                <Icon path={ICONS.gear} className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Store identity row */}
          <div className="h-16 flex items-center justify-center">
            <span className="demo-heading text-2xl sm:text-3xl font-bold tracking-tight">{STORE_NAME}</span>
          </div>

          {/* ================= 3. ASSETS MENU ================= */}
          <nav
            className="hidden md:flex items-center gap-6 h-11 text-sm font-semibold border-t border-black/10"
            aria-label="Browse"
          >
            <a href="#bestsellers" onClick={(e) => { e.preventDefault(); slowScrollTo("bestsellers"); }} className="hover:underline">Bestsellers</a>
            <a href="#recommended" onClick={(e) => { e.preventDefault(); slowScrollTo("recommended"); }} className="hover:underline">Recommended</a>
            <a href="#latest" onClick={(e) => { e.preventDefault(); slowScrollTo("latest"); }} className="hover:underline">Latest</a>
            <a href="#coming-soon" onClick={(e) => { e.preventDefault(); slowScrollTo("coming-soon"); }} className="hover:underline">Coming Soon</a>

            {(["books", "audio", "video"] as const).map((menu) => (
              <div
                key={menu}
                className="relative h-full flex items-center"
                onMouseEnter={() => openMega(menu)}
                onMouseLeave={closeMegaSoon}
              >
                <button type="button" className="flex items-center gap-1 hover:underline cursor-pointer capitalize">
                  {menu} <Icon path={ICONS.chevronDown} className="w-3.5 h-3.5" />
                </button>
                <div
                  aria-hidden={megaOpen !== menu}
                  className={`absolute left-1/2 -translate-x-1/2 top-full w-[560px] p-6 grid grid-cols-3 gap-6 z-50 transition-all duration-300 ${style.card} ${style.radius} ${
                    megaOpen === menu
                      ? "mt-2 opacity-100 pointer-events-auto"
                      : "mt-0 opacity-0 pointer-events-none"
                  }`}
                  onMouseEnter={() => openMega(menu)}
                  onMouseLeave={closeMegaSoon}
                >
                  {MEGA_MENU[menu].columns.map((col) => (
                    <div key={col.heading}>
                      <p className="text-xs uppercase tracking-wider font-bold opacity-60 mb-2">{col.heading}</p>
                      <ul className="space-y-1.5 text-sm">
                        {col.items.map((item) => (
                          <li key={item}>
                            <button
                              type="button"
                              tabIndex={megaOpen === menu ? 0 : -1}
                              onClick={() => showComingSoon(item, `Filtered ${menu} results for "${item}" will render here once the catalog data layer is connected.`)}
                              className="hover:underline cursor-pointer text-left"
                            >
                              {item}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => showComingSoon("My Library", "A progress meter and shelf of everything you own, plus a dashboard tab for stats.")}
              className="hover:underline cursor-pointer"
            >
              My Library
            </button>

            <div className="ml-auto flex items-center gap-2 max-w-xs w-full">
              <Icon path={ICONS.search} className="w-4 h-4 opacity-60" />
              <input
                type="text"
                placeholder="Search titles, authors..."
                className="w-full bg-transparent border-b border-black/30 focus:border-black outline-none py-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") showComingSoon("Search", "Full-catalog search will render results here once connected to the data layer.");
                }}
              />
            </div>
          </nav>

          {mobileNavOpen && (
            <nav className="md:hidden flex flex-col gap-3 py-4 border-t border-black/10 text-sm font-semibold" aria-label="Browse (mobile)">
              {["Bestsellers", "Recommended", "Latest", "Coming Soon", "Books", "Audio", "Video", "My Library", "Concierge", "The Challenge", "Librarian"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => showComingSoon(label, "This section will filter or open once connected to real store data.")}
                  className="text-left hover:underline cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* ================= 4. HERO (3-page carousel) ================= */}
      <section className="w-full border-b border-black/10 relative overflow-hidden" aria-label="Featured">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-20 text-center">
          <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-60 mb-3">{HERO_SLIDES[heroIdx].eyebrow}</p>
          <h1 className="demo-heading text-3xl sm:text-5xl font-bold tracking-tight max-w-2xl mx-auto leading-tight">
            {HERO_SLIDES[heroIdx].heading}
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-base sm:text-lg opacity-80">{HERO_SLIDES[heroIdx].sub}</p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() =>
                HERO_SLIDES[heroIdx].cta === "Browse Products"
                  ? slowScrollTo("bestsellers")
                  : showComingSoon(HERO_SLIDES[heroIdx].cta, "This action will connect to membership / challenge sign-up once the data layer is live.")
              }
              className={`px-6 py-2.5 text-sm font-bold bg-black text-white ${style.radius} hover:opacity-85 cursor-pointer`}
            >
              {HERO_SLIDES[heroIdx].cta}
            </button>
            <button
              type="button"
              onClick={() => showComingSoon(HERO_SLIDES[heroIdx].secondaryCta, "Placeholder — no destination configured yet.")}
              className={`px-6 py-2.5 text-sm font-bold border border-black ${style.radius} hover:bg-black hover:text-white transition-colors cursor-pointer`}
            >
              {HERO_SLIDES[heroIdx].secondaryCta}
            </button>
          </div>
        </div>

        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => setHeroIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 hover:opacity-60 cursor-pointer"
        >
          <Icon path={ICONS.caretLeft} className="w-6 h-6" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => setHeroIdx((i) => (i + 1) % HERO_SLIDES.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:opacity-60 cursor-pointer"
        >
          <Icon path={ICONS.caretRight} className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-center gap-2 pb-6">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setHeroIdx(i)}
              className={`w-2 h-2 rounded-full cursor-pointer ${i === heroIdx ? "bg-black" : "bg-black/20"}`}
            />
          ))}
        </div>
      </section>

      {/* Quiz CTA strip */}
      <section className="w-full border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="demo-heading font-bold text-lg">Not sure where to start?</p>
            <p className="text-sm opacity-70">Answer four quick questions and Concierge will find your next read.</p>
          </div>
          <button
            type="button"
            onClick={() => showComingSoon("Concierge Quiz", "A 4-question wizard (Mood / Format / Hook / Pace) will render here.")}
            className={`px-5 py-2 text-sm font-bold border border-black ${style.radius} hover:bg-black hover:text-white transition-colors cursor-pointer shrink-0`}
          >
            Find Your Perfect Read
          </button>
        </div>
      </section>

      {/* ================= 5. SHELVES ================= */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-14 space-y-16">
        {SHELVES.map((shelf) => (
          <RevealSection key={shelf.id} id={shelf.id} ariaLabel={shelf.label}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="demo-heading text-xl sm:text-2xl font-bold">{shelf.label}</h2>
              <button
                type="button"
                onClick={() => showComingSoon(shelf.label, `The full ${shelf.label} page with sort and filter options will render here.`)}
                className="text-sm font-semibold hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
              {shelf.books.map((book) => (
                <ProductCard
                  key={book.id}
                  book={book}
                  cardClass={`${style.card} ${style.radius}`}
                  onOpen={() => {
                    setActiveBook(book);
                    setCoverFlipped(false);
                  }}
                  onAddToCart={() => showComingSoon("Add to Cart", `"${book.title}" would be added to the cart.`)}
                />
              ))}
            </div>
          </RevealSection>
        ))}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="w-full border-t border-black/10 py-10 text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="demo-heading font-bold">{STORE_NAME}</span>
          <div className="flex items-center gap-5 opacity-70">
            <button type="button" onClick={() => showComingSoon("Legal", "Terms of Service, Privacy, and Storage disclosures live at /legal.")} className="hover:underline cursor-pointer">Terms</button>
            <button type="button" onClick={() => showComingSoon("Legal", "Terms of Service, Privacy, and Storage disclosures live at /legal.")} className="hover:underline cursor-pointer">Privacy</button>
            <span>© {new Date().getFullYear()} {STORE_NAME}</span>
          </div>
        </div>
        <p className="text-center text-xs opacity-50 mt-6">Powered by OmniMedia OS Engine — Evaluation Mode</p>
      </footer>

      {/* ================= DEMO / EVAL CONTROLS ================= */}
      <div className="fixed bottom-4 right-4 z-[60] font-sans">
        {controlsOpen && (
          <div className={`mb-2 w-72 p-4 ${style.card} ${style.radius} bg-white`}>
            <p className="text-xs font-black uppercase tracking-wider mb-3 opacity-60">Evaluation Controls</p>
            <label className="block text-xs font-bold mb-1">Border & Shadow Preset</label>
            <select
              value={stylePreset}
              onChange={(e) => setStylePreset(e.target.value as StylePresetId)}
              className="w-full border border-black/30 px-2 py-1.5 text-sm mb-3 bg-white"
            >
              {Object.entries(STYLE_PRESETS).map(([id, p]) => (
                <option key={id} value={id}>{p.name}</option>
              ))}
            </select>
            <label className="block text-xs font-bold mb-1">Typography Preset</label>
            <select
              value={typography}
              onChange={(e) => setTypography(e.target.value as TypographyPresetId)}
              className="w-full border border-black/30 px-2 py-1.5 text-sm bg-white"
            >
              {Object.entries(TYPOGRAPHY_PRESETS).map(([id, p]) => (
                <option key={id} value={id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={() => setControlsOpen((v) => !v)}
          className="px-4 py-2 bg-black text-white text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
        >
          {controlsOpen ? "Close" : "⚙ Preview Styles"}
        </button>
      </div>

      {/* ================= PRODUCT OVERLAY (Kindle-style order page) ================= */}
      {productOverlayFade.mounted && displayedBook && (
        <div
          className={`fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 transition-opacity duration-300 ${productOverlayFade.show ? "opacity-100" : "opacity-0"}`}
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveBook(null)}
        >
          <div
            className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative ${style.card} ${style.radius} bg-white transition-all duration-300 ${productOverlayFade.show ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveBook(null)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 hover:bg-black hover:text-white border border-black cursor-pointer"
            >
              <Icon path={ICONS.close} className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_220px] gap-8">
              {/* Left: cover with flip */}
              <div>
                <div
                  className="w-full aspect-[3/4] border border-black/20 cursor-pointer [perspective:1000px]"
                  onClick={() => setCoverFlipped((v) => !v)}
                >
                  <div
                    className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
                    style={{ transform: coverFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-800 text-white text-center p-4 [backface-visibility:hidden]">
                      <span className="demo-heading font-bold">{displayedBook.title}</span>
                    </div>
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-center p-4 text-xs [backface-visibility:hidden]"
                      style={{ transform: "rotateY(180deg)" }}
                    >
                      Back cover description would render here — synopsis, author bio, and edition notes.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCoverFlipped((v) => !v)}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold hover:underline cursor-pointer"
                >
                  <Icon path={ICONS.flip} className="w-3.5 h-3.5" /> Flip Cover
                </button>
              </div>

              {/* Middle: identity */}
              <div className="min-w-0">
                <h3 className="demo-heading text-2xl font-bold">{displayedBook.title}</h3>
                <p className="text-sm opacity-70 mt-1">by {displayedBook.author}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Stars rating={displayedBook.rating} />
                  <span className="text-xs opacity-60">{displayedBook.ratingCount} ratings</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-4 text-xs opacity-70">
                  <span>Language: English</span>
                  <span>·</span>
                  <span>Publisher: {STORE_NAME}</span>
                  <span>·</span>
                  <span>Pages: 312</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed opacity-90">
                  A description of the title would render here, pulled from the catalog item's description field —
                  expandable if it runs long.
                </p>
                <div className="mt-6 pt-4 border-t border-black/10">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">Reviews</p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2"><Stars rating={5} /><span className="font-semibold">Marisol T.</span></div>
                      <p className="opacity-80 mt-1">Couldn't put it down — read it in a weekend.</p>
                      <div className="ml-6 mt-2 pl-3 border-l border-black/10 text-xs opacity-70">
                        <span className="font-semibold">Store reply:</span> So glad you enjoyed it!
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: sticky format selector */}
              <div className="md:sticky md:top-4 h-fit">
                <div className={`p-4 ${style.card} ${style.radius}`}>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">Choose a format</p>
                  <div className="space-y-2">
                    {FORMATS.map((f) => (
                      <label key={f} className="flex items-center justify-between text-sm border border-black/15 px-3 py-2 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <input type="radio" name="format" defaultChecked={f === displayedBook.format} />
                          {f}
                        </span>
                        <span className="font-bold">${displayedBook.price}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => showComingSoon("Buy Now", "Checkout would begin here, including shipping collection if Hardcover is selected.")}
                    className="w-full mt-4 py-2.5 bg-black text-white text-sm font-bold hover:opacity-85 cursor-pointer"
                  >
                    Buy Now
                  </button>
                  <button
                    type="button"
                    onClick={() => openReader(displayedBook)}
                    className="w-full mt-2 py-2.5 border border-black text-sm font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
                  >
                    Read Sample
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= IMMERSIVE READER HUD ================= */}
      {readerOpen && activeBook && (
        <div
          className={`fixed inset-0 z-[80] ${readerThemeClasses}`}
          onClick={() => {
            setHudVisible((v) => !v);
          }}
        >
          {/* Kindle-device frame — present on mobile here specifically,
              since the reading screen is where the "holding a book" feel
              earns its keep (unlike the storefront, where it costs width). */}
          <div
            aria-hidden="true"
            className="fixed inset-2 sm:inset-3 rounded-2xl border border-current/15 pointer-events-none z-[81]"
          />
          <div className="max-w-2xl mx-auto h-full px-8 py-16 overflow-y-auto text-lg leading-relaxed" style={{ fontFamily: type.body }}>
            <p className="demo-heading text-2xl font-bold mb-6">{activeBook.title}</p>
            <p className="mb-4">
              Sample chapter text would stream here in the store owner's chosen typography preset, with generous
              margins and no chrome — a distraction-free page for reading, listening progress, or watching.
            </p>
            <p className="opacity-80">Tap the center of the screen to reveal or hide the reading controls below.</p>
          </div>

          {/* Top HUD */}
          <div
            className={`fixed top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-inherit border-b border-current/10 transition-opacity duration-300 ${hudVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setReaderOpen(false);
                setLibrarianOpen(false);
              }}
              aria-label="Back"
              className="p-1.5 cursor-pointer"
            >
              <Icon path={ICONS.close} className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {(["day", "night", "sepia"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-label={`${t} theme`}
                  onClick={() => setReaderTheme(t)}
                  className={`p-1.5 rounded-full cursor-pointer ${readerTheme === t ? "bg-current/10" : ""}`}
                >
                  <Icon path={t === "day" ? ICONS.sun : t === "night" ? ICONS.moon : ICONS.sepia} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Bottom HUD */}
          <div
            className={`fixed bottom-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-inherit border-t border-current/10 transition-opacity duration-300 ${hudVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" aria-label="Previous page" className="p-1.5 cursor-pointer">
              <Icon path={ICONS.caretLeft} className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setLibrarianOpen(true)}
              aria-label="Ask the Librarian"
              className="p-2 rounded-full border border-current/30 cursor-pointer"
            >
              <Icon path={ICONS.glasses} className="w-5 h-5" />
            </button>
            <button type="button" aria-label="Next page" className="p-1.5 cursor-pointer">
              <Icon path={ICONS.caretRight} className="w-5 h-5" />
            </button>
          </div>

          {/* Librarian chat console */}
          {librarianFade.mounted && (
            <div
              className={`fixed inset-0 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 bg-black/10 origin-top-right transition-[backdrop-filter,background-color] duration-300 ${librarianFade.show ? "backdrop-blur-md" : "backdrop-blur-none"}`}
              onClick={() => setLibrarianOpen(false)}
            >
              <div
                className={`w-full sm:w-96 h-[70vh] sm:h-[520px] ${style.radius} sm:rounded-tl-2xl bg-white text-black flex flex-col shadow-2xl transition-all duration-300 ease-in-out origin-top-right ${librarianFade.show ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
                  <span className="font-bold flex items-center gap-2"><Icon path={ICONS.glasses} className="w-4 h-4" /> Librarian</span>
                  <button type="button" onClick={() => setLibrarianOpen(false)} aria-label="Minimize" className="p-1 cursor-pointer">
                    <Icon path={ICONS.close} className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-4 py-2 text-xs opacity-60 border-b border-black/5">
                  Tip: tap the blurred page behind to return to reading at any time. Your chat history with the Librarian is held safely.
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
                  <div className="bg-neutral-100 px-3 py-2 max-w-[85%]">Ask me something about {activeBook.title}.</div>
                </div>
                <div className="p-3 border-t border-black/10 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a question..."
                    className="flex-1 border border-black/20 px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => showComingSoon("Librarian", "Responses will stream here once the chat engine is connected, capped per the admin token settings.")}
                    className="px-3 py-2 bg-black text-white text-sm font-bold cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= "Coming soon" info modal ================= */}
      {infoModalFade.mounted && displayedInfoModal && (
        <div
          className={`fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-300 ${infoModalFade.show ? "opacity-100" : "opacity-0"}`}
          role="dialog"
          aria-modal="true"
          onClick={() => setInfoModal(null)}
        >
          <div
            className={`w-full max-w-md p-6 relative bg-white ${style.card} ${style.radius} transition-all duration-300 ${infoModalFade.show ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setInfoModal(null)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1 hover:bg-black hover:text-white border border-black cursor-pointer"
            >
              <Icon path={ICONS.close} className="w-4 h-4" />
            </button>
            <h3 className="demo-heading text-lg font-bold pr-8">{displayedInfoModal.title}</h3>
            <p className="text-sm mt-3 opacity-80 leading-relaxed">{displayedInfoModal.body}</p>
            <p className="text-xs mt-4 pt-3 border-t border-black/10 opacity-50 italic">
              Evaluation Mode — this action is not wired to a live data layer yet.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="px-4 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="px-4 py-1.5 bg-black text-white text-xs font-bold hover:opacity-85 cursor-pointer"
              >
                Join Membership
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product card with quick-hover menu (Preview / Add to Cart)
// ---------------------------------------------------------------------------

function ProductCard({
  book,
  cardClass,
  onOpen,
  onAddToCart,
}: {
  book: MockBook;
  cardClass: string;
  onOpen: () => void;
  onAddToCart: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <article
      className={`relative group cursor-pointer ${cardClass}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      aria-label={`${book.title} by ${book.author}`}
    >
      <div className="aspect-[3/4] w-full bg-neutral-800 flex items-center justify-center text-white text-center p-3 relative overflow-hidden">
        <span className="demo-heading text-sm font-bold">{book.title}</span>
        <div
          aria-hidden={!hover}
          className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-xs font-bold transition-opacity duration-300 ${
            hover ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" tabIndex={hover ? 0 : -1} onClick={onOpen} className="px-3 py-1.5 bg-white text-black shadow-sm cursor-pointer">Quick Preview</button>
          <button type="button" tabIndex={hover ? 0 : -1} onClick={onAddToCart} className="px-3 py-1.5 border border-white text-white cursor-pointer">+ Add to Cart</button>
        </div>
      </div>
      <div className="p-3">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wide border border-black/30 px-1.5 py-0.5 mb-1.5">
          {book.format}
        </span>
        <p className="text-sm font-bold truncate">{book.title}</p>
        <p className="text-xs opacity-60 truncate">{book.author}</p>
        <div className="flex items-center justify-between mt-1.5">
          <Stars rating={book.rating} />
          <span className="text-sm font-bold">${book.price}</span>
        </div>
      </div>
    </article>
  );
}
