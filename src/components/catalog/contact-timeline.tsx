"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  CalendarClock,
  Mail,
  MessageSquare,
  Phone,
  Receipt,
  Reply,
  StickyNote,
  Users,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { activityTypes, communicationChannels, userActivityTypes, type ActivityType } from "@/lib/contact-activity";
import { formatCalendarDate, formatDateTime } from "@/lib/format";
import { addActivity, type ActivityState } from "@/server/actions";
import type { ActivityRecord, ContactPersonRecord } from "@/server/catalog-types";

const icons: Record<ActivityType, LucideIcon> = {
  EMAIL_SENT: Mail,
  PHONE_CALL: Phone,
  MESSAGE_SENT: MessageSquare,
  SUPPLIER_REPLIED: Reply,
  PRICE_RECEIVED: Receipt,
  MEETING: Users,
  STATUS_CHANGED: ArrowLeftRight,
  NOTE_ADDED: StickyNote,
  FOLLOW_UP_SCHEDULED: CalendarClock,
};

export function ContactTimeline({
  supplierId,
  activities,
  people,
  locale,
  timeZone,
  defaultWhen,
}: {
  supplierId: string;
  activities: ActivityRecord[];
  people: ContactPersonRecord[];
  locale: string;
  timeZone: string;
  defaultWhen: string;
}) {
  const t = useTranslations("Catalog");
  const [filter, setFilter] = useState<ActivityType | "">("");
  const visible = filter ? activities.filter((activity) => activity.type === filter) : activities;

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t("history")}</h2>
        <ActivitySheet supplierId={supplierId} people={people} defaultWhen={defaultWhen} />
      </div>
      {activities.length ? (
        <label className="mt-3 block max-w-xs text-sm">
          <span className="sr-only">{t("activityTypeLabel")}</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as ActivityType | "")}
            className="h-9 w-full rounded-md border bg-card px-3 text-sm"
          >
            <option value="">{t("allActivities")}</option>
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {t(`activityType.${type}`)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t("noHistory")}</p>
      )}
      {activities.length && !visible.length ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("historyFilterEmpty")}</p>
      ) : null}
      {visible.length ? (
        <ol className="mt-4 space-y-4">
          {visible.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} locale={locale} timeZone={timeZone} />
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function ActivityItem({
  activity,
  locale,
  timeZone,
}: {
  activity: ActivityRecord;
  locale: string;
  timeZone: string;
}) {
  const t = useTranslations("Catalog");
  const Icon = icons[activity.type];
  const statusLine =
    activity.type === "STATUS_CHANGED" && activity.previousStatus && activity.newStatus
      ? t("statusChange", {
          from: t(`contactStatus.${activity.previousStatus}`),
          to: t(`contactStatus.${activity.newStatus}`),
        })
      : null;
  const followUpLine =
    activity.type === "FOLLOW_UP_SCHEDULED"
      ? activity.followUpOn
        ? t("followUpSet", { date: formatCalendarDate(activity.followUpOn, locale) })
        : t("followUpCancelled")
      : null;

  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border ${
          activity.type === "STATUS_CHANGED" || activity.type === "NOTE_ADDED" || activity.type === "FOLLOW_UP_SCHEDULED"
            ? "bg-muted text-muted-foreground"
            : "border-primary/20 bg-primary/10 text-primary"
        }`}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-medium">{t(`activityType.${activity.type}`)}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(activity.occurredAt, locale, timeZone)}</p>
        {statusLine ? <p className="mt-1">{statusLine}</p> : null}
        {followUpLine ? <p className="mt-1">{followUpLine}</p> : null}
        {activity.description ? <p className="mt-1 whitespace-pre-wrap leading-6">{activity.description}</p> : null}
        {activity.contactPersonName || activity.channel ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {[
              activity.contactPersonName ? `${t("relatedContact")}: ${activity.contactPersonName}` : "",
              activity.channel ? t(`channel.${activity.channel}`) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function ActivitySheet({
  supplierId,
  people,
  defaultWhen,
}: {
  supplierId: string;
  people: ContactPersonRecord[];
  defaultWhen: string;
}) {
  const t = useTranslations("Catalog");
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(addActivity, null);
  const [seen, setSeen] = useState<ActivityState | null>(null);

  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t("addActivity")}
      </Button>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("addActivity")}</SheetTitle>
          <SheetDescription>{t("history")}</SheetDescription>
        </SheetHeader>
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="supplierId" value={supplierId} />
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("activityTypeLabel")}</span>
            <select name="type" defaultValue="EMAIL_SENT" className="h-9 w-full rounded-md border bg-card px-3 text-sm">
              {userActivityTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`activityType.${type}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("activityDescription")}</span>
            <textarea
              name="description"
              required
              maxLength={2000}
              rows={4}
              className="w-full rounded-md border bg-card px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("activityWhen")}</span>
            <input
              type="datetime-local"
              name="occurredAt"
              required
              defaultValue={defaultWhen}
              className="h-9 w-full rounded-md border bg-card px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("relatedContact")}</span>
            <select name="contactPersonId" defaultValue="" className="h-9 w-full rounded-md border bg-card px-3 text-sm">
              <option value="">{t("unavailable")}</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("contactMethod")}</span>
            <select name="channel" defaultValue="" className="h-9 w-full rounded-md border bg-card px-3 text-sm">
              <option value="">{t("unavailable")}</option>
              {communicationChannels.map((channel) => (
                <option key={channel} value={channel}>
                  {t(`channel.${channel}`)}
                </option>
              ))}
            </select>
          </label>
          <ActivitySubmit />
          <ActivityError state={state} />
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ActivitySubmit() {
  const { pending } = useFormStatus();
  const t = useTranslations("Catalog");
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? t("saving") : t("addActivity")}
    </Button>
  );
}

function ActivityError({ state }: { state: ActivityState | null }) {
  const t = useTranslations("Catalog");
  if (!state || state.ok) return state?.ok ? <p className="text-xs text-primary">{t("activitySaved")}</p> : null;
  const text =
    state.error === "contact" ? t("activityContact") : state.error === "invalid" ? t("activityInvalid") : t("actionFailed");
  return <p className="text-xs text-destructive">{text}</p>;
}
