"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [open, setOpen] = useState(false);
  const isSaved = state?.ok ? state.saved : saved;
  const formId = `remove-favorite-${supplierId}`;

  if (isSaved) {
    return (
      <>
        <form
          id={formId}
          action={action}
          onSubmit={(event) => {
            const submitter = event.nativeEvent.submitter;
            const confirmed = submitter instanceof HTMLButtonElement && submitter.dataset.confirm === "remove";
            if (!confirmed) {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <input type="hidden" name="supplierId" value={supplierId} />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {t("saved")}
          </Button>
        </form>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmRemoveTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("confirmRemoveText")}</AlertDialogDescription>
            </AlertDialogHeader>
            {state && !state.ok ? (
              <p className="text-sm text-destructive">{t("actionFailed")}</p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={pending}>
                {t("cancel")}
              </AlertDialogCancel>
              <Button
                type="submit"
                form={formId}
                data-confirm="remove"
                variant="destructive"
                disabled={pending}
              >
                {t("confirmRemove")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
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
