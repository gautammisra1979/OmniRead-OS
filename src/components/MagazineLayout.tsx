import { useMemo, useRef, useEffect, useState } from "react";
import { useLanguage } from "~/components/LanguageProvider";

const MOCK_COLORS = ["#1e3a8a", "#064e3b", "#4c0519", "#78350f", "#164e63"];
const MOCK_ICONS = ["📖", "📘", "📕", "📙", "📗"];

function getMockItems(type: string,count = 5) {
  return Array.from({ length: count }).map((_, i) => ({
    id: "mock-" + type + "-" + i,
    title: "Featured " + (type === "ebook" ? "E-Book" : type === "audiobook" ? "Audiobook" : type === "video" ? "Video" : "Edition") + " " + (i + 1),
    author: "Premium Author Edition",
    price: 14.99,
    coverBg: MOCK_COLORS[i % MOCK_COLORS.length],
    coverIcon: MOCK_ICONS[i % MOCK_ICONS.length]
  }));
}

function CarouselRow({ title, products }: { title: string; products: any[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollLeft = () => { scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" }); };
  const scrollRight = () => { scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" }); };
  return (
    <div className="mb-12 font-serif text-black">
      <h3 className="mb-6 text-xl font-black tracking-tight uppercase border-b-4 pb-2 border-black">{title}</h3>
      <div className="relative group">
        <button type="button" onClick={scrollLeft} className="absolute left-[-15px] top-1/2 z-10 -translate-y-1/2 p-3 bg-white text-black border-2 border-black font-bold shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] transition-transform cursor-pointer" aria-label="Scroll left">◀</button>
        <div ref={scrollRef} className="flex gap-6 overflow-x-auto scroll-smooth snap-x pb-4" style={{ scrollbarWidth: "none" }} role="list" aria-label={title}>
          {products.map((p) => (
            <div key={p.id} className="flex-shrink-0 w-48 snap-start" role="listitem">
              <div className="overflow-hidden bg-white border-[3px] border-black shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
                <div className="aspect-[3/4] w-full overflow-hidden border-b-2 border-black">
                  <div className="flex h-full w-full items-center justify-center text-4xl text-white" style={{ backgroundColor: p.coverBg }}>{p.coverIcon}</div>
                </div>
                <div className="p-3 bg-white">
                  <p className="truncate text-sm font-extrabold uppercase tracking-wide text-black">{p.title}</p>
                  <p className="truncate text-xs opacity-75 italic mt-1 text-black">{p.author}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-amber-500">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                  <p className="mt-2 text-sm font-black text-black">{"$" + p.price.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={scrollRight} className="absolute right-[-15px] top-1/2 z-10 -translate-y-1/2 p-3 bg-white text-black border-2 border-black font-bold shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] transition-transform cursor-pointer" aria-label="Scroll right">▶</button>
      </div>
    </div>
  );
}

export function MagazineLayout() {
  const { t } = useLanguage();
  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState("");
  useEffect(() => { setHydrated(true); }, []);

  const ebooks = useMemo(() => getMockItems("ebook"), []);
  const audiobooks = useMemo(() => getMockItems("audiobook"), []);
  const videos = useMemo(() => getMockItems("video"), []);
  const lowerShelves = useMemo(() => getMockItems("item", 4), []);

  if (!hydrated) return <div className="py-12 text-center font-bold">Arranging Bookshelf...</div>;

  return (
    <div className="w-full bg-white text-black space-y-16">
      
      {/* 4. HERO SECTION & PROMOTIONS BOX */}
      <div id="homepage-hero" className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2 p-8 flex flex-col justify-center bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]">
          <span className="text-xs font-sans font-black uppercase tracking-widest bg-black text-white px-2 py-1 self-start mb-4">Curated Literary Engine</span>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-black leading-tight">
            {t("layout.magazine") ?? "The Immersive Digital Bookstore"}
          </h1>
          <p className="mt-4 text-lg italic opacity-90 max-w-xl text-black">
            {t("layout.magazineDesc") ?? "Access high-fidelity e-books, narrative audiobooks, and streaming masterclasses within a single decoupled client interface."}
          </p>
          <div className="mt-6">
            <a href="#homepage-assets" className="inline-block px-5 py-2.5 bg-black text-white font-bold text-sm uppercase tracking-wider border-2 border-black hover:bg-white hover:text-black transition-all shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-[2px]">
              Explore Catalog
            </a>
          </div>
        </div>

        <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wide border-b-2 border-black pb-2 mb-3">Library Membership</h2>
            <p className="text-xs opacity-80 leading-relaxed font-sans mb-4">
              Subscribe to unlock global access parameters, activate deep e-reader settings, and interact directly with the automated personal Librarian system.
            </p>
            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="w-full bg-white text-black text-xs border-2 border-black px-3 py-2 font-sans focus:outline-none rounded-none shadow-inner"
              />
              <button 
                type="button"
                onClick={() => alert("Scaffold Mock: Subscribed successfully!")}
                className="w-full py-2 bg-black text-white text-xs font-black uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer"
              >
                Subscribe to Access
              </button>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-dashed border-gray-400 text-[10px] uppercase font-sans tracking-wider text-center font-bold opacity-60">
            ★ Join 12,000+ Digital Collectors ★
          </div>
        </div>
      </div>

      {/* 3. ASSETS SECTION (Horizontal Multi-Format Channels) */}
      <div id="homepage-assets" className="w-full space-y-4">
        <CarouselRow title={t("admin.analytics.typeEbook") ?? "E-Books & Literature"} products={ebooks} />
        <CarouselRow title={t("admin.analytics.typeAudiobook") ?? "Audiobooks & Narratives"} products={audiobooks} />
        <CarouselRow title={t("admin.analytics.typeVideo") ?? "Video Lectures & Masterclasses"} products={videos} />
      </div>

      {/* 5. LOWER SECTIONS (Bestsellers, Recommended, Latest, Coming Soon) */}
      <div id="homepage-lower-sections" className="w-full border-t-4 border-black pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {["Bestsellers", "Recommended", "Latest Arrivals", "Coming Soon"].map((sectionName) => (
            <div key={sectionName} className="p-5 bg-white border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
              <div>
                <h4 className="text-md font-black uppercase tracking-wide border-b-2 border-black pb-2 mb-4 text-center bg-gray-100 py-1">{sectionName}</h4>
                <div className="space-y-4">
                  {lowerShelves.map((item, idx) => (
                    <div key={item.id + idx} className="flex items-center gap-3 border-b border-dashed border-gray-300 pb-2 last:border-none">
                      <div className="w-10 h-12 flex items-center justify-center text-lg shrink-0 rounded-sm" style={{ backgroundColor: item.coverBg }}>{item.coverIcon}</div>
                      <div className="min-w-0 flex-grow">
                        <p className="text-xs font-extrabold uppercase truncate text-black">{sectionName} Choice {idx + 1}</p>
                        <p className="text-[10px] italic opacity-75 truncate text-black">By Premium Author</p>
                        <p className="text-xs font-black text-black mt-0.5">{"$" + item.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
