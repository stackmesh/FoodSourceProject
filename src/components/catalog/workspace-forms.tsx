"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ContactStatus } from "@/generated/prisma/client";
import { deleteNote, saveNote, updateContactStatus } from "@/server/actions";
import type { WorkspaceNote } from "@/server/catalog-types";

const statuses = [
  "NOT_CONTACTED",
  "TO_CONTACT",
  "CONTACTED",
  "REPLIED",
  "QUALIFIED",
  "REJECTED",
] as const;

function PendingButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Catalog");

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? t("saving") : label}
    </Button>
  );
}

export function ContactStatusForm({
  supplierId,
  status,
}: {
  supplierId: string;
  status: ContactStatus;
}) {
  const t = useTranslations("Catalog");
  const [state, action, pending] = useActionState(updateContactStatus, null);

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
        {statuses.map((item) => (
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
