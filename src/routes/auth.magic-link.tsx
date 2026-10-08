import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";

/**
 * Landing page for emailed magic links. The token is NOT used on load (mail
 * scanners and link previewers fetch URLs); it is only submitted to Better
 * Auth's /magic-link/verify endpoint when the person clicks the button.
 */
interface MagicLinkSearch {
  token?: string;
  callbackURL?: string;
  errorCallbackURL?: string;
  newUserCallbackURL?: string;
  error?: string;
}

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

export const Route = createFileRoute("/auth/magic-link")({
  validateSearch: (search: Record<string, unknown>): MagicLinkSearch => ({
    token: str(search.token),
    callbackURL: str(search.callbackURL),
    errorCallbackURL: str(search.errorCallbackURL),
    newUserCallbackURL: str(search.newUserCallbackURL),
    error: str(search.error),
  }),
  component: MagicLinkPage,
});

function MagicLinkPage() {
  const { t } = useLanguage();
  const search = Route.useSearch();

  if (search.error || !search.token) {
    return (
      <main>
        <p>{t("auth.magicLink.invalid")}</p>
      </main>
    );
  }

  const signIn = () => {
    const params = new URLSearchParams();
    params.set("token", search.token!);
    if (search.callbackURL) params.set("callbackURL", search.callbackURL);
    if (search.newUserCallbackURL) params.set("newUserCallbackURL", search.newUserCallbackURL);
    params.set("errorCallbackURL", search.errorCallbackURL ?? "/auth/magic-link");
    window.location.assign(`/api/auth/magic-link/verify?${params.toString()}`);
  };

  return (
    <main>
      <h1>{t("auth.magicLink.title")}</h1>
      <button type="button" onClick={signIn}>
        {t("auth.magicLink.button")}
      </button>
    </main>
  );
}
