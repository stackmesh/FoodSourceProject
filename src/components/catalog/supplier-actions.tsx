"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { addToComparison, toggleFavorite } from "@/server/actions";

export function FavoriteButton({
  supplierId,
  saved,
}: {
  supplierId: string;
  saved: boolean;
}) {
  const t = useTranslations("Catalog");
  const [state, action, pending] = useActionState(toggleFavorite, null);
  const isSaved = state?.ok ? state.saved : saved;

  if (isSaved) {
    return (
      <form
        action={action}
        onSubmit={(event) => {
          if (!window.confirm(t("confirmRemoveText"))) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="supplierId" value={supplierId} />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {t("saved")}
        </Button>
      </form>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="supplierId" value={supplierId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {t("save")}
      </Button>
      {state && !state.ok ? (
        <p className="mt-1 text-xs text-destructive">{t("actionFailed")}</p>
      ) : null}
    </form>
  );
}

export function CompareButton({ slug, active }: { slug: string; active: boolean }) {
  const t = useTranslations("Catalog");
  const [state, action, pending] = useActionState(addToComparison, null);
  const comparing = state?.ok ? state.comparing : active;

  if (comparing) {
    return (
      <Button asChild variant="secondary" size="sm">
        <Link href="/compare">{t("inCompare")}</Link>
      </Button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <Button type="submit" size="sm" disabled={pending}>
        {t("compare")}
      </Button>
      {state && !state.ok ? (
        <p className="mt-1 max-w-xs text-xs text-destructive">
          {state.error === "full" ? t("compareFull") : t("actionFailed")}
        </p>
      ) : null}
    </form>
  );
}
