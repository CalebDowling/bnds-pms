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
  oos: "Out of Stock",
  waiting_bin: "Waiting Bin",
  renewals: "Renewals",
  todo: "Todo",
  price_check: "Price Check",
  prepay: "Prepay",
  ok_to_charge: "OK to Charge",
  decline: "Decline",
  ok_to_charge_clinic: "OK to Charge Clinic",
  mochi: "Mochi",
};

export interface QueueFill {
  fillId: string;
  rxId: string;
  patientName: string;
  itemName: string;
  ndc: string | null;
  status: string;
  fillDate: string | null;
  quantity: number;
  daysSupply: number | null;
  refillNumber: number;
  pharmacist: string | null;
  binLocation: string | null;
}
