import { useState } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { useBranding } from "~/components/BrandingProvider";
import { UserControlCenter } from "~/components/UserControlCenter";

export function NavBar({ onCartOpen, cartCount = 0 }: { onCartOpen?: () => void; cartCount?: number }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useLanguage();
  const { branding } = useBranding();

  return (
    <header className="w-full bg-white text-black border-b-4 border-black font-serif sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Centered Brand Label/Logo Grid */}
        <div className="flex items-center gap-3">
          {branding.logoDataUrl ? (
            <img src={branding.logoDataUrl} alt="Logo" className="h-8 w-auto object-contain border border-black p-0.5" />
          ) : (
            <div className="text-xl font-black uppercase tracking-wider border-2 border-black px-2 py-0.5 bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              {branding.name || "OMNIREAD"}
            </div>
          )}
          <span className="text-xs uppercase font-sans tracking-widest font-black opacity-60 hidden sm:inline">Engine</span>
        </div>

        {/* Center: Old School Crisp Search Input Frame */}
        <div className="w-full md:max-w-md flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("nav.searchPlaceholder") ?? "Search by title, author, or media type..."}
            className="w-full bg-white text-black border-2 border-black px-3 py-1.5 text-sm font-sans focus:outline-none placeholder:text-gray-500 rounded-none shadow-inner"
          />
          <button type="button" className="bg-black text-white border-2 border-black border-l-0 px-4 py-1.5 text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors rounded-none">
            🔍
          </button>
        </div>

        {/* Right: Unified Navigation Links & Control Center Anchor */}
        <div className="flex items-center gap-4 text-sm font-bold">
          <nav className="hidden lg:flex items-center gap-4">
            <a href="/downloads" className="hover:underline text-black">{t("nav.downloads") ?? "Downloads"}</a>
            <a href="/activate" className="hover:underline text-black">{t("nav.activate") ?? "Activate"}</a>
            <a href="/admin" className="hover:underline text-black">{t("nav.admin") ?? "Admin"}</a>
          </nav>

          <div className="flex items-center gap-2 border-l-2 border-black pl-4">
            <button
              type="button"
              onClick={onCartOpen}
              className="relative p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
              aria-label="Open cart"
            >
              🛒 {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-sans font-black border border-white px-1.5 rounded-full">{cartCount}</span>}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-2 border-2 border-black bg-white text-black font-black hover:translate-y-[-1px] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all cursor-pointer"
              title="Open Control Panel (UCC)"
            >
              ⚙️ Controls
            </button>
          </div>
        </div>
      </div>
      
      <UserControlCenter open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
