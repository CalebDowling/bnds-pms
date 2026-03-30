"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── LIST DOCUMENTS ──────────────────────────

export async function getPatientDocuments(
  patientId: string,
  {
    category,
    search,
    includeArchived = false,
  }: {
    category?: string;
    search?: string;
    includeArchived?: boolean;
  } = {}
) {
  await requireUser();

  const where: Record<string, unknown> = { patientId };

  if (category && category !== "all") {
    where.category = category;
  }

  if (!includeArchived) {
    where.isArchived = false;
  }

  if (search) {
    where.OR = [
      { fileName: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { hasSome: [search.toLowerCase()] } },
    ];
  }

  const documents = await prisma.patientDocument.findMany({
    where,
    include: {
      uploader: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return documents;
}

// ─── GET SINGLE DOCUMENT ────────────────────

export async function getDocument(id: string) {
  await requireUser();

  return prisma.patientDocument.findUnique({
    where: { id },
    include: {
      uploader: {
        select: { id: true, firstName: true, lastName: true },
      },
      patient: {
        select: { id: true, firstName: true, lastName: true, mrn: true },
      },
    },
  });
}

// ─── GET DOCUMENT CATEGORIES WITH COUNTS ────

export async function getDocumentCategoryCounts(patientId: string) {
  await requireUser();

  const counts = await prisma.patientDocument.groupBy({
    by: ["category"],
    where: { patientId, isArchived: false },
    _count: { id: true },
  });

  return counts.map((c) => ({
    category: c.category,
    count: c._count.id,
  }));
}

// ─── CREATE DOCUMENT RECORD ─────────────────

export async function createDocumentRecord(data: {
  patientId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  storageUrl: string;
  category?: string;
  description?: string;
  tags?: string[];
}) {
  const user = await requireUser();

  const doc = await prisma.patientDocument.create({
    data: {
      patientId: data.patientId,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      storagePath: data.storagePath,
      storageUrl: data.storageUrl,
      category: data.category || "general",
      description: data.description || null,
      tags: data.tags || [],
      uploadedBy: user.id,
    },
  });

  revalidatePath(`/patients/${data.patientId}`);
  return doc;
}

// ─── UPDATE DOCUMENT ────────────────────────

export async function updateDocument(
  id: string,
  data: {
    category?: string;
    description?: string;
    tags?: string[];
  }
) {
  await requireUser();

  const doc = await prisma.patientDocument.update({
    where: { id },
    data: {
      ...(data.category !== undefined && { category: data.category }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.tags !== undefined && { tags: data.tags }),
    },
  });

  revalidatePath(`/patients/${doc.patientId}`);
  return doc;
}

// ─── ARCHIVE DOCUMENT ───────────────────────

export async function archiveDocument(id: string) {
  await requireUser();

  const doc = await prisma.patientDocument.update({
    where: { id },
    data: { isArchived: true },
  });

  revalidatePath(`/patients/${doc.patientId}`);
  return doc;
}

// ─── DELETE DOCUMENT (removes from storage too) ─

export async function deleteDocument(id: string) {
  await requireUser();

  const doc = await prisma.patientDocument.findUnique({
    where: { id },
  });

  if (!doc) throw new Error("Document not found");

  // Delete from Supabase storage
  const supabase = createAdminClient();
  await supabase.storage
    .from("patient-documents")
    .remove([doc.storagePath]);

  // Delete DB record
  await prisma.patientDocument.delete({ where: { id } });

  revalidatePath(`/patients/${doc.patientId}`);
}

// ─── GET SIGNED URL FOR DOWNLOAD ────────────

export async function getDocumentDownloadUrl(id: string) {
  await requireUser();

  const doc = await prisma.patientDocument.findUnique({
    where: { id },
  });

  if (!doc) throw new Error("Document not found");

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("patient-documents")
    .createSignedUrl(doc.storagePath, 300); // 5 min expiry

  if (error) throw new Error("Failed to generate download URL");

  return data.signedUrl;
}
