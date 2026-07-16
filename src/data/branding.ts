export interface BrandingConfig {
  storeName: string;
  supportEmail: string;
  socialLinks: {
    twitter: string;
    instagram: string;
    tiktok: string;
  };
  logoDataUrl: string | null; // base64 data URL from file upload
}

export const defaultBranding: BrandingConfig = {
  storeName: "OmniMedia OS",
  supportEmail: "support@omnimedios.com",
  socialLinks: {
    twitter: "",
    instagram: "",
    tiktok: "",
  },
  logoDataUrl: null,
};