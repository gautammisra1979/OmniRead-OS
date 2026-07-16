import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";

export function SecurityShield() {
  const { t } = useLanguage();
  const [toast, setToast] = useState<{ message: string } | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const isAdmin = useCallback((): boolean => {
    try {
      return sessionStorage.getItem("omnimeda_admin_auth") === "true";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (isAdmin()) return;
      e.preventDefault();
      showToast(t("security.restricted"));
    };

    const handleDragStart = (e: DragEvent) => {
      if (isAdmin()) return;
      e.preventDefault();
      showToast(t("security.restricted"));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAdmin()) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // F12
      if (e.key === "F12") {
        e.preventDefault();
        showToast(t("security.devTools"));
        return;
      }

      // Ctrl+Shift+I (DevTools)
      if (isCtrlOrCmd && isShift && e.key.toLowerCase() === "i") {
        e.preventDefault();
        showToast(t("security.devTools"));
        return;
      }

      // Ctrl+Shift+J (Console)
      if (isCtrlOrCmd && isShift && e.key.toLowerCase() === "j") {
        e.preventDefault();
        showToast(t("security.devTools"));
        return;
      }

      // Ctrl+U (View Source)
      if (isCtrlOrCmd && e.key.toLowerCase() === "u") {
        e.preventDefault();
        showToast(t("security.devTools"));
        return;
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAdmin, showToast, t]);

  if (!toast) return null;

  return (
    <div
      className="fixed top-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg"
      style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
      role="status"
      aria-live="polite"
      aria-label="Security notification"
    >
      {toast.message}
    </div>
  );
}