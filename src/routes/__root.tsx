import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import appCss from "~/styles/app.css?url";
import { LanguageProvider } from "~/components/LanguageProvider";
import { ThemeProvider } from "~/components/ThemeProvider";
import { BrandingProvider } from "~/components/BrandingProvider";
import { AnonymousAuthBoot } from "~/components/AnonymousAuthBoot";
import { AffiliateReferralBoot } from "~/components/AffiliateReferralBoot";
import { getBranding } from "~/data/branding";
import { getStoreTheme } from "~/data/themes";

export const Route = createRootRoute({
  // Store branding + theme are loaded once here (SSR) so the first paint is
  // correct; staleTime: Infinity stops client navigations from re-fetching.
  loader: async () => {
    const [branding, theme] = await Promise.all([getBranding(), getStoreTheme()]);
    return { branding, theme };
  },
  staleTime: Infinity,
  component: RootComponent,
});

function RootComponent() {
  const { branding, theme } = Route.useLoaderData();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  return (
    <html lang="en" className="bg-white text-black m-0 p-0">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>OmniRead OS — Premium Bookstore Engine</title>
        <link rel="stylesheet" href={appCss} />
        <HeadContent />
      </head>
      <body className="bg-white text-black min-h-screen antialiased m-0 p-0">
        <ThemeProvider initialTheme={theme}>
          <LanguageProvider>
            <BrandingProvider initialBranding={branding}>
              <AnonymousAuthBoot />
              <AffiliateReferralBoot />
              {hydrated ? <Outlet /> : <div className="py-20 text-center font-bold font-serif">Loading Showcase Engine...</div>}
            </BrandingProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
