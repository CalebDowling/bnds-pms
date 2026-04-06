import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];

/**
 * POST /api/patients/documents/upload
 * Upload a document to Supabase storage and create a DB record.
 *
 * FormData fields:
 *   - file: File (required)
 *   - patientId: string (required)
 *   - category: string (optional, default "general")
 *   - description: string (optional)
 *   - tags: string (optional, comma-separated)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const patientId = formData.get("patientId") as string | null;
    const category = (formData.get("category") as string) || "general";
    const description = (formData.get("description") as string) || "";
    const tagsRaw = (formData.get("tags") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID required" }, { status: 400 });
    }

    // Validate patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, mrn: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed.` },
        { status: 400 }
      );
    }

    // Build storage path: patientId/category/timestamp-filename
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${patientId}/${category}/${timestamp}-${safeFileName}`;

    // Upload to Supabase storage
    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("patient-documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("patient-documents")
      .getPublicUrl(storagePath);

    // Parse tags
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    // Create DB record
    const doc = await prisma.patientDocument.create({
      data: {
        patientId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath,
        storageUrl: urlData.publicUrl,
        category,
        description: description || null,
        tags,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        category: doc.category,
        storageUrl: doc.storageUrl,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("Document upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
