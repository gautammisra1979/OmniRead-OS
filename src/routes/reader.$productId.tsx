import { useState } from "react";
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { ReaderHUD } from "~/components/ReaderHUD";
import { getAllProducts } from "~/data/products";

export const Route = createFileRoute("/reader/$productId")({
  component: ReaderRoute,
});

function ReaderRoute() {
  const { productId } = useParams({ from: "/reader/$productId" });
  const { t } = useLanguage();
  const [product] = useState(() => {
    const all = getAllProducts();
    return all.find((p) => p.id === productId) ?? null;
  });

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--color-bg,#0f172a)" }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            Product not found.
          </p>
          <Link
            to="/"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReaderHUD
      title={product.title}
      author={product.author}
      productId={product.id}
      onClose={handleClose}
    />
  );
}
