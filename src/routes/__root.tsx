import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import appCss from "~/styles/app.css?url";
import { LanguageProvider } from "~/components/LanguageProvider";
import { ThemeProvider } from "~/components/ThemeProvider";
import { BrandingProvider } from "~/components/BrandingProvider";

export const Route = createRootRoute({
  component: RootComponent,
  links: () => [{ rel: "stylesheet", href: appCss }],
});

function RootComponent() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  return (
    <html lang="en" className="bg-white text-black m-0 p-0">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>OmniRead OS — Premium Bookstore Engine</title>
        <HeadContent />
      </head>
      <body className="bg-white text-black min-h-screen antialiased m-0 p-0">
        <ThemeProvider defaultTheme="light" storageKey="omni-theme">
          <LanguageProvider>
            <BrandingProvider>
              {hydrated ? <Outlet /> : <div className="py-20 text-center font-bold font-serif">Loading Showcase Engine...</div>}
            </BrandingProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
