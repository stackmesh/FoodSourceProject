import { demoWorkspaceKey } from "@/config/site";
import type { CommunicationChannel, UserActivityType } from "@/lib/contact-activity";
import { countsAsContact } from "@/lib/contact-activity";
import type { ContactMethod, ContactStatus } from "@/lib/contact-tracking";
import { calendarToday, isContactStatus } from "@/lib/contact-tracking";
import { calendarDateInZone, serverTimeZone } from "@/lib/freshness";
import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  ActivityRecord,
  ContactPersonRecord,
  EngagementRecord,
  FollowUpRecord,
  WorkspaceNote,
} from "@/server/catalog-types";
import type { ActivityType } from "@/lib/contact-activity";

type Tx = Prisma.TransactionClient;

export type PersonDraft = {
  supplierId: string;
  personId: string | null;
  fullName: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  phoneKey: string | null;
  preferredChannel: CommunicationChannel | null;
  isPrimary: boolean;
};

export type EngagementDetails = {
  lastContactOn: string | null;
  nextFollowUpOn: string | null;
  contactPerson: string | null;
  contactMethod: ContactMethod | null;
};

function calendar(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function dateOnly(value: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function uniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function supplierExists(tx: Tx, supplierId: string) {
  const supplier = await tx.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true } });
  return supplier;
}

async function rememberPrimaryName(tx: Tx, supplierId: string, fullName: string) {
  await tx.shortlist.upsert({
    where: { workspaceKey_supplierId: { workspaceKey: demoWorkspaceKey, supplierId } },
    create: {
      workspaceKey: demoWorkspaceKey,
      supplierId,
      contactStatus: "NOT_CONTACTED",
      contactPerson: fullName,
    },
    update: { contactPerson: fullName },
  });
}

function toPerson(person: {
  id: string;
  fullName: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  preferredChannel: ContactPersonRecord["preferredChannel"];
  isPrimary: boolean;
}): ContactPersonRecord {
  return {
    id: person.id,
    fullName: person.fullName,
    position: person.position,
    email: person.email,
    phone: person.phone,
    preferredChannel: person.preferredChannel,
    isPrimary: person.isPrimary,
  };
}

function toActivity(activity: {
  id: string;
  type: ActivityRecord["type"];
  description: string;
  channel: ActivityRecord["channel"];
  occurredAt: Date;
  previousStatus: ActivityRecord["previousStatus"];
  newStatus: ActivityRecord["newStatus"];
  followUpOn: Date | null;
  contactPerson: { fullName: string } | null;
}): ActivityRecord {
  return {
    id: activity.id,
    type: activity.type,
    description: activity.description,
    channel: activity.channel,
    occurredAt: activity.occurredAt.toISOString(),
    previousStatus: activity.previousStatus,
    newStatus: activity.newStatus,
    followUpOn: calendar(activity.followUpOn),
    contactPersonName: activity.contactPerson?.fullName ?? null,
  };
}

export async function applyEngagement(
  tx: Tx,
  input: { supplierId: string; status: ContactStatus; details?: EngagementDetails },
) {
  const supplier = await supplierExists(tx, input.supplierId);
  if (!supplier) return { ok: false as const, error: "missing" as const };

  const existing = await tx.shortlist.findUnique({
    where: { workspaceKey_supplierId: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id } },
  });
  const previousStatus = existing?.contactStatus ?? "NOT_CONTACTED";
  const statusChanged = previousStatus !== input.status;
  const previousFollowUp = calendar(existing?.nextFollowUpOn);
  const followUpChanged = input.details ? previousFollowUp !== input.details.nextFollowUpOn : false;
  const now = new Date();

  await tx.shortlist.upsert({
    where: { workspaceKey_supplierId: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id } },
    create: {
      workspaceKey: demoWorkspaceKey,
      supplierId: supplier.id,
      contactStatus: input.status,
      lastContactOn: input.details ? dateOnly(input.details.lastContactOn) : null,
      nextFollowUpOn: input.details ? dateOnly(input.details.nextFollowUpOn) : null,
      contactPerson: input.details?.contactPerson ?? null,
      contactMethod: input.details?.contactMethod ?? null,
    },
    update: {
      contactStatus: input.status,
      ...(input.details
        ? {
            lastContactOn: dateOnly(input.details.lastContactOn),
            nextFollowUpOn: dateOnly(input.details.nextFollowUpOn),
            contactPerson: input.details.contactPerson,
            contactMethod: input.details.contactMethod,
          }
        : {}),
    },
  });

  if (statusChanged) {
    await tx.contactActivity.create({
      data: {
        workspaceKey: demoWorkspaceKey,
        supplierId: supplier.id,
        type: "STATUS_CHANGED",
        occurredAt: now,
        previousStatus,
        newStatus: input.status,
      },
    });
  }

  if (followUpChanged && input.details) {
    await tx.contactActivity.create({
      data: {
        workspaceKey: demoWorkspaceKey,
        supplierId: supplier.id,
        type: "FOLLOW_UP_SCHEDULED",
        occurredAt: new Date(now.getTime() + 1),
        followUpOn: dateOnly(input.details.nextFollowUpOn),
      },
    });
  }

  return { ok: true as const };
}

export async function changeStatus(
  supplierId: string,
  status: string,
  details?: EngagementDetails,
) {
  if (!isContactStatus(status)) return { ok: false as const, error: "invalid" as const };
  return getPrisma().$transaction((tx) => applyEngagement(tx, { supplierId, status, ...(details ? { details } : {}) }));
}

export async function updateOwnedNote(supplierId: string, noteId: string, content: string) {
  const updated = await getPrisma().supplierNote.updateMany({
    where: { id: noteId, workspaceKey: demoWorkspaceKey, supplierId },
    data: { content },
  });
  return updated.count === 1;
}

async function duplicatePerson(tx: Tx, draft: PersonDraft) {
  const exclude = draft.personId ? { id: { not: draft.personId } } : {};
  const scope = { workspaceKey: demoWorkspaceKey, supplierId: draft.supplierId, ...exclude };

  if (draft.email) {
    const email = await tx.supplierContactPerson.findFirst({ where: { ...scope, email: draft.email }, select: { id: true } });
    if (email) return true;
  }
  if (draft.phoneKey) {
    const phone = await tx.supplierContactPerson.findFirst({
      where: { ...scope, phoneKey: draft.phoneKey },
      select: { id: true },
    });
    if (phone) return true;
  }
  if (!draft.email && !draft.phoneKey) {
    const sameName = await tx.supplierContactPerson.findFirst({
      where: {
        ...scope,
        email: null,
        phoneKey: null,
        fullName: { equals: draft.fullName, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (sameName) return true;
  }
  return false;
}

export async function saveContactPerson(draft: PersonDraft) {
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
      const supplier = await supplierExists(tx, draft.supplierId);
      if (!supplier) return { ok: false as const, error: "missing" as const };
      const existingPerson = draft.personId
        ? await tx.supplierContactPerson.findFirst({
            where: { id: draft.personId, workspaceKey: demoWorkspaceKey, supplierId: draft.supplierId },
            select: { id: true, fullName: true, isPrimary: true },
          })
        : null;
      if (draft.personId && !existingPerson) return { ok: false as const, error: "missing" as const };
      if (await duplicatePerson(tx, draft)) return { ok: false as const, error: "duplicate" as const };

      if (draft.isPrimary) {
        await tx.supplierContactPerson.updateMany({
          where: {
            workspaceKey: demoWorkspaceKey,
            supplierId: draft.supplierId,
            isPrimary: true,
            ...(draft.personId ? { id: { not: draft.personId } } : {}),
          },
          data: { isPrimary: false },
        });
      }

      const data = {
        fullName: draft.fullName,
        position: draft.position,
        email: draft.email,
        phone: draft.phone,
        phoneKey: draft.phoneKey,
        preferredChannel: draft.preferredChannel,
        isPrimary: draft.isPrimary,
      };

      if (draft.personId) {
        await tx.supplierContactPerson.update({ where: { id: draft.personId }, data });
      } else {
        await tx.supplierContactPerson.create({
          data: { workspaceKey: demoWorkspaceKey, supplierId: draft.supplierId, ...data },
        });
      }

      if (draft.isPrimary) {
        await rememberPrimaryName(tx, draft.supplierId, draft.fullName);
      } else if (existingPerson?.isPrimary) {
        await tx.shortlist.updateMany({
          where: {
            workspaceKey: demoWorkspaceKey,
            supplierId: draft.supplierId,
            contactPerson: existingPerson.fullName,
          },
          data: { contactPerson: null },
        });
      }
      return { ok: true as const };
    });
  } catch (error) {
    if (uniqueViolation(error)) return { ok: false as const, error: "duplicate" as const };
    throw error;
  }
}

export async function removeContactPerson(supplierId: string, personId: string) {
  return getPrisma().$transaction(async (tx) => {
    const person = await tx.supplierContactPerson.findFirst({
      where: { id: personId, workspaceKey: demoWorkspaceKey, supplierId },
      select: { id: true, fullName: true },
    });
    if (!person) return false;
    await tx.supplierContactPerson.delete({ where: { id: person.id } });
    await tx.shortlist.updateMany({
      where: { workspaceKey: demoWorkspaceKey, supplierId, contactPerson: person.fullName },
      data: { contactPerson: null },
    });
    return true;
  });
}

export async function setPrimaryContact(supplierId: string, personId: string) {
  return getPrisma().$transaction(async (tx) => {
    const supplier = await supplierExists(tx, supplierId);
    if (!supplier) return { ok: false as const, error: "missing" as const };
    const person = await tx.supplierContactPerson.findFirst({
      where: { id: personId, workspaceKey: demoWorkspaceKey, supplierId: supplier.id },
      select: { id: true, fullName: true },
    });
    if (!person) return { ok: false as const, error: "missing" as const };

    await tx.supplierContactPerson.updateMany({
      where: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id, isPrimary: true, id: { not: person.id } },
      data: { isPrimary: false },
    });
    await tx.supplierContactPerson.update({ where: { id: person.id }, data: { isPrimary: true } });
    await rememberPrimaryName(tx, supplier.id, person.fullName);
    return { ok: true as const };
  });
}

export async function getContactPerson(supplierId: string, personId: string) {
  const person = await getPrisma().supplierContactPerson.findFirst({
    where: { id: personId, workspaceKey: demoWorkspaceKey, supplierId },
  });
  return person ? toPerson(person) : null;
}

export async function listContactPeople(supplierId: string) {
  const people = await getPrisma().supplierContactPerson.findMany({
    where: { workspaceKey: demoWorkspaceKey, supplierId },
    orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }],
  });
  return people.map(toPerson);
}

export async function getEngagement(supplierId: string): Promise<EngagementRecord | null> {
  const supplier = await getPrisma().supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
  if (!supplier) return null;
  const entry = await getPrisma().shortlist.findUnique({
    where: { workspaceKey_supplierId: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id } },
  });
  if (!entry) {
    return {
      supplierId: supplier.id,
      contactStatus: "NOT_CONTACTED",
      lastContactOn: null,
      nextFollowUpOn: null,
      contactPerson: null,
      contactMethod: null,
      persisted: false,
    };
  }
  return {
    supplierId: supplier.id,
    contactStatus: entry.contactStatus,
    lastContactOn: calendar(entry.lastContactOn),
    nextFollowUpOn: calendar(entry.nextFollowUpOn),
    contactPerson: entry.contactPerson,
    contactMethod: entry.contactMethod,
    persisted: true,
  };
}

export async function setFollowUp(supplierId: string, nextFollowUpOn: string | null) {
  const engagement = await getEngagement(supplierId);
  if (!engagement) return { ok: false as const, error: "missing" as const };
  return changeStatus(supplierId, engagement.contactStatus, {
    lastContactOn: engagement.lastContactOn,
    nextFollowUpOn,
    contactPerson: engagement.contactPerson,
    contactMethod: engagement.contactMethod,
  });
}

export async function listFollowUps(scope: "upcoming" | "overdue", today: string): Promise<FollowUpRecord[]> {
  const day = dateOnly(today);
  if (!day) return [];
  const rows = await getPrisma().shortlist.findMany({
    where: {
      workspaceKey: demoWorkspaceKey,
      nextFollowUpOn: scope === "overdue" ? { lt: day } : { gte: day },
    },
    orderBy: [{ nextFollowUpOn: "asc" }, { supplierId: "asc" }],
    select: {
      supplierId: true,
      contactStatus: true,
      lastContactOn: true,
      nextFollowUpOn: true,
      contactPerson: true,
    },
  });
  return rows.flatMap((row) => {
    const nextFollowUpOn = calendar(row.nextFollowUpOn);
    if (!nextFollowUpOn) return [];
    return [
      {
        supplierId: row.supplierId,
        contactStatus: row.contactStatus,
        lastContactOn: calendar(row.lastContactOn),
        nextFollowUpOn,
        contactPerson: row.contactPerson,
      },
    ];
  });
}

export async function recordNote(tx: Tx, supplierId: string, content: string) {
  await tx.contactActivity.create({
    data: {
      workspaceKey: demoWorkspaceKey,
      supplierId,
      type: "NOTE_ADDED",
      description: content,
      occurredAt: new Date(),
    },
  });
}

export async function createOwnedNote(supplierId: string, content: string) {
  return getPrisma().$transaction(async (tx) => {
    const supplier = await supplierExists(tx, supplierId);
    if (!supplier) return { ok: false as const, error: "missing" as const };
    await tx.shortlist.upsert({
      where: { workspaceKey_supplierId: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id } },
      create: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id },
      update: {},
    });
    const note = await tx.supplierNote.create({
      data: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id, content },
    });
    await recordNote(tx, supplier.id, content);
    return { ok: true as const, id: note.id };
  });
}

export async function deleteOwnedNote(noteId: string, supplierId: string) {
  const removed = await getPrisma().supplierNote.deleteMany({
    where: {
      id: noteId,
      workspaceKey: demoWorkspaceKey,
      supplierId,
    },
  });
  return removed.count === 1;
}

export async function listNotes(supplierId: string): Promise<WorkspaceNote[]> {
  const notes = await getPrisma().supplierNote.findMany({
    where: { workspaceKey: demoWorkspaceKey, supplierId },
    orderBy: { createdAt: "asc" },
  });
  return notes.map((note) => ({
    id: note.id,
    supplierId: note.supplierId,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }));
}

const activityPageSizeMax = 100;

export async function listActivities(
  supplierId: string,
  input?: { type?: ActivityType; page?: number; pageSize?: number },
) {
  const page = Math.max(1, Math.floor(input?.page ?? 1));
  const pageSize = Math.min(activityPageSizeMax, Math.max(1, Math.floor(input?.pageSize ?? 50)));
  const where = {
    workspaceKey: demoWorkspaceKey,
    supplierId,
    ...(input?.type ? { type: input.type } : {}),
  };
  const [total, rows] = await Promise.all([
    getPrisma().contactActivity.count({ where }),
    getPrisma().contactActivity.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { contactPerson: { select: { fullName: true } } },
    }),
  ]);
  return { items: rows.map(toActivity), page, pageSize, total };
}

export async function createCommunication(
  input: {
    supplierId: string;
    contactPersonId: string | null;
    type: UserActivityType;
    description: string;
    channel: CommunicationChannel | null;
    occurredAt: Date;
  },
) {
  return getPrisma().$transaction(async (tx) => {
    const supplier = await supplierExists(tx, input.supplierId);
    if (!supplier) return { ok: false as const, error: "missing" as const };

    let contactPersonId: string | null = null;
    if (input.contactPersonId) {
      const person = await tx.supplierContactPerson.findFirst({
        where: { id: input.contactPersonId, workspaceKey: demoWorkspaceKey, supplierId: supplier.id },
        select: { id: true },
      });
      if (!person) return { ok: false as const, error: "contact" as const };
      contactPersonId = person.id;
    }

    await tx.shortlist.upsert({
      where: { workspaceKey_supplierId: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id } },
      create: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id },
      update: {},
    });

    if (countsAsContact(input.type)) {
      const day = calendarDateInZone(input.occurredAt, serverTimeZone());
      const entry = await tx.shortlist.findUnique({
        where: { workspaceKey_supplierId: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id } },
        select: { lastContactOn: true },
      });
      const current = calendar(entry?.lastContactOn);
      if (day && day <= calendarToday() && (!current || day > current)) {
        await tx.shortlist.update({
          where: { workspaceKey_supplierId: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id } },
          data: { lastContactOn: dateOnly(day) },
        });
      }
    }

    await tx.contactActivity.create({
      data: {
        workspaceKey: demoWorkspaceKey,
        supplierId: supplier.id,
        contactPersonId,
        type: input.type,
        description: input.description,
        channel: input.channel,
        occurredAt: input.occurredAt,
      },
    });
    return { ok: true as const };
  });
}

export async function getRelationship(supplierId: string) {
  const prisma = getPrisma();
  const [people, activities] = await Promise.all([
    prisma.supplierContactPerson.findMany({
      where: { workspaceKey: demoWorkspaceKey, supplierId },
      orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }],
    }),
    prisma.contactActivity.findMany({
      where: { workspaceKey: demoWorkspaceKey, supplierId },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      include: { contactPerson: { select: { fullName: true } } },
    }),
  ]);

  const contactPeople = people.map(toPerson);
  const history = activities.map(toActivity);

  return { people: contactPeople, activities: history };
}
