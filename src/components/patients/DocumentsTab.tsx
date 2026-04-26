"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getPatientDocuments,
  getDocumentCategoryCounts,
  updateDocument,
  archiveDocument,
  deleteDocument,
  getDocumentDownloadUrl,
} from "@/app/(dashboard)/patients/documents/actions";
import { formatDate, formatPatientName } from "@/lib/utils/formatters";

type Document = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  storageUrl: string | null;
  category: string;
  description: string | null;
  tags: string[];
  isArchived: boolean;
  createdAt: string | Date;
  uploader: { id: string; firstName: string; lastName: string } | null;
};

type CategoryCount = { category: string; count: number };

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "id", label: "ID / License" },
  { value: "insurance", label: "Insurance Card" },
  { value: "rx", label: "Prescriptions" },
  { value: "lab", label: "Lab Results" },
  { value: "consent", label: "Consent Forms" },
  { value: "photo", label: "Photos" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  id: "bg-amber-100 text-amber-700",
  insurance: "bg-blue-100 text-blue-700",
  rx: "bg-green-100 text-green-700",
  lab: "bg-purple-100 text-purple-700",
  consent: "bg-pink-100 text-pink-700",
  photo: "bg-cyan-100 text-cyan-700",
  general: "bg-gray-100 text-gray-600",
  other: "bg-gray-100 text-gray-600",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


function getFileIcon(fileType: string): string {
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType === "application/pdf") return "📄";
  if (fileType.includes("word")) return "📝";
  if (fileType === "text/csv") return "📊";
  return "📎";
}

interface DocumentsTabProps {
  patientId: string;
}

export default function DocumentsTab({ patientId }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, counts] = await Promise.all([
        getPatientDocuments(patientId, {
          category: activeCategory !== "all" ? activeCategory : undefined,
          search: search || undefined,
          includeArchived: showArchived,
        }),
        getDocumentCategoryCounts(patientId),
      ]);
      setDocuments(docs as unknown as Document[]);
      setCategoryCounts(counts);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId, activeCategory, search, showArchived]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("patientId", patientId);
        formData.append("category", uploadCategory);
        formData.append("description", uploadDescription);
        formData.append("tags", uploadTags);

        const res = await fetch("/api/patients/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          alert(`Failed to upload ${file.name}: ${data.error}`);
        }
      }

      // Reset form
      setUploadCategory("general");
      setUploadDescription("");
      setUploadTags("");
      setShowUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Reload
      await loadDocuments();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const url = await getDocumentDownloadUrl(doc.id);
      window.open(url, "_blank");
    } catch {
      alert("Failed to generate download link");
    }
  }

  async function handleArchive(doc: Document) {
    if (!confirm(`Archive "${doc.fileName}"?`)) return;
    await archiveDocument(doc.id);
    await loadDocuments();
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Permanently delete "${doc.fileName}"? This cannot be undone.`)) return;
    await deleteDocument(doc.id);
    await loadDocuments();
  }

  async function handleEditSave() {
    if (!editingDoc) return;
    await updateDocument(editingDoc.id, {
      category: editingDoc.category,
      description: editingDoc.description || undefined,
      tags: editingDoc.tags,
    });
    setEditingDoc(null);
    await loadDocuments();
  }

  const totalDocs = categoryCounts.reduce((s, c) => s + c.count, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Documents
            <span className="ml-2 text-xs font-normal text-gray-400">
              {totalDocs} file{totalDocs !== 1 ? "s" : ""}
            </span>
          </h3>
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-gray-300 text-[#40721D] focus:ring-[#40721D]"
            />
            Show archived
          </label>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-3 py-1.5 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
        >
          + Upload
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
              >
                {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Optional description..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
              <input
                type="text"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="Comma-separated tags..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.doc,.docx,.txt,.csv"
              onChange={(e) => handleUpload(e.target.files)}
              className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#40721D] file:text-white hover:file:bg-[#2D5114] file:cursor-pointer"
              disabled={uploading}
            />
            {uploading && (
              <span className="text-sm text-blue-600 animate-pulse">Uploading...</span>
            )}
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CATEGORIES.map((cat) => {
          const count =
            cat.value === "all"
              ? totalDocs
              : categoryCounts.find((c) => c.category === cat.value)?.count || 0;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                activeCategory === cat.value
                  ? "bg-[#40721D] text-white border-[#40721D]"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {cat.label}
              {count > 0 && (
                <span className="ml-1 opacity-70">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files by name, description, or tag..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
        />
      </div>

      {/* Document List */}
      {loading ? (
        <div className="text-center py-8 text-sm text-gray-400">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📁</p>
          <p className="text-sm text-gray-400">No documents found</p>
          <p className="text-xs text-gray-300 mt-1">
            Upload files like IDs, insurance cards, prescriptions, or lab results
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center gap-3 px-4 py-3 bg-white border rounded-lg hover:border-gray-300 transition-colors ${
                doc.isArchived ? "opacity-50" : ""
              }`}
            >
              {/* File Icon */}
              <span className="text-xl shrink-0">{getFileIcon(doc.fileType)}</span>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full shrink-0 ${
                      CATEGORY_COLORS[doc.category] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {CATEGORIES.find((c) => c.value === doc.category)?.label || doc.category}
                  </span>
                  {doc.isArchived && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-gray-200 text-gray-500">
                      Archived
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400">{formatFileSize(doc.fileSize)}</span>
                  <span className="text-xs text-gray-400">{formatDate(doc.createdAt)}</span>
                  {doc.uploader && (
                    <span className="text-xs text-gray-400">
                      by {formatPatientName({ firstName: doc.uploader.firstName, lastName: doc.uploader.lastName })}
                    </span>
                  )}
                  {doc.description && (
                    <span className="text-xs text-gray-500 truncate">{doc.description}</span>
                  )}
                </div>
                {doc.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {doc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-500 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {doc.fileType.startsWith("image/") && (
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    title="Preview"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Download"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingDoc(doc)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                {!doc.isArchived ? (
                  <button
                    onClick={() => handleArchive(doc)}
                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                    title="Archive"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="21,8 21,21 3,21 3,8" />
                      <rect x="1" y="3" width="22" height="5" />
                      <line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete permanently"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-3xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{previewDoc.fileName}</p>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewDoc.storageUrl || ""}
                alt={previewDoc.fileName}
                className="max-w-full max-h-[60vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setEditingDoc(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Edit Document</h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">File</label>
                <p className="text-sm text-gray-900">{editingDoc.fileName}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={editingDoc.category}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, category: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                >
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  value={editingDoc.description || ""}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editingDoc.tags.join(", ")}
                  onChange={(e) =>
                    setEditingDoc({
                      ...editingDoc,
                      tags: e.target.value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
