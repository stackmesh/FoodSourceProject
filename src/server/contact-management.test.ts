import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { normalizeEmail, normalizePhone, parseZonedDateTime } from "@/lib/contact-activity";
import { isOverdueFollowUp } from "@/lib/contact-tracking";
import { getPrisma } from "@/lib/prisma";
import { searchSuppliers } from "@/server/catalog";
import {
  changeStatus,
  createCommunication,
  createOwnedNote,
  getContactPerson,
  getEngagement,
  getRelationship,
  listActivities,
  listFollowUps,
  listNotes,
  recordNote,
  applyEngagement,
  removeContactPerson,
  saveContactPerson,
  setFollowUp,
  setPrimaryContact,
  updateOwnedNote,
} from "@/server/contact-management";
import { createSupplier, deleteSupplier } from "@/server/supplier-records";
import type { DiscoveryQuery } from "@/lib/discovery-query";

assert.equal(normalizeEmail("  Buyer@Example.com "), "buyer@example.com");
assert.equal(normalizeEmail(""), null);
assert.equal(normalizeEmail("not-an-email"), undefined);
assert.equal(normalizePhone("")?.phone, null);
assert.equal(normalizePhone("+7 (495) 000-11-22")?.phoneKey, "74950001122");
assert.equal(normalizePhone("12"), undefined);
assert.equal(parseZonedDateTime("2026-02-31T10:00", "UTC"), null);
assert.ok(parseZonedDateTime("2020-01-02T09:30", "UTC"));
assert.equal(parseZonedDateTime("2099-01-01T00:00", "UTC"), null);
assert.equal(isOverdueFollowUp("2020-01-02", "2026-11-02"), true);

const city = "Городконтакттест";
const otherCity = "Городчужойконтакт";
const slug = "kontakt-upravlenie";
const otherSlug = "kontakt-chuzhoy";

function supplierInput(name: string, supplierSlug: string, supplierCity: string) {
  return {
    name,
    slug: supplierSlug,
    description: "Временная запись для проверки контактов.",
    supplierType: "OTHER" as const,
    city: supplierCity,
    region: "Тестовый регион",
    address: null,
    website: `https://example.com/demo/${supplierSlug}`,
    sourceUrl: `https://example.com/demo/${supplierSlug}`,
    dataType: "DEMO" as const,
    products: [
      {
        name: "Пробный продукт",
        categorySlug: "grocery",
        productType: "INGREDIENTS" as const,
        estimatedPrice: 10,
        minimumOrderQuantity: 4,
        unit: "кг",
        deliveryNotes: null,
      },
    ],
  };
}

function discovery(supplierCity: string, contact: DiscoveryQuery["contact"]): DiscoveryQuery {
  return {
    q: "",
    scope: "all",
    category: "",
    city: supplierCity,
    region: "",
    type: "",
    productType: "",
    certified: false,
    certificate: "",
    contact,
    freshness: "",
    maxPrice: null,
    maxMoq: null,
    sort: "name",
    page: 1,
  };
}

const prisma = getPrisma();
let supplierId = "";
let otherId = "";

