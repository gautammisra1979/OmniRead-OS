import { useState, useEffect } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { useBranding } from "~/components/BrandingProvider";
import { UserControlCenter } from "~/components/UserControlCenter";
import { InfoModal } from "~/components/DisclaimerModal";
import { getInfoModals, type InfoModalConfig } from "~/data/membership";
import { type Locale } from "~/data/translations";

const languages: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
];

export function NavBar({ onCartOpen, cartCount = 0 }: { onCartOpen?: () => void; cartCount?: number }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoModals, setInfoModals] = useState<InfoModalConfig[]>([]);
  const [activeInfoModal, setActiveInfoModal] = useState<InfoModalConfig | null>(null);
  const { locale, setLocale, t } = useLanguage();
  const { branding } = useBranding();

  const currentLang = languages.find((l) => l.code === locale) ?? languages[0];
  const hasLogo = branding.logoDataUrl && branding.logoDataUrl.trim().length > 0;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInfoModals(getInfoModals());
    }
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full border-b backdrop-blur-md"
      style={{
        backgroundColor: "var(--color-nav)",
        borderColor: "var(--color-border)",
      }}
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
        role="navigation"
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <a
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          {hasLogo ? (
            <img
              src={branding.logoDataUrl}
              alt={branding.storeName}
              className="h-8 w-auto rounded object-contain"
            />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-white shadow-sm"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {branding.storeName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="hidden sm:inline">{branding.storeName}</span>
        </a>

        {/* Search bar */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <label htmlFor="nav-search" className="sr-only">
            {t("nav.search")}
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
              style={{ color: "var(--color-text-muted)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              id="nav-search"
              type="search"
              placeholder={t("nav.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg py-2 pl-10 pr-4 text-sm placeholder-gray-400 transition-colors focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)",
                borderColor: "var(--color-border)",
                borderWidth: "1px",
              }}
              aria-label={t("nav.search")}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-primary)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--color-border)";
              }}
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Mobile cart button */}
          <button
            type="button"
            onClick={onCartOpen}
            className="relative rounded-lg p-2 transition-colors hover:opacity-80 md:hidden"
            style={{ color: "var(--color-text-muted)" }}
            aria-label={t("cart.open")}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
            {cartCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
                aria-hidden="true"
              >
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
          {/* Settings gear */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg p-2 transition-colors hover:opacity-80"
            style={{ color: "var(--color-text-muted)" }}
            aria-label={t("controlCenter.title") ?? "Settings"}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Language dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
              aria-label={`Language: ${currentLang.label}`}
              aria-expanded={langOpen}
              onClick={() => setLangOpen(!langOpen)}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
              <span className="hidden sm:inline text-xs uppercase">
                {currentLang.code}
              </span>
              <svg
                className={`h-3 w-3 transition-transform ${langOpen ? "rotate-180" : ""}`}
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
            </button>

            {langOpen && (
              <div
                className="absolute right-0 mt-1 w-36 rounded-lg border py-1 shadow-lg"
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                }}
                role="listbox"
                aria-label="Select language"
              >
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    aria-selected={locale === lang.code}
                    className="w-full px-4 py-2 text-left text-sm transition-colors"
                    style={{
                      color:
                        locale === lang.code
                          ? "var(--color-primary)"
                          : "var(--color-text-muted)",
                      backgroundColor:
                        locale === lang.code
                          ? "color-mix(in srgb, var(--color-primary) 15%, transparent)"
                          : "transparent",
                    }}
                    onClick={() => {
                      setLocale(lang.code);
                      setLangOpen(false);
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-1 md:flex">
            {/* Cart button */}
            <button
              type="button"
              onClick={onCartOpen}
              className="relative rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
              aria-label={t("cart.open")}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
                  aria-hidden="true"
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
            {/* Info Modal links */}
            {infoModals.map((modal) => (
              <button
                key={modal.id}
                type="button"
                onClick={() => setActiveInfoModal(modal)}
                className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--color-text-muted)" }}
                aria-label={modal.linkLabel}
              >
                <span aria-hidden="true" className="mr-1">{modal.icon}</span>
                {modal.linkLabel}
              </button>
            ))}
            <a
              href="/progress"
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("nav.progress")}
            </a>
            <a
              href="/affiliate"
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("nav.affiliate")}
            </a>
            <a
              href="/challenge"
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("nav.challenge")}
            </a>
            <a
              href="/downloads"
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("nav.downloads")}
            </a>
            <a
              href="/activate"
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("nav.activate")}
            </a>
            <a
              href="#dashboard"
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("nav.dashboard")}
            </a>
            <a
              href="/admin"
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("nav.admin")}
            </a>
          </div>
        </div>
      </nav>
      <UserControlCenter open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {activeInfoModal && (
        <InfoModal
          id={activeInfoModal.id}
          title={activeInfoModal.title}
          content={activeInfoModal.content}
          icon={activeInfoModal.icon}
          onClose={() => setActiveInfoModal(null)}
        />
      )}
    </header>
  );
}