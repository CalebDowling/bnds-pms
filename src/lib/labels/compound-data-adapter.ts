import { CompoundLabelData, createSampleLabelData } from "./drx-compound-label";

// Field group definitions for the Rx Label editor
export interface FieldDef {
  key: string;
  label: string;
  small?: boolean;
  textarea?: boolean;
}

export interface FieldGroup {
  title: string;
  fields: FieldDef[];
}

export const COMPOUND_FIELD_GROUPS: FieldGroup[] = [
  {
    title: "Patient Information",
    fields: [
      { key: "patientFirstName", label: "First Name" },
      { key: "patientLastName", label: "Last Name" },
      { key: "patientDOB", label: "Date of Birth" },
      { key: "patientPhone", label: "Phone" },
      { key: "patientCellPhone", label: "Cell Phone" },
      { key: "patientAddressLine1", label: "Address Line 1" },
      { key: "patientAddressLine2", label: "Address Line 2" },
      { key: "patientCity", label: "City" },
      { key: "patientState", label: "State", small: true },
      { key: "patientZip", label: "Zip", small: true },
      { key: "patientDeliveryMethod", label: "Delivery Method" },
      { key: "patientComments", label: "Patient Comments", textarea: true },
    ],
  },
  {
    title: "Prescription",
    fields: [
      { key: "rxNumber", label: "Rx Number" },
      { key: "fillNumber", label: "Fill Number", small: true },
      { key: "fillDate", label: "Fill Date" },
      { key: "sig", label: "Directions (SIG)", textarea: true },
      { key: "refillsLeft", label: "Refills Left", small: true },
      { key: "rxExpires", label: "Rx Expires" },
    ],
  },
  {
    title: "Drug / Item",
    fields: [
      { key: "itemName", label: "Item Name (Full)" },
      { key: "itemPrintName", label: "Print Name" },
      { key: "brandName", label: "Brand Name (if generic)" },
      { key: "ndc", label: "NDC" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "dispensedQuantity", label: "Quantity" },
      { key: "qtyType", label: "Qty Type", small: true },
      { key: "copay", label: "Copay ($)" },
      { key: "boh", label: "Balance on Hand", small: true },
    ],
  },
  {
    title: "Prescriber",
    fields: [
      { key: "doctorFirstName", label: "First Name" },
      { key: "doctorLastName", label: "Last Name" },
      { key: "doctorAddressLine1", label: "Address" },
      { key: "doctorCity", label: "City" },
      { key: "doctorState", label: "State", small: true },
      { key: "doctorZip", label: "Zip", small: true },
      { key: "doctorPhone", label: "Phone" },
      { key: "doctorDEA", label: "DEA" },
      { key: "doctorNPI", label: "NPI" },
    ],
  },
  {
    title: "Pharmacist & Insurance",
    fields: [
      { key: "pharmacistFirstName", label: "RPH First Name" },
      { key: "pharmacistLastName", label: "RPH Last Name" },
      { key: "primaryInsurance", label: "Primary Insurance" },
    ],
  },
  {
    title: "Compound / Batch",
    fields: [
      { key: "batchId", label: "Batch ID" },
      { key: "formulaId", label: "Formula ID" },
      { key: "batchExpiration", label: "Batch Expiration" },
    ],
  },
  {
    title: "Labels & Warnings",
    fields: [
      { key: "auxLabels", label: "Aux Labels (one per line)", textarea: true },
      { key: "fillTags", label: "Fill Tags (comma separated)" },
      { key: "pickupTime", label: "Pickup Time" },
      { key: "tollFreeNumber", label: "Toll Free Number" },
      { key: "noClaimWarning", label: "No Paid Claim Warning" },
      { key: "holdWarning", label: "Hold Warning" },
    ],
  },
];

/** Convert flat form data to typed CompoundLabelData */
export function flatToCompoundData(flat: Record<string, string>): CompoundLabelData {
  return {
    patientFirstName: flat.patientFirstName || "",
    patientLastName: flat.patientLastName || "",
    patientDOB: flat.patientDOB || "",
    patientAddressLine1: flat.patientAddressLine1 || "",
    patientAddressLine2: flat.patientAddressLine2 || "",
    patientCity: flat.patientCity || "",
    patientState: flat.patientState || "",
    patientZip: flat.patientZip || "",
    patientPhone: flat.patientPhone || "",
    patientCellPhone: flat.patientCellPhone || "",
    patientDeliveryMethod: flat.patientDeliveryMethod || "",
    patientComments: flat.patientComments || "",
    rxNumber: flat.rxNumber || "",
    fillNumber: Number(flat.fillNumber) || 0,
    fillDate: flat.fillDate || "",
    sig: flat.sig || "",
    refillsLeft: Number(flat.refillsLeft) || 0,
    rxExpires: flat.rxExpires || "",
    itemName: flat.itemName || "",
    itemPrintName: flat.itemPrintName || "",
    brandName: flat.brandName || "",
    ndc: flat.ndc || "",
    manufacturer: flat.manufacturer || "",
    boh: flat.boh || "",
    dispensedQuantity: flat.dispensedQuantity || "",
    qtyType: flat.qtyType || "",
    copay: flat.copay || "",
    doctorFirstName: flat.doctorFirstName || "",
    doctorLastName: flat.doctorLastName || "",
    doctorAddressLine1: flat.doctorAddressLine1 || "",
    doctorAddressLine2: flat.doctorAddressLine2 || "",
    doctorCity: flat.doctorCity || "",
    doctorState: flat.doctorState || "",
    doctorZip: flat.doctorZip || "",
    doctorPhone: flat.doctorPhone || "",
    doctorDEA: flat.doctorDEA || "",
    doctorNPI: flat.doctorNPI || "",
    pharmacistFirstName: flat.pharmacistFirstName || "",
    pharmacistLastName: flat.pharmacistLastName || "",
    primaryInsurance: flat.primaryInsurance || "",
    batchId: flat.batchId || "",
    formulaId: flat.formulaId || "",
    batchExpiration: flat.batchExpiration || "",
    auxLabels: (flat.auxLabels || "").split("\n").filter(Boolean),
    fillTags: (flat.fillTags || "").split(",").map(t => t.trim()).filter(Boolean),
    pickupTime: flat.pickupTime || "",
    noClaimWarning: flat.noClaimWarning === "true",
    holdWarning: flat.holdWarning === "true",
    completionQuantity: flat.completionQuantity || "",
    partialQuantity: flat.partialQuantity || "",
    fillId: flat.fillId || flat.rxNumber || "",
    labelVersion: flat.labelVersion || "0",
    itemId: flat.itemId || "",
    patientEducationUrl: flat.patientEducationUrl || "",
    tollFreeNumber: flat.tollFreeNumber || "Toll Free 1-855-305-2110",
  };
}

/** Flatten CompoundLabelData sample to flat Record<string, string> */
export function flattenSampleData(): Record<string, string> {
  const sample = createSampleLabelData();
  return {
    ...Object.fromEntries(
      Object.entries(sample).map(([k, v]) => {
        if (Array.isArray(v)) return [k, v.join(k === "auxLabels" ? "\n" : ", ")];
        if (typeof v === "boolean") return [k, String(v)];
        if (typeof v === "number") return [k, String(v)];
        return [k, String(v)];
      })
    ),
  };
}
