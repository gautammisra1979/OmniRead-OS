import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite"; // <-- 1. Import Nitro!

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    // The site is reverse-proxied behind <label>.<PUBLIC_SITE_DOMAIN>; the proxy
    // masks the Host to localhost:3000, but accept any host so a dev server never
    // rejects a proxied request with "Blocked request".
    allowedHosts: true,
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    nitro({
      preset: "vercel" // <-- 2. Tell Nitro to output for Vercel!
    }),
    viteReact(),
  ],
});
