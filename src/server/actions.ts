"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { demoWorkspaceKey } from "@/config/site";
import { compareCookieName, compareLimit, parseCompareSlugs } from "@/lib/comparison";
import { getPrisma } from "@/lib/prisma";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const idSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
);
const contactStatusSchema = z.enum([
  "NOT_CONTACTED",
  "TO_CONTACT",
  "CONTACTED",
  "REPLIED",
  "QUALIFIED",
  "REJECTED",
]);

export type FavoriteState = { ok: true; saved: boolean } | { ok: false; error: "invalid" | "missing" };
export type CompareState =
  | { ok: true; comparing: boolean }
  | { ok: false; error: "full" | "invalid" | "missing" };
export type NoteState = { ok: true } | { ok: false; error: "invalid" | "empty" | "missing" };
export type StatusState = { ok: true } | { ok: false; error: "invalid" | "missing" };

function refresh() {
  revalidatePath("/", "layout");
  revalidatePath("/en", "layout");
}

async function readCompareCookie() {
  const jar = await cookies();
  return parseCompareSlugs(jar.get(compareCookieName)?.value);
}

async function writeCompareCookie(slugs: string[]) {
  const jar = await cookies();
  jar.set(compareCookieName, slugs.join(","), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function toggleFavorite(
  _previous: FavoriteState | null,
  formData: FormData,
): Promise<FavoriteState> {
  const supplierId = idSchema.safeParse(String(formData.get("supplierId") ?? ""));
  if (!supplierId.success) {
    return { ok: false, error: "invalid" };
  }

  const prisma = getPrisma();
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId.data },
    select: { id: true },
  });
  if (!supplier) {
    return { ok: false, error: "missing" };
  }

  const where = {
    workspaceKey_supplierId: {
      workspaceKey: demoWorkspaceKey,
      supplierId: supplier.id,
    },
  };
  const existing = await prisma.shortlist.findUnique({ where });

  if (existing) {
    await prisma.supplierNote.deleteMany({
      where: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id },
    });
    await prisma.shortlist.delete({ where: { id: existing.id } });
    refresh();
    return { ok: true, saved: false };
  }

  await prisma.shortlist.create({
    data: { workspaceKey: demoWorkspaceKey, supplierId: supplier.id },
  });
  refresh();
  return { ok: true, saved: true };
}

export async function addToComparison(
  _previous: CompareState | null,
  formData: FormData,
): Promise<CompareState> {
  const slug = slugSchema.safeParse(String(formData.get("slug") ?? ""));
  if (!slug.success) {
    return { ok: false, error: "invalid" };
  }

  const supplier = await getPrisma().supplier.findUnique({
    where: { slug: slug.data },
    select: { slug: true },
  });
  if (!supplier) {
    return { ok: false, error: "missing" };
  }

  const current = await readCompareCookie();
  if (current.includes(supplier.slug)) {
    return { ok: true, comparing: true };
  }
  if (current.length >= compareLimit) {
    return { ok: false, error: "full" };
  }

  await writeCompareCookie([...current, supplier.slug]);
  refresh();
  return { ok: true, comparing: true };
}

export async function removeFromComparison(formData: FormData) {
  const slug = slugSchema.safeParse(String(formData.get("slug") ?? ""));
  if (!slug.success) {
    return;
  }

  const current = await readCompareCookie();
  await writeCompareCookie(current.filter((item) => item !== slug.data));
  refresh();
}

export async function saveNote(
  _previous: NoteState | null,
  formData: FormData,
): Promise<NoteState> {
  const supplierId = idSchema.safeParse(String(formData.get("supplierId") ?? ""));
  const noteId = String(formData.get("noteId") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!supplierId.success) {
    return { ok: false, error: "invalid" };
  }
  if (!content || content.length > 2000) {
    return { ok: false, error: "empty" };
  }

  const prisma = getPrisma();
  const saved = await prisma.shortlist.findUnique({
    where: {
      workspaceKey_supplierId: {
        workspaceKey: demoWorkspaceKey,
        supplierId: supplierId.data,
      },
    },
  });
  if (!saved) {
    return { ok: false, error: "missing" };
  }

  if (noteId) {
    const parsedId = idSchema.safeParse(noteId);
    if (!parsedId.success) {
      return { ok: false, error: "invalid" };
    }
    const note = await prisma.supplierNote.findFirst({
      where: {
        id: parsedId.data,
        workspaceKey: demoWorkspaceKey,
        supplierId: supplierId.data,
      },
    });
    if (!note) {
      return { ok: false, error: "missing" };
    }
    await prisma.supplierNote.update({
      where: { id: note.id },
      data: { content },
    });
  } else {
    await prisma.supplierNote.create({
      data: {
        workspaceKey: demoWorkspaceKey,
        supplierId: supplierId.data,
        content,
      },
    });
  }

  refresh();
  return { ok: true };
}

export async function deleteNote(formData: FormData) {
  const noteId = idSchema.safeParse(String(formData.get("noteId") ?? ""));
  if (!noteId.success) {
    return;
  }

  await getPrisma().supplierNote.deleteMany({
    where: { id: noteId.data, workspaceKey: demoWorkspaceKey },
  });
  refresh();
}

export async function updateContactStatus(
  _previous: StatusState | null,
  formData: FormData,
): Promise<StatusState> {
  const supplierId = idSchema.safeParse(String(formData.get("supplierId") ?? ""));
  const status = contactStatusSchema.safeParse(String(formData.get("status") ?? ""));
  if (!supplierId.success || !status.success) {
    return { ok: false, error: "invalid" };
  }

  const updated = await getPrisma().shortlist.updateMany({
    where: { workspaceKey: demoWorkspaceKey, supplierId: supplierId.data },
    data: { contactStatus: status.data },
  });
  if (updated.count === 0) {
    return { ok: false, error: "missing" };
  }

  refresh();
  return { ok: true };
}
