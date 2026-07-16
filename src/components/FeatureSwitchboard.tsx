import { useState, useCallback } from "react";
import { coreModules, premiumModules, type Module } from "~/data/features";
import { FeatureToggleSwitch } from "~/components/FeatureToggleSwitch";
import { useLanguage } from "~/components/LanguageProvider";
import { ThemeDashboard } from "~/components/ThemeDashboard";
import { BrandingDashboard } from "~/components/BrandingDashboard";
import { CatalogDashboard } from "~/components/CatalogDashboard";

export function FeatureSwitchboard() {
  const { t } = useLanguage();
  const [toggleState, setToggleState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const m of coreModules) initial[m.id] = true;
    for (const m of premiumModules) initial[m.id] = false;
    return initial;
  });

  const handleToggle = useCallback((id: string) => {
    setToggleState((prev) => {
      const isCore = coreModules.some((m) => m.id === id);
      if (isCore) return prev;
      return { ...prev, [id]: !prev[id] };
    });
  }, []);

  const allModules: Module[] = [
    ...coreModules.map((m) => ({ ...m, enabled: true })),
    ...premiumModules.map((m) => ({ ...m, enabled: toggleState[m.id] ?? false })),
  ];

  const activeCount = allModules.filter((m) => m.enabled).length;
  const totalCount = allModules.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Feature Switchboard */}
      <p className="mb-8 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        {t("admin.switchboard.desc")}
      </p>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in srgb, var(--color-surface) 50%, transparent)" }}>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            {activeCount}<span className="text-sm font-normal" style={{ color: "var(--color-text-muted)" }}>/{totalCount}</span>
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{t("admin.modules.active")}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in srgb, var(--color-surface) 50%, transparent)" }}>
          <p className="text-2xl font-bold text-amber-400">{totalCount - activeCount}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{t("admin.modules.disabled")}</p>
        </div>
        <div className="rounded-xl border p-4 sm:col-span-2" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in srgb, var(--color-surface) 50%, transparent)" }}>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(activeCount / totalCount) * 100}%`, backgroundColor: "var(--color-primary)" }} />
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
              {Math.round((activeCount / totalCount) * 100)}%
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{t("admin.modules.coverage")}</p>
        </div>
      </div>

      {/* Core Infrastructure */}
      <section aria-labelledby="core-heading" className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <i className="fa-solid fa-shield-halved text-indigo-400 text-lg" aria-hidden="true" />
          <h2 id="core-heading" className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {t("admin.core.heading")}
          </h2>
          <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
            {coreModules.length}/{coreModules.length} {t("status.active").toLowerCase()}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {coreModules.map((mod) => (
            <FeatureToggleSwitch key={mod.id} module={{ ...mod, enabled: true }} onToggle={handleToggle} />
          ))}
        </div>
      </section>

      {/* Premium Modules */}
      <section aria-labelledby="premium-heading">
        <div className="mb-4 flex items-center gap-3">
          <i className="fa-solid fa-crown text-amber-400 text-lg" aria-hidden="true" />
          <h2 id="premium-heading" className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {t("admin.premium.heading")}
          </h2>
          <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
            {premiumModules.filter((m) => toggleState[m.id]).length}/{premiumModules.length} {t("status.active").toLowerCase()}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {premiumModules.map((mod) => (
            <FeatureToggleSwitch key={mod.id} module={{ ...mod, enabled: toggleState[mod.id] ?? false }} onToggle={handleToggle} />
          ))}
        </div>
      </section>

      {/* Theme Dashboard */}
      <ThemeDashboard />

      {/* Branding & Identity */}
      <BrandingDashboard />

      {/* Product Catalog */}
      <CatalogDashboard />
    </div>
  );
}