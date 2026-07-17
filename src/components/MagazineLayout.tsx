import { useMemo, useRef, useEffect, useState } from "react";
import { useLanguage } from "~/components/LanguageProvider";

const MOCK_COVERS = ["from-indigo-900 to-slate-900", "from-emerald-900 to-slate-900", "from-rose-900 to-slate-900", "from-amber-900 to-slate-900", "from-cyan-900 to-slate-900"];
const MOCK_ICONS = ["📖", "📘", "📕", "📙", "📗"];

function getMockItems(type: string) {
  return Array.from({ length: 5 }).map((_, i) => ({
    id: "mock-" + type + "-" + i,
    title: "Featured " + (type === "ebook" ? "E-Book" : type === "audiobook" ? "Audiobook" : "Video") + " " + (i + 1),
    author: "Premium Author Edition",
    price: 14.99,
    coverFrom: MOCK_COVERS[i % MOCK_COVERS.length],
    coverTo: "to-black",
    coverIcon: MOCK_ICONS[i % MOCK_ICONS.length]
  }));
}

function CarouselRow({ title, products }: { title: string; products: any[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollLeft = () => { scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" }); };
  const scrollRight = () => { scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" }); };
  return (
    <div className="mb-12 font-serif text-black">
      <h3 className="mb-6 text-xl font-black tracking-tight uppercase border-b-4 pb-2 border-black">
        {title}
      </h3>
      <div className="relative group">
        <button type="button" onClick={scrollLeft} className="absolute left-0 top-1/2 z-10 -translate-y-1/2 p-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black border-2 border-black font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]" aria-label="Scroll left">{"<"}</button>
        <div ref={scrollRef} className="flex gap-6 overflow-x-auto scroll-smooth snap-x pb-4" style={{ scrollbarWidth: "none" }} role="list" aria-label={title}>
          {products.map((p) => (
            <div key={p.id} className="flex-shrink-0 w-48 snap-start" role="listitem">
              <div className="overflow-hidden transition-transform duration-150 hover:-translate-y-1 bg-white border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                <div className="aspect-[3/4] w-full overflow-hidden border-b-2 border-black">
                  <div className={"flex h-full w-full items-center justify-center bg-gradient-to-br " + p.coverFrom + " " + p.coverTo + " text-4xl"}>
                    {p.coverIcon}
                  </div>
                </div>
                <div className="p-3 bg-white">
                  <p className="truncate text-sm font-extrabold uppercase tracking-wide text-black">{p.title}</p>
                  <p className="truncate text-xs opacity-75 italic mt-1 text-black">{p.author}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-amber-600">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    <span className="text-[10px] text-gray-500">(42)</span>
                  </div>
                  <p className="mt-2 text-sm font-black text-black">{"$" + p.price.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={scrollRight} className="absolute right-0 top-1/2 z-10 -translate-y-1/2 p-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black border-2 border-black font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]" aria-label="Scroll right">{">"}</button>
      </div>
    </div>
  );
}

export function MagazineLayout() {
  const { t } = useLanguage();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const ebooks = useMemo(() => getMockItems("ebook"), []);
  const audiobooks = useMemo(() => getMockItems("audiobook"), []);
  const videos = useMemo(() => getMockItems("video"), []);
  if (!hydrated) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 text-center bg-white font-serif">
        <div className="animate-spin h-8 w-8 mx-auto border-4 border-black border-t-transparent" />
      </section>
    );
  }
  return (
    <section className="bg-white min-h-screen text-black mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 font-serif">
      <div className="mb-12 p-8 text-center bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)]">
        <h1 className="text-4xl font-black uppercase tracking-wider text-black">
          {t("layout.magazine") ?? "The Digital Bookstore"}
        </h1>
        <p className="mt-2 text-base italic opacity-90 text-black">
          {t("layout.magazineDesc") ?? "Curated Editions & Formats"}
        </p>
      </div>
      <CarouselRow title={t("admin.analytics.typeEbook") ?? "E-Books & Literature"} products={ebooks} />
      <CarouselRow title={t("admin.analytics.typeAudiobook") ?? "Audiobooks & Narratives"} products={audiobooks} />
      <CarouselRow title={t("admin.analytics.typeVideo") ?? "Video Lectures & Masterclasses"} products={videos} />
    </section>
  );
}
