// Queue constants — shared between page and server actions.
// NOT a "use server" file so we can export objects and types.

// Friendly labels for each queue
export const QUEUE_LABELS: Record<string, string> = {
  intake: "Intake",
  sync: "Sync",
  reject: "Reject",
  print: "Print",
  scan: "Scan",
  verify: "Verify",
  rph_rejected: "Rejected by RPh",
  oos: "Out of Stock",
  waiting_bin: "Waiting Bin",
  renewals: "Renewals",
  todo: "Todo",
  price_check: "Price Check",
  prepay: "Prepay",
  ok_to_charge: "OK to Charge",
  decline: "Decline",
  ok_to_charge_clinic: "OK to Charge Clinic",
  compound_qa: "Compound QA",
  telehealth: "Telehealth",
  // Legacy — kept so existing fills tagged as "mochi" still surface; new fills
  // route to compound_qa or telehealth instead.
  mochi: "Mochi (legacy)",
};

// Primary queues — the everyday workflow stages a tech / pharmacist hits
// dozens of times a day. Rendered as visible pills in the queue header.
export const PRIMARY_QUEUE_KEYS: string[] = [
  "intake",
  "print",
  "scan",
  "verify",
  "waiting_bin",
  "rph_rejected",
  "reject",
];

// Secondary queues — specialty / lower-traffic stages tucked behind a
// "More" dropdown so the header isn't a wall of 19+ pills.
export const SECONDARY_QUEUE_KEYS: string[] = [
  "sync",
  "oos",
  "renewals",
  "todo",
  "price_check",
  "prepay",
  "ok_to_charge",
  "decline",
  "ok_to_charge_clinic",
  "compound_qa",
  "telehealth",
  "mochi",
];

// Plain-language description for each queue. Surfaced in tooltips and the
// queue page header. Updated per pharmacist review (April 2026):
//   - "Decline" was reading as "patient declined to fill" but is actually
//     where a fill lands when a payment is declined.
//   - "Mochi" was a catch-all in the original DRX docs but in practice is
//     the RPh QA/QC queue for finished compounds — split out as compound_qa.
export const QUEUE_DESCRIPTIONS: Record<string, string> = {
  intake: "New prescriptions awaiting initial review and patient matching.",
  sync: "Insurance claims being submitted/adjudicated with the PBM.",
  reject: "Insurance claims that came back rejected. Resolve and re-bill.",
  print: "Ready for label printing and physical fill (counting/measuring).",
  scan: "Filled prescriptions awaiting NDC barcode verification scan.",
  verify: "Awaiting pharmacist final verification (RPh check).",
  rph_rejected: "Rx the pharmacist rejected at verify — needs technician follow-up before re-fill.",
  oos: "Prescriptions that cannot be filled because the drug is not in stock.",
  waiting_bin: "Verified Rx in the physical bin, ready for patient pickup.",
  renewals: "Prescriptions flagged for renewal requests to the prescriber.",
  todo: "General task list items requiring staff follow-up.",
  price_check: "Prescriptions needing manual price verification before processing.",
  prepay: "Prescriptions requiring patient prepayment before fill (most compounds land here).",
  ok_to_charge: "Prescriptions approved for patient account charging.",
  decline: "Prescriptions where a payment attempt was declined.",
  ok_to_charge_clinic: "Clinic-billed prescriptions approved for facility charging.",
  compound_qa: "Compound batches finalized by the technician, awaiting pharmacist QA/QC.",
  telehealth: "Prescriptions originating from a telehealth integration (Lumi, Mochi, etc.) — source-tagged on the row.",
  mochi: "Legacy queue. New fills route to Compound QA or Telehealth instead.",
};

export interface QueueFill {
  fillId: string;
  rxId: string;
  patientName: string;
  phone: string | null;
  itemName: string;
  status: string;
  fillDate: string | null;
  quantity: number;
  daysSupply: number | null;
  tags: string[];
  method: string | null;
  pharmacist: string | null;
  binLocation: string | null;
}
