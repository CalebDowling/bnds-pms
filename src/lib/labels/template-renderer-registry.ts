import type { FieldGroup } from "./compound-data-adapter";
import { COMPOUND_FIELD_GROUPS, flatToCompoundData, flattenSampleData } from "./compound-data-adapter";
import { generateCompoundLabelPDF } from "./drx-compound-label";

export interface TemplateRenderer {
  generatePDF(data: Record<string, string>): Promise<Buffer>;
  getFieldGroups(): FieldGroup[];
  getDefaultData(): Record<string, string>;
}

/** Compound Rx Label renderer (4x8 structured grid) */
class CompoundRxRenderer implements TemplateRenderer {
  async generatePDF(data: Record<string, string>): Promise<Buffer> {
    const typed = flatToCompoundData(data);
    return generateCompoundLabelPDF(typed);
  }
  getFieldGroups(): FieldGroup[] {
    return COMPOUND_FIELD_GROUPS;
  }
  getDefaultData(): Record<string, string> {
    return flattenSampleData();
  }
}

const compoundRenderer = new CompoundRxRenderer();

/**
 * Get the best renderer for a template based on its type and dimensions.
 * Returns null if no specialized renderer exists (use generic DRX renderer).
 */
export function getSpecializedRenderer(
  templateType: string,
  pageWidth?: number,
  pageHeight?: number
): TemplateRenderer | null {
  // Rx Labels on 4x8 pages get the compound renderer
  if (templateType === "Rx Label" && pageWidth === 4 && pageHeight === 8) {
    return compoundRenderer;
  }
  // Future: add batch, receipt renderers here
  return null;
}
