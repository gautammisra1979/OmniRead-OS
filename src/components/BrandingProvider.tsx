import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { defaultBranding, type BrandingConfig } from "~/data/branding";

interface BrandingContextType {
  branding: BrandingConfig;
  updateBranding: (field: string, value: string) => void;
  updateSocialLink: (platform: "twitter" | "instagram" | "tiktok", url: string) => void;
  updateLogo: (dataUrl: string | null) => void;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

const STORAGE_KEY = "omnimedios_branding";

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(() => {
    if (typeof window === "undefined") return defaultBranding;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as BrandingConfig;
      }
    } catch {
      // ignore parse errors
    }
    return defaultBranding;
  });

  const saveBranding = useCallback((next: BrandingConfig) => {
    setBranding(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const updateBranding = useCallback(
    (field: string, value: string) => {
      saveBranding({ ...branding, [field]: value });
    },
    [branding, saveBranding],
  );

  const updateSocialLink = useCallback(
    (platform: "twitter" | "instagram" | "tiktok", url: string) => {
      saveBranding({
        ...branding,
        socialLinks: { ...branding.socialLinks, [platform]: url },
      });
    },
    [branding, saveBranding],
  );

  const updateLogo = useCallback(
    (dataUrl: string | null) => {
      saveBranding({ ...branding, logoDataUrl: dataUrl });
    },
    [branding, saveBranding],
  );

  return (
    <BrandingContext.Provider
      value={{ branding, updateBranding, updateSocialLink, updateLogo }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}