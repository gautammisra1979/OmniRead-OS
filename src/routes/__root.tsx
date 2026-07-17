import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import appCss from "~/styles/app.css?url";
import { NavBar } from "~/components/NavBar";
import { Footer } from "~/components/Footer";
import { LanguageProvider } from "~/components/LanguageProvider";
import { ThemeProvider } from "~/components/ThemeProvider";
import { BrandingProvider } from "~/components/BrandingProvider";
import { AnnouncementBar } from "~/components/AnnouncementBar";

export const Route = createRootRoute({
  component: RootComponent,
  links: () => [{ rel: "stylesheet", href: appCss }],
});

function RootComponent() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  return (
    <html lang="en" className="bg-white text-black selection:bg-black selection:text-white">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>OmniRead OS — Premium Bookstore Engine</title>
        <HeadContent />
      </head>
      <body className="bg-white text-black min-h-screen font-serif antialiased m-0 p-0">
        <ThemeProvider defaultTheme="light" storageKey="omni-theme">
          <LanguageProvider>
            <BrandingProvider>
              <div className="w-full bg-white text-black flex flex-col min-h-screen">
                <AnnouncementBar />
                <NavBar />
                <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white">
                  {hydrated ? <Outlet /> : <div className="py-20 text-center text-lg font-bold">Loading Storefront...</div>}
                </main>
                <div className="w-full border-t-4 border-black bg-white mt-12">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Footer />
                  </div>
                </div>
              </div>
            </BrandingProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
