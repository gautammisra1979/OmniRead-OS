import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import appCss from "~/styles/app.css?url";
import { NavBar } from "~/components/NavBar";
import { Footer } from "~/components/Footer";
import { LanguageProvider } from "~/components/LanguageProvider";
import { ThemeProvider } from "~/components/ThemeProvider";
import { BrandingProvider } from "~/components/BrandingProvider";
import { SecurityShield } from "~/components/SecurityShield";
import { AIChatbot } from "~/components/AIChatbot";
import { CartDrawer } from "~/components/CartDrawer";
import { AbandonedCartRecovery } from "~/components/AbandonedCartRecovery";
import { setActiveReferrer, recordClick } from "~/data/affiliate";
import { getPromoSettings } from "~/data/promotions";
import { recordActivity, getCartItemCount } from "~/data/cart";
import { LicenseGate } from "~/components/LicenseGate";
import { PrivacyNoticeBanner } from "~/components/PrivacyNoticeBanner";
import { useLocation, useRouter } from "@tanstack/react-router";
import { initiateCheckout } from "~/data/stripeCheckout";
import { FlightRecorderBoot } from "~/components/FlightRecorderBoot";
import { CloudRestoreModal } from "~/components/CloudRestoreModal";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "OmniMedia OS — White-Label Digital Publishing Engine" },
      {
        name: "description",
        content:
          "A premium white-label multi-media digital publishing platform for authors, creators, and publishers. Launch a beautiful storefront in minutes.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
        integrity:
          "sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==",
        crossOrigin: "anonymous",
        referrerPolicy: "no-referrer",
      },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();
  const router = useRouter();

  // Idle activity tracker: record user interaction events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const events = ["click", "scroll", "keydown", "mousemove", "touchstart"];
    const handler = () => recordActivity();
    // Debounce mousemove/scroll to avoid excessive writes
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedHandler = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handler, 500);
    };
    for (const event of events) {
      window.addEventListener(event, debouncedHandler);
    }
    // Initial activity record
    recordActivity();
    // Update cart count periodically
    const countInterval = setInterval(() => {
      setCartCount(getCartItemCount());
    }, 2000);
    setCartCount(getCartItemCount());
    return () => {
      for (const event of events) {
        window.removeEventListener(event, debouncedHandler);
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(countInterval);
    };
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrandingProvider>
          <RootDocument>
            <NavBar onCartOpen={() => setCartOpen(true)} cartCount={cartCount} />
            <PromoBanner />
            <main role="main">
              <RouteGuard>
                <Outlet />
              </RouteGuard>
            </main>
            <Footer />
            <CartDrawer
              open={cartOpen}
              onClose={() => setCartOpen(false)}
              onCheckout={() => {
                const { redirectUrl } = initiateCheckout();
                router.navigate({ to: redirectUrl });
              }}
            />
            <LicenseGate feature="all" featureName="Abandoned Cart Recovery" featureIcon="🛒">
              <AbandonedCartRecovery onOpenCart={() => setCartOpen(true)} />
            </LicenseGate>
          </RootDocument>
        </BrandingProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans">
        {children}
        <SecurityShield />
        <FlightRecorderBoot />
        <CloudRestoreModal />
        <PrivacyNoticeBanner />
        <LicenseGate feature="all" featureName="OmniRead Librarian" featureIcon="👓">
          <AIChatbot />
        </LicenseGate>
        <ReferralListener />
        <Scripts />
      </body>
    </html>
  );
}

function ReferralListener() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.trim()) {
      const cleanRef = ref.trim().toLowerCase();
      setActiveReferrer(cleanRef);
      recordClick(cleanRef, window.location.pathname);
      // Clean URL without page reload
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  return null;
}

function PromoBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem("omnimedia_promo_dismissed") === "true";
  });

  const settings = typeof window !== "undefined" ? getPromoSettings() : { isPromoModuleEnabled: false, announcementText: "" };

  if (!settings.isPromoModuleEnabled || !settings.announcementText || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("omnimedia_promo_dismissed", "true");
  };

  return (
    <div
      role="banner"
      aria-live="polite"
      className="relative w-full px-4 py-2.5 text-center text-sm font-medium text-white"
      style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
    >
      <span>{settings.announcementText}</span>
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition-colors hover:bg-white/20"
        aria-label="Dismiss announcement"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Route Guard: License-based premium feature protection ─── */

const PREMIUM_ROUTES: Record<string, { feature: string; name: string; icon: string }> = {
  "/quiz": { feature: "quiz", name: "Diagnostic Quiz", icon: "📋" },
  "/challenge": { feature: "challenge", name: "Daily Challenge", icon: "🏆" },
  "/progress": { feature: "progress", name: "Progress Hub", icon: "📊" },
  "/affiliate": { feature: "affiliate", name: "Affiliate Portal", icon: "🤝" },
  "/downloads": { feature: "downloads", name: "Download Ledger", icon: "📥" },
};

function RouteGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;

  // Check if current route is a premium route
  const premiumRoute = PREMIUM_ROUTES[pathname];

  if (!premiumRoute) {
    // Check if it's a product media route
    if (pathname.startsWith("/product/")) {
      return (
        <LicenseGate feature="product-media" featureName="Media Players" featureIcon="🎬">
          {children}
        </LicenseGate>
      );
    }
    return <>{children}</>;
  }

  return (
    <LicenseGate
      feature={premiumRoute.feature}
      featureName={premiumRoute.name}
      featureIcon={premiumRoute.icon}
    >
      {children}
    </LicenseGate>
  );
}