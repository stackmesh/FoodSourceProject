"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  Bookmark,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock,
  Handshake,
  Mail,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContactStatus } from "@/generated/prisma/client";
import { contactMethods, contactStatuses, isOverdueFollowUp } from "@/lib/contact-tracking";
import { formatCalendarDate, formatDate } from "@/lib/format";
import { deleteNote, saveNote, updateContactStatus } from "@/server/actions";
import type { WorkspaceEntry, WorkspaceNote } from "@/server/catalog-types";

function PendingButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Catalog");

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? t("saving") : label}
    </Button>
  );
}

const contactStatusIcons: Record<ContactStatus, { icon: LucideIcon; className: string }> = {
  NOT_CONTACTED: { icon: Phone, className: "text-muted-foreground" },
  CONTACTED: { icon: Phone, className: "text-muted-foreground" },
  AWAITING_RESPONSE: { icon: Clock, className: "text-muted-foreground" },
  RESPONDED: { icon: Mail, className: "text-muted-foreground" },
  NEGOTIATING: { icon: Handshake, className: "text-muted-foreground" },
  QUALIFIED: { icon: CircleCheck, className: "text-primary" },
  REJECTED: { icon: CircleX, className: "text-red-500" },
};

export function ContactStatusForm({
  supplierId,
  status,
  appearance = "inline",
  followUpOn = null,
  lastContactOn = null,
  contactPerson = null,
  today = "",
  locale = "ru",
}: {
  supplierId: string;
  status: ContactStatus;
  appearance?: "inline" | "card";
  followUpOn?: string | null;
  lastContactOn?: string | null;
  contactPerson?: string | null;
  today?: string;
  locale?: string;
}) {
  const t = useTranslations("Catalog");
  const profile = useTranslations("Profile");
  const [state, action, pending] = useActionState(updateContactStatus, null);
  const [current, setCurrent] = useState(status);
  const [seen, setSeen] = useState(status);
  if (seen !== status) {
    setSeen(status);
    setCurrent(status);
  }
  const selected = contactStatusIcons[current];
  const SelectedIcon = selected.icon;

  if (appearance === "inline") {
    return (
      <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor={`status-${supplierId}`}>
          {t("status")}
        </label>
        <select
          id={`status-${supplierId}`}
          name="status"
          defaultValue={status}
          className="h-9 w-full rounded-md border bg-card px-3 text-sm sm:max-w-xs"
        >
          {contactStatuses.map((item) => (
            <option key={item} value={item}>
              {t(`contactStatus.${item}`)}
            </option>
          ))}
        </select>
        <input type="hidden" name="supplierId" value={supplierId} />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? t("saving") : t("saveStatus")}
        </Button>
        {state?.ok ? <p className="text-xs text-primary">{t("statusSaved")}</p> : null}
        {state && !state.ok ? <p className="text-xs text-destructive">{t("actionFailed")}</p> : null}
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-1.5 sm:items-end">
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        {t("status")}
        <CircleHelp className="size-3.5" aria-label={profile("saveFirst")}>
          <title>{profile("saveFirst")}</title>
        </CircleHelp>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="supplierId" value={supplierId} />
        <input type="hidden" name="status" value={current} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={pending}
              className="inline-flex h-10 min-w-44 items-center gap-2 rounded-lg border bg-card px-3 text-sm disabled:opacity-50"
            >
              <SelectedIcon className={`size-4 ${selected.className}`} />
              <span className="flex-1 text-left">{t(`contactStatus.${current}`)}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {contactStatuses.map((item) => {
              const option = contactStatusIcons[item];
              const Icon = option.icon;
              return (
                <DropdownMenuItem
                  key={item}
                  onSelect={() => setCurrent(item)}
                  className={item === current ? "bg-primary/10" : undefined}
                >
                  <Icon className={option.className} />
                  {t(`contactStatus.${item}`)}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="submit" variant="outline" className="h-10 rounded-lg" disabled={pending}>
          <Bookmark />
          {pending ? t("saving") : t("saveStatus")}
        </Button>
      </div>
      <CardStatusNote
        followUpOn={followUpOn}
        lastContactOn={lastContactOn}
        contactPerson={contactPerson}
        today={today}
        locale={locale}
      />
      {state && !state.ok ? <p className="text-xs text-destructive">{t("actionFailed")}</p> : null}
    </form>
  );
}

function CardStatusNote({
  followUpOn,
  lastContactOn,
  contactPerson,
  today,
  locale,
}: {
  followUpOn: string | null;
  lastContactOn: string | null;
  contactPerson: string | null;
  today: string;
  locale: string;
}) {
  const t = useTranslations("Catalog");
  const overdue = isOverdueFollowUp(followUpOn, today);
  const person = contactPerson?.trim() ?? "";

  if (followUpOn) {
    return (
      <p className={`text-xs ${overdue ? "font-medium text-amber-800" : "text-muted-foreground"}`}>
        {t("followUp")}: {formatCalendarDate(followUpOn, locale)}
        {overdue ? ` · ${t("overdue")}` : ""}
      </p>
    );
  }

  if (lastContactOn) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("lastContact")}: {formatCalendarDate(lastContactOn, locale)}
      </p>
    );
  }

  if (person) {
    return <p className="text-xs text-muted-foreground">{t("contactPerson")}: {person}</p>;
  }

  return null;
}

export function ContactTracking({
  supplierId,
  entry,
  today,
  locale,
}: {
  supplierId: string;
  entry: WorkspaceEntry | null;
  today: string;
  locale: string;
}) {
  const t = useTranslations("Catalog");
  const [state, action, pending] = useActionState(updateContactStatus, null);
  const overdue = isOverdueFollowUp(entry?.nextFollowUpOn ?? null, today);
  const unavailable = t("unavailable");

  return (
    <div className="space-y-3">
      {overdue ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
          {t("overdue")}
        </p>
      ) : null}
      <form action={action} className="space-y-3">
        <input type="hidden" name="supplierId" value={supplierId} />
        <input type="hidden" name="details" value="1" />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("status")}</span>
          <select
            name="status"
            defaultValue={entry?.contactStatus ?? "NOT_CONTACTED"}
            className="h-9 w-full rounded-md border bg-card px-3 text-sm"
          >
            {contactStatuses.map((item) => (
              <option key={item} value={item}>
                {t(`contactStatus.${item}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("lastContact")}</span>
            <input
              type="date"
              name="lastContactOn"
              defaultValue={entry?.lastContactOn ?? ""}
              className="h-9 w-full rounded-md border bg-card px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("followUp")}</span>
            <input
              type="date"
              name="nextFollowUpOn"
              defaultValue={entry?.nextFollowUpOn ?? ""}
              className="h-9 w-full rounded-md border bg-card px-3 text-sm"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("contactPerson")}</span>
            <input
              name="contactPerson"
              defaultValue={entry?.contactPerson ?? ""}
              maxLength={120}
              className="h-9 w-full rounded-md border bg-card px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("contactMethod")}</span>
            <select
              name="contactMethod"
              defaultValue={entry?.contactMethod ?? ""}
              className="h-9 w-full rounded-md border bg-card px-3 text-sm"
            >
              <option value="">{unavailable}</option>
              {contactMethods.map((method) => (
                <option key={method} value={method}>
                  {t(`contactMethodOption.${method}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("saving") : t("saveStatus")}
        </Button>
        {state && !state.ok ? <p className="text-xs text-destructive">{t("actionFailed")}</p> : null}
        {state?.ok ? <p className="text-xs text-primary">{t("statusSaved")}</p> : null}
      </form>
      <div>
        <h3 className="text-sm font-medium">{t("activity")}</h3>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <Summary
            label={t("status")}
            value={t(`contactStatus.${entry?.contactStatus ?? "NOT_CONTACTED"}`)}
          />
          <Summary
            label={t("lastContact")}
            value={entry?.lastContactOn ? formatCalendarDate(entry.lastContactOn, locale) : unavailable}
            missing={!entry?.lastContactOn}
          />
          <Summary
            label={t("followUp")}
            value={entry?.nextFollowUpOn ? formatCalendarDate(entry.nextFollowUpOn, locale) : unavailable}
            missing={!entry?.nextFollowUpOn}
            caution={overdue}
          />
          <Summary label={t("contactPerson")} value={entry?.contactPerson || unavailable} missing={!entry?.contactPerson} />
          <Summary
            label={t("contactMethod")}
            value={entry?.contactMethod ? t(`contactMethodOption.${entry.contactMethod}`) : unavailable}
            missing={!entry?.contactMethod}
          />
          <Summary
            label={t("updated")}
            value={entry ? formatDate(entry.updatedAt, locale) : unavailable}
            missing={!entry}
          />
        </dl>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  missing = false,
  caution = false,
}: {
  label: string;
  value: string;
  missing?: boolean;
  caution?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={missing ? "text-muted-foreground" : caution ? "font-medium text-amber-800" : "font-medium"}>
        {value}
      </dd>
    </div>
  );
}

export function NoteEditor({
  supplierId,
  note,
}: {
  supplierId: string;
  note?: WorkspaceNote;
}) {
  const t = useTranslations("Catalog");
  const [state, action] = useActionState(saveNote, null);
  const [text, setText] = useState(note?.content ?? "");
  const [seen, setSeen] = useState(state);
  const deleteFormId = note ? `delete-note-${note.id}` : undefined;

  if (state !== seen) {
    setSeen(state);
    if (state?.ok && !note) {
      setText("");
    }
  }

  return (
    <>
      <form action={action} className="space-y-2">
        <label className="sr-only" htmlFor={note ? `note-${note.id}` : `note-new-${supplierId}`}>
          {t("notes")}
        </label>
        <textarea
          id={note ? `note-${note.id}` : `note-new-${supplierId}`}
          name="content"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder={t("notePlaceholder")}
          className="w-full rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <input type="hidden" name="supplierId" value={supplierId} />
        {note ? <input type="hidden" name="noteId" value={note.id} /> : null}
        <div className="flex flex-wrap items-center gap-2">
          <PendingButton label={note ? t("saveNote") : t("addNote")} />
          {note ? (
            <Button type="submit" form={deleteFormId} variant="ghost" size="sm">
              {t("deleteNote")}
            </Button>
          ) : null}
          {state?.ok ? <p className="text-xs text-primary">{t("noteSaved")}</p> : null}
          {state && !state.ok ? (
            <p className="text-xs text-destructive">
              {state.error === "empty" ? t("noteEmpty") : t("actionFailed")}
            </p>
          ) : null}
        </div>
      </form>
      {note ? (
        <form id={deleteFormId} action={deleteNote} className="hidden">
          <input type="hidden" name="noteId" value={note.id} />
        </form>
      ) : null}
    </>
  );
}
