"""Extract annotations (sticky notes, highlights, comments) from a PDF."""
import sys
import pypdf

pdf_path = sys.argv[1]
reader = pypdf.PdfReader(pdf_path)

print(f"Pages: {len(reader.pages)}")
print(f"Metadata: {reader.metadata}")
print("=" * 80)

total_annots = 0
for page_num, page in enumerate(reader.pages, start=1):
    annots = page.get("/Annots")
    if not annots:
        continue
    # Resolve indirect references
    if hasattr(annots, "get_object"):
        annots = annots.get_object()

    for i, ref in enumerate(annots):
        a = ref.get_object() if hasattr(ref, "get_object") else ref
        subtype = str(a.get("/Subtype", "?"))
        contents = a.get("/Contents", "")
        author = a.get("/T", "")
        rect = a.get("/Rect", [])
        modified = a.get("/M", "")

        # Try to get the highlighted/underlined text
        # PDF highlights store quadpoints; the text-under has to be cross-referenced
        if contents or subtype in ("/Text", "/FreeText", "/Highlight", "/Underline", "/Note", "/Popup"):
            total_annots += 1
            print(f"\n--- Annotation #{total_annots} (page {page_num}) ---")
            print(f"  Type: {subtype}")
            if author:
                print(f"  Author: {author}")
            if modified:
                print(f"  Modified: {modified}")
            if rect:
                print(f"  Rect: {[float(x) for x in rect]}")
            if contents:
                # Contents may be a TextStringObject — convert to plain str
                text = str(contents)
                print(f"  Content:")
                for line in text.splitlines():
                    print(f"    {line}")

print(f"\n{'=' * 80}")
print(f"TOTAL ANNOTATIONS: {total_annots}")
