import { useState, useRef } from "react";

// Zero-dependency premium mock data
const MOCK_COLORS = ["#1e3a8a", "#064e3b", "#4c0519", "#78350f", "#164e63"];
const MOCK_ICONS = ["📖", "📘", "📕", "📙", "📗"];
const CAROUSELS = [
  { id: "ebooks", title: "Digital E-Books & Literature Collections" },
  { id: "audiobooks", title: "Narrative Audiobooks & Voice Productions" },
  { id: "videos", title: "Video Lectures & Masterclass Collections" }
];

export function EvaluationScaffold() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalFeature, setModalFeature] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");

  const triggerModal = (title: string, feature: string) => {
    setModalTitle(title);
    setModalFeature(feature);
    setModalOpen(true);
  };

  return (
    <div className="w-full bg-white text-black min-h-screen font-serif flex flex-col antialiased selection:bg-black selection:text-white">
      
      {/* 1. ANNOUNCEMENT BAR */}
      <div className="w-full bg-white text-black border-b-4 border-black select-none">
        <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-between text-xs sm:text-sm font-bold">
          <div className="bg-black text-white px-3 h-full flex items-center tracking-widest">OM-OS</div>
          <div className="truncate px-4">OmniRead OS Evaluation Mode Active — Architectural Scaffolding View</div>
          <button type="button" onClick={() => triggerModal("System Control", "Global Configurations Channel")} className="hover:bg-black hover:text-white px-2 cursor-pointer">⚙️</button>
        </div>
      </div>

      {/* 2. HEADER / NAVBAR */}
      <header className="w-full bg-white text-black border-b-4 border-black sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xl font-black uppercase tracking-wider border-2 border-black px-2 py-0.5 bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            OMNIREAD ENGINE
          </div>
          <div className="w-full md:max-w-md flex items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, author, or publisher keywords..."
              className="w-full bg-white border-2 border-black px-3 py-1.5 text-sm font-sans focus:outline-none rounded-none shadow-inner text-black"
            />
            <button type="button" onClick={() => triggerModal(`Search Matrix for "${search || 'All'}"`, "Advanced Core Indexing System")} className="bg-black text-white border-2 border-black border-l-0 px-4 py-1.5 text-sm font-bold rounded-none cursor-pointer">🔍</button>
          </div>
          <div className="flex items-center gap-4 text-sm font-bold">
            <button onClick={() => triggerModal("Download Center", "Secure DRM Local Ledger Utility")} className="hover:underline text-black cursor-pointer">Downloads</button>
            <button onClick={() => triggerModal("License Activation Gateway", "Automated Node License Binding")} className="hover:underline text-black cursor-pointer text-orange-600">Activate</button>
            <button onClick={() => triggerModal("Admin Dashboard Console", "Multi-Tenant Content Infrastructure Management")} className="hover:underline text-black cursor-pointer">Admin</button>
            <button onClick={() => triggerModal("Shopping Cart Ledger", "Stripe Checkout Pipeline Integration")} className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white text-black transition-colors cursor-pointer">🛒</button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER FRAME */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        
        {/* 4. HERO SECTION */}
        <div id="demo-hero" className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          <div className="lg:col-span-2 p-8 flex flex-col justify-center bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]">
            <span className="text-xs font-sans font-black uppercase tracking-widest bg-black text-white px-2 py-1 self-start mb-4">Enterprise White-Label Architecture</span>
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-black leading-tight">The Immersive Digital Bookstore</h1>
            <p className="mt-4 text-lg italic opacity-90 max-w-xl text-black">
              Deploy high-fidelity digital publication frameworks, manage rich media catalogs, and engage your subscriber audience natively under a serverless web instance.
            </p>
          </div>
          <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-wide border-b-2 border-black pb-2 mb-3">Library Membership</h2>
              <p className="text-xs opacity-80 leading-relaxed font-sans mb-4">Subscribe to evaluate automated newsletter dispatchers and personal e-reader personalization states.</p>
              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="w-full bg-white text-xs border-2 border-black px-3 py-2 font-sans focus:outline-none rounded-none text-black"
                />
                <button type="button" onClick={() => triggerModal("Newsletter Dispatch Engine", "Automated Subscriber Funnel CRM")} className="w-full py-2 bg-black text-white text-xs font-black uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer">Subscribe to Access</button>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-dashed border-gray-400 text-[10px] uppercase font-sans tracking-wider text-center font-bold opacity-60">★ Demo Mode Enabled ★</div>
          </div>
        </div>

        {/* 3. ASSETS SECTION (Horizontal Channels) */}
        <div id="demo-carousels" className="space-y-12">
          {CAROUSELS.map((c) => (
            <div key={c.id} className="font-serif text-black">
              <h3 className="mb-6 text-xl font-black tracking-tight uppercase border-b-4 pb-2 border-black">{c.title}</h3>
              <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={c.id + i} onClick={() => triggerModal(`Product Preview: Book Model Edition ${i+1}`, `Advanced Immersive E-Reader Media Stream [${c.id.toUpperCase()}]`)} className="flex-shrink-0 w-48 group cursor-pointer">
                    <div className="overflow-hidden bg-white border-[3px] border-black shadow-[5px_5px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-transform duration-150">
                      <div className="aspect-[3/4] w-full border-b-2 border-black flex items-center justify-center text-4xl text-white" style={{ backgroundColor: MOCK_COLORS[i % MOCK_COLORS.length] }}>{MOCK_ICONS[i % MOCK_ICONS.length]}</div>
                      <div className="p-3 bg-white text-black">
                        <p className="truncate text-sm font-extrabold uppercase tracking-wide">Featured Publication {i + 1}</p>
                        <p className="truncate text-xs opacity-75 italic mt-1">Premium Author Edition</p>
                        <div className="flex text-amber-500 mt-1 text-xs">★★★★★</div>
                        <p className="mt-2 text-sm font-black">$14.99</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 5. SECTIONS ROW (Lower Shelf Grids) */}
        <div id="demo-shelves" className="border-t-4 border-black pt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {["Bestsellers", "Recommended", "Latest Arrivals", "Coming Soon"].map((shelf) => (
              <div key={shelf} className="p-5 bg-white border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                <div>
                  <h4 className="text-md font-black uppercase tracking-wide border-b-2 border-black pb-2 mb-4 text-center bg-gray-100 py-1 text-black">{shelf}</h4>
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={shelf + idx} onClick={() => triggerModal(`Shelf Interaction: ${shelf} Choice ${idx+1}`, "Curated Asset Placement Logic")} className="flex items-center gap-3 border-b border-dashed border-gray-300 pb-2 last:border-none cursor-pointer group">
                        <div className="w-10 h-12 flex items-center justify-center text-lg shrink-0 rounded-sm bg-black text-white font-sans font-black group-hover:scale-105 transition-transform">#{(idx+1)}</div>
                        <div className="min-w-0 flex-grow text-black">
                          <p className="text-xs font-extrabold uppercase truncate">{shelf} Record {idx + 1}</p>
                          <p className="text-[10px] italic opacity-75 truncate">By Premium Author</p>
                          <p className="text-xs font-black mt-0.5">$14.99</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* INTERCEPTOR OVERLAY MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg bg-white border-4 border-black p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)] text-black relative animate-scale-up">
            <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-4">
              <h3 className="text-xl font-black uppercase tracking-tight">⚙️ Core Engine Intercept</h3>
              <button onClick={() => setModalOpen(false)} className="text-xl font-black hover:bg-black hover:text-white px-2 border border-black cursor-pointer" aria-label="Close modal">×</button>
            </div>
            <div className="space-y-4 font-sans text-sm">
              <div className="bg-gray-100 p-3 border-2 border-dashed border-black">
                <p className="text-xs uppercase tracking-wider font-black text-gray-600">Attempted Route Target</p>
                <p className="font-serif font-bold text-black mt-0.5">{modalTitle}</p>
                <p className="text-[11px] opacity-70 mt-0.5">Component Module: {modalFeature}</p>
              </div>
              <p className="font-serif text-base font-black text-orange-600 tracking-tight leading-snug">
                "Coming soon. Please activate your store license."
              </p>
              <p className="text-xs leading-relaxed text-gray-700">
                This storefront is currently running in **Enterprise Demo Mode** for architectural review and portfolio verification. Downstream asset loaders and data state hydration engines are decoupled.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t-2 border-black flex justify-end">
              <button onClick={() => setModalOpen(false)} className="px-5 py-1.5 bg-black text-white font-bold text-xs uppercase tracking-wider border-2 border-black hover:bg-white hover:text-black transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer">
                Return to Sandbox
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
