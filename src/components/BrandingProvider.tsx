import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { saveBranding, type BrandingConfig } from "~/data/branding";
import { uploadLogoImage, deleteLogoBlob } from "~/lib/blob";

interface BrandingContextType {
  branding: BrandingConfig;
  updateBranding: (field: string, value: string) => Promise<void>;
  updateSocialLink: (platform: "twitter" | "instagram" | "tiktok", url: string) => Promise<void>;
  updateLogo: (file: File | null) => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

export function BrandingProvider({
  children,
  initialBranding,
}: {
  children: ReactNode;
  initialBranding: BrandingConfig;
}) {
  const [branding, setBranding] = useState<BrandingConfig>(initialBranding);

  // Save, then adopt the config the server returned so a rejected value
  // snaps back to what is stored.
  const persist = useCallback(async (next: BrandingConfig) => {
    const stored = await saveBranding({ data: next });
    setBranding(stored);
    return stored;
  }, []);

  const updateBranding = useCallback(
    async (field: string, value: string) => {
      await persist({ ...branding, [field]: value });
    },
    [branding, persist],
  );

  const updateSocialLink = useCallback(
    async (platform: "twitter" | "instagram" | "tiktok", url: string) => {
      await persist({
        ...branding,
        socialLinks: { ...branding.socialLinks, [platform]: url },
      });
    },
    [branding, persist],
  );

  const updateLogo = useCallback(
    async (file: File | null) => {
      const oldUrl = branding.logoUrl;
      let newUrl: string | null = null;
      if (file) {
        const form = new FormData();
        form.append("logo", file);
        newUrl = await uploadLogoImage({ data: form });
      }
      const deleteBlob = async (url: string, which: string) => {
        try {
          await deleteLogoBlob({ data: url });
        } catch (err) {
          console.error(`Failed to delete ${which} logo blob`, err);
        }
      };

      let stored: BrandingConfig;
      try {
        stored = await persist({ ...branding, logoUrl: newUrl });
      } catch (err) {
        // Save threw: keep the old logo, discard the fresh upload.
        if (newUrl) await deleteBlob(newUrl, "new");
        throw err;
      }

      if (stored.logoUrl === newUrl) {
        // Save took effect: the old Blob is now unreferenced.
        if (oldUrl && oldUrl !== newUrl) await deleteBlob(oldUrl, "old");
      } else if (newUrl) {
        // Server returned a different logo (rejected): discard the upload.
        await deleteBlob(newUrl, "new");
      }
    },
    [branding, persist],
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