try {
  for (const item of [
    { slug, name: "ДЕМО — Управление контактом", city },
    { slug: otherSlug, name: "ДЕМО — Чужой контакт", city: otherCity },
  ]) {
    const existing = await prisma.supplier.findUnique({ where: { slug: item.slug }, select: { id: true } });
    if (existing) await deleteSupplier(existing.id);
  }

  const created = await createSupplier(supplierInput("ДЕМО — Управление контактом", slug, city));
  const other = await createSupplier(supplierInput("ДЕМО — Чужой контакт", otherSlug, otherCity));
  supplierId = created.id;
  otherId = other.id;
  const before = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { name: true } });

  const invalid = await changeStatus(supplierId, "BANANA");
  assert.equal(invalid.ok, false);

  const first = await saveContactPerson({
    supplierId,
    personId: null,
    fullName: "Анна Соколова",
    position: "Менеджер по закупкам",
    email: "anna@example.com",
    phone: "+7 495 000-11-22",
    phoneKey: "74950001122",
    preferredChannel: "EMAIL",
    isPrimary: true,
  });
  assert.equal(first.ok, true);
  const duplicate = await saveContactPerson({
    supplierId,
    personId: null,
    fullName: "Другой человек",
    position: null,
    email: "anna@example.com",
    phone: null,
    phoneKey: null,
    preferredChannel: null,
    isPrimary: true,
  });
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.error, "duplicate");

  const second = await saveContactPerson({
    supplierId,
    personId: null,
    fullName: "Игорь Орлов",
    position: null,
    email: "igor@example.com",
    phone: "+7 495 000-33-44",
    phoneKey: "74950003344",
    preferredChannel: "PHONE",
    isPrimary: true,
  });
  assert.equal(second.ok, true);
  const people = await prisma.supplierContactPerson.findMany({ where: { supplierId }, orderBy: { fullName: "asc" } });
  assert.equal(people.filter((person) => person.isPrimary).length, 1);
  assert.equal(people.find((person) => person.fullName === "Игорь Орлов")?.isPrimary, true);
  assert.equal(people.find((person) => person.fullName === "Анна Соколова")?.isPrimary, false);

  const anna = people.find((person) => person.fullName === "Анна Соколова");
  assert.ok(anna);
  const renamed = await saveContactPerson({
    supplierId,
    personId: anna.id,
    fullName: "Анна Соколова",
    position: "Руководитель",
    email: "anna@example.com",
    phone: "+7 495 000-11-22",
    phoneKey: "74950001122",
    preferredChannel: "EMAIL",
    isPrimary: false,
  });
  assert.equal(renamed.ok, true);

  const foreign = await saveContactPerson({
    supplierId: otherId,
    personId: anna.id,
    fullName: "Чужое имя",
    position: null,
    email: null,
    phone: null,
    phoneKey: null,
    preferredChannel: null,
    isPrimary: false,
  });
  assert.equal(foreign.ok, false);

  const contacted = await changeStatus(supplierId, "CONTACTED");
  assert.equal(contacted.ok, true);
  const again = await changeStatus(supplierId, "CONTACTED");
  assert.equal(again.ok, true);
  const statusEvents = await prisma.contactActivity.count({
    where: { supplierId, type: "STATUS_CHANGED", newStatus: "CONTACTED" },
  });
  assert.equal(statusEvents, 1);

  const qualified = await changeStatus(supplierId, "QUALIFIED", {
    lastContactOn: "2026-10-01",
    nextFollowUpOn: "2099-03-01",
    contactPerson: "Анна Соколова",
    contactMethod: "EMAIL",
  });
  assert.equal(qualified.ok, true);
  const moved = await changeStatus(supplierId, "QUALIFIED", {
    lastContactOn: "2026-10-01",
    nextFollowUpOn: "2099-04-01",
    contactPerson: "Анна Соколова",
    contactMethod: "EMAIL",
  });
  assert.equal(moved.ok, true);
  const cancelled = await changeStatus(supplierId, "QUALIFIED", {
    lastContactOn: "2026-10-01",
    nextFollowUpOn: null,
    contactPerson: "Анна Соколова",
    contactMethod: "EMAIL",
  });
  assert.equal(cancelled.ok, true);
  const followUps = await prisma.contactActivity.findMany({
    where: { supplierId, type: "FOLLOW_UP_SCHEDULED" },
    orderBy: { occurredAt: "asc" },
  });
  assert.equal(followUps.length, 3);
  assert.equal(followUps[2]?.followUpOn, null);
  const overdue = await changeStatus(supplierId, "NEGOTIATING", {
    lastContactOn: "2026-10-01",
    nextFollowUpOn: "2020-01-02",
    contactPerson: "Анна Соколова",
    contactMethod: "EMAIL",
  });
  assert.equal(overdue.ok, true);
  const stored = await prisma.shortlist.findUnique({
    where: { workspaceKey_supplierId: { workspaceKey: "demo-workspace", supplierId } },
  });
  assert.equal(stored?.contactStatus, "NEGOTIATING");
  assert.equal(isOverdueFollowUp(stored?.nextFollowUpOn?.toISOString().slice(0, 10) ?? null, "2026-11-02"), true);

  const beforeRollback = await prisma.contactActivity.count({ where: { supplierId } });
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      const result = await applyEngagement(tx, { supplierId, status: "REJECTED" });
      assert.equal(result.ok, true);
      throw new Error("rollback");
    }),
  );
  const afterRollback = await prisma.shortlist.findUnique({
    where: { workspaceKey_supplierId: { workspaceKey: "demo-workspace", supplierId } },
  });
  assert.equal(afterRollback?.contactStatus, "NEGOTIATING");
  assert.equal(await prisma.contactActivity.count({ where: { supplierId } }), beforeRollback);

  const emailed = await createCommunication({
    supplierId,
    contactPersonId: anna.id,
    type: "EMAIL_SENT",
    description: "Запросили прайс",
    channel: "EMAIL",
    occurredAt: new Date("2026-01-15T09:00:00.000Z"),
  });
  assert.equal(emailed.ok, true);
  const called = await createCommunication({
    supplierId,
    contactPersonId: null,
    type: "PHONE_CALL",
    description: "Созвон",
    channel: "PHONE",
    occurredAt: new Date("2026-06-15T09:00:00.000Z"),
  });
  assert.equal(called.ok, true);
  const rejected = await createCommunication({
    supplierId: otherId,
    contactPersonId: anna.id,
    type: "MEETING",
    description: "Чужая встреча",
    channel: null,
    occurredAt: new Date("2026-06-16T09:00:00.000Z"),
  });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.error, "contact");
  assert.equal(await prisma.contactActivity.count({ where: { supplierId: otherId } }), 0);

  const history = await getRelationship(supplierId);
  const communication = history.activities.filter((item) => item.type === "EMAIL_SENT" || item.type === "PHONE_CALL");
  assert.equal(communication[0]?.type, "PHONE_CALL");
  assert.equal(communication[1]?.type, "EMAIL_SENT");
  assert.equal(communication[1]?.contactPersonName, "Анна Соколова");
  assert.equal(await getContactPerson(otherId, anna.id), null);
  assert.equal((await getContactPerson(supplierId, anna.id))?.email, "anna@example.com");
  const igor = people.find((person) => person.fullName === "Игорь Орлов");
  assert.ok(igor);
  const madePrimary = await setPrimaryContact(supplierId, igor.id);
  assert.equal(madePrimary.ok, true);
  assert.equal(await prisma.supplierContactPerson.count({ where: { supplierId, isPrimary: true } }), 1);
  assert.equal((await getEngagement(supplierId))?.contactPerson, "Игорь Орлов");
  const missingPrimary = await setPrimaryContact(supplierId, randomUUID());
  assert.equal(missingPrimary.ok, false);
  const calls = await listActivities(supplierId, { type: "PHONE_CALL", page: 1, pageSize: 1 });
  assert.equal(calls.total, 1);
  assert.equal(calls.items[0]?.type, "PHONE_CALL");
  assert.equal((await listActivities(supplierId, { type: "PHONE_CALL", page: 2, pageSize: 1 })).items.length, 0);
  const statusRow = history.activities.find((item) => item.type === "STATUS_CHANGED" && item.newStatus === "CONTACTED");
  assert.equal(statusRow?.previousStatus, "NOT_CONTACTED");
  assert.equal(statusRow?.newStatus, "CONTACTED");

  assert.equal(await removeContactPerson(supplierId, anna.id), true);
  const afterDelete = await getRelationship(supplierId);
  assert.equal(afterDelete.people.some((person) => person.id === anna.id), false);
  assert.equal(afterDelete.activities.find((item) => item.type === "EMAIL_SENT")?.contactPersonName, null);
  assert.equal(afterDelete.people.filter((person) => person.isPrimary).length, 1);

  const noteId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.supplierNote.create({
      data: { id: noteId, workspaceKey: "demo-workspace", supplierId, content: "Первая заметка" },
    });
    await recordNote(tx, supplierId, "Первая заметка");
  });
  const foreignNoteId = randomUUID();
  await prisma.supplierNote.create({
    data: { id: foreignNoteId, workspaceKey: "other-workspace", supplierId, content: "Чужая заметка" },
  });
  assert.equal(await updateOwnedNote(supplierId, foreignNoteId, "Подмена"), false);
  const foreignNote = await prisma.supplierNote.findUnique({ where: { id: foreignNoteId } });
  assert.equal(foreignNote?.content, "Чужая заметка");
  assert.equal(await updateOwnedNote(supplierId, noteId, "Исправленная заметка"), true);
  const notes = await prisma.contactActivity.count({ where: { supplierId, type: "NOTE_ADDED" } });
  assert.equal(notes, 1);
  const edited = await prisma.supplierNote.findUnique({ where: { id: noteId } });
  assert.equal(edited?.content, "Исправленная заметка");

  assert.equal((await listFollowUps("overdue", "2026-11-02")).some((row) => row.supplierId === supplierId), true);
  const scheduled = await setFollowUp(supplierId, "2099-05-01");
  assert.equal(scheduled.ok, true);
  const repeated = await setFollowUp(supplierId, "2099-05-01");
  assert.equal(repeated.ok, true);
  assert.equal(
    await prisma.contactActivity.count({
      where: { supplierId, type: "FOLLOW_UP_SCHEDULED", followUpOn: new Date("2099-05-01T00:00:00.000Z") },
    }),
    1,
  );
  const cleared = await setFollowUp(supplierId, null);
  assert.equal(cleared.ok, true);
  assert.equal((await listFollowUps("upcoming", "2026-11-02")).some((row) => row.supplierId === supplierId), false);
  assert.equal((await listFollowUps("overdue", "2026-11-02")).some((row) => row.supplierId === supplierId), false);
  assert.equal(await prisma.shortlist.count({ where: { supplierId } }), 1);

  const secondNote = await createOwnedNote(supplierId, "Вторая заметка");
  assert.equal(secondNote.ok, true);
  assert.equal(await prisma.contactActivity.count({ where: { supplierId, type: "NOTE_ADDED" } }), 2);
  assert.equal((await listNotes(supplierId)).some((note) => note.content === "Вторая заметка"), true);
  assert.equal((await listNotes(otherId)).length, 0);

  const negotiating = await searchSuppliers(discovery(city, "NEGOTIATING"));
  assert.equal(negotiating.items.some((item) => item.supplier.slug === slug), true);
  const contactedOnly = await searchSuppliers(discovery(city, "CONTACTED"));
  assert.equal(contactedOnly.items.some((item) => item.supplier.slug === slug), false);
  const untouched = await searchSuppliers(discovery(otherCity, "NOT_CONTACTED"));
  assert.equal(untouched.items.some((item) => item.supplier.slug === otherSlug), true);

  const after = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { name: true, products: { select: { id: true } } },
  });
  assert.equal(after?.name, before?.name);
  assert.equal(after?.products.length, 1);
} finally {
  for (const id of [supplierId, otherId].filter(Boolean)) {
    await prisma.supplierNote.deleteMany({ where: { supplierId: id } });
    await prisma.contactActivity.deleteMany({ where: { supplierId: id } });
    await prisma.supplierContactPerson.deleteMany({ where: { supplierId: id } });
    await prisma.shortlist.deleteMany({ where: { supplierId: id } });
    await deleteSupplier(id);
  }
  await prisma.$disconnect();
}
