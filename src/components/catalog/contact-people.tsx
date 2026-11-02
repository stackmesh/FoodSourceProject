"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { communicationChannels } from "@/lib/contact-activity";
import { deletePerson, savePerson, setPrimaryPerson, type PersonState } from "@/server/actions";
import type { ContactPersonRecord } from "@/server/catalog-types";

export function ContactPeople({
  supplierId,
  people,
}: {
  supplierId: string;
  people: ContactPersonRecord[];
}) {
  const t = useTranslations("Catalog");

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{t("people")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("peopleHint")}</p>
        </div>
        <PersonSheet supplierId={supplierId} />
      </div>
      {people.length ? (
        <ul className="mt-3 divide-y">
          {people.map((person) => (
            <li key={person.id} className="space-y-2 py-3">
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  {person.fullName}
                  {person.isPrimary ? (
                    <span className="ml-2 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {t("primary")}
                    </span>
                  ) : null}
                </p>
                {person.position ? <p className="text-muted-foreground">{person.position}</p> : null}
                {person.email ? (
                  <p className="mt-1 break-all">
                    <a className="text-primary hover:underline" href={`mailto:${person.email}`}>
                      {person.email}
                    </a>
                  </p>
                ) : null}
                {person.phone ? (
                  <p>
                    <a className="text-primary hover:underline" href={`tel:${person.phone.replace(/[^\d+]/g, "")}`}>
                      {person.phone}
                    </a>
                  </p>
                ) : null}
                {person.preferredChannel ? (
                  <p className="mt-1 text-xs text-muted-foreground">{t(`channel.${person.preferredChannel}`)}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <PersonSheet supplierId={supplierId} person={person} />
                {person.isPrimary ? null : (
                  <form action={setPrimaryPerson}>
                    <input type="hidden" name="supplierId" value={supplierId} />
                    <input type="hidden" name="personId" value={person.id} />
                    <PendingText label={t("makePrimary")} />
                  </form>
                )}
                <DeletePerson supplierId={supplierId} personId={person.id} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t("noPeople")}</p>
      )}
    </div>
  );
}

function PendingText({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Catalog");
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? t("saving") : label}
    </Button>
  );
}

function DeletePerson({ supplierId, personId }: { supplierId: string; personId: string }) {
  const t = useTranslations("Catalog");
  const [open, setOpen] = useState(false);
  const formId = `delete-person-${personId}`;

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t("deletePerson")}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deletePersonTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deletePersonText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{t("cancel")}</AlertDialogCancel>
            <Button type="submit" form={formId} variant="destructive" size="sm">
              {t("deletePerson")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <form id={formId} action={deletePerson} className="hidden">
        <input type="hidden" name="supplierId" value={supplierId} />
        <input type="hidden" name="personId" value={personId} />
      </form>
    </>
  );
}

function PersonSheet({ supplierId, person }: { supplierId: string; person?: ContactPersonRecord }) {
  const t = useTranslations("Catalog");
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(savePerson, null);
  const [seen, setSeen] = useState<PersonState | null>(null);

  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button type="button" variant={person ? "ghost" : "outline"} size="sm" onClick={() => setOpen(true)}>
        {person ? t("editPerson") : t("addPerson")}
      </Button>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{person ? t("editPerson") : t("addPerson")}</SheetTitle>
          <SheetDescription>{t("peopleHint")}</SheetDescription>
        </SheetHeader>
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="supplierId" value={supplierId} />
          {person ? <input type="hidden" name="personId" value={person.id} /> : null}
          <Field label={t("personName")} name="fullName" defaultValue={person?.fullName ?? ""} required maxLength={160} />
          <Field label={t("personPosition")} name="position" defaultValue={person?.position ?? ""} maxLength={120} />
          <Field label={t("personEmail")} name="email" defaultValue={person?.email ?? ""} type="email" maxLength={200} />
          <Field label={t("personPhone")} name="phone" defaultValue={person?.phone ?? ""} maxLength={40} />
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("preferredChannel")}</span>
            <select
              name="preferredChannel"
              defaultValue={person?.preferredChannel ?? ""}
              className="h-9 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">{t("unavailable")}</option>
              {communicationChannels.map((channel) => (
                <option key={channel} value={channel}>
                  {t(`channel.${channel}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPrimary" value="1" defaultChecked={person ? person.isPrimary : true} />
            {t("primary")}
          </label>
          <Submit label={person ? t("personSave") : t("addPerson")} />
          <PersonError state={state} />
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  maxLength: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="h-9 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </label>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Catalog");
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? t("saving") : label}
    </Button>
  );
}

function PersonError({ state }: { state: PersonState | null }) {
  const t = useTranslations("Catalog");
  if (!state || state.ok) return state?.ok ? <p className="text-xs text-primary">{t("personSaved")}</p> : null;
  const text =
    state.error === "duplicate" ? t("personDuplicate") : state.error === "invalid" ? t("personInvalid") : t("actionFailed");
  return <p className="text-xs text-destructive">{text}</p>;
}
