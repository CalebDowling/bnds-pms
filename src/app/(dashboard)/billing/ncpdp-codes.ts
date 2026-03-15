// NCPDP Rejection Code Lookup
// Separated from actions.ts because "use server" files require all exports to be async

const NCPDP_REJECTION_CODES: Record<string, string> = {
  "1": "M/I BIN Number",
  "4": "M/I Processor Control Number",
  "6": "M/I Group ID",
  "7": "M/I Cardholder ID",
  "8": "M/I Person Code",
  "10": "M/I Patient Gender Code",
  "11": "M/I Patient DOB",
  "15": "M/I Date of Service",
  "19": "M/I Days Supply",
  "20": "M/I Compound Code",
  "21": "M/I Quantity Prescribed",
  "22": "M/I Dispensing Fee Submitted",
  "25": "M/I Prescriber ID",
  "26": "M/I Unit of Measure",
  "29": "M/I Number of Refills Authorized",
  "56": "Non-Matched Cardholder ID",
  "60": "Product/Service Not Covered — Patient eligible — Product not covered",
  "65": "Patient Not Covered",
  "66": "Patient Age Exceeds Maximum Age",
  "67": "Patient Age Precedes Minimum Age",
  "68": "DUR Reject Error",
  "69": "Filled After Coverage Terminated",
  "70": "Product/Service Not Covered",
  "71": "Prescriber ID Not Covered",
  "75": "Prior Authorization Required",
  "76": "Plan Limitations Exceeded",
  "77": "Discontinued Product/Service ID Number",
  "78": "Cost Exceeds Maximum",
  "79": "Refill Too Soon",
  "80": "No Drug Coverage",
  "83": "Duplicate Paid/Captured Claim",
  "88": "DUR Reject Error — Overuse",
  "89": "DUR Reject Error — Suboptimal Dosage Form",
  "90": "DUR Reject Error — Drug–Drug Interaction",
  "91": "DUR Reject Error — Overuse/Early Refill",
  "92": "DUR Reject Error — Therapeutic Duplication",
  "93": "No Pharmacy Coverage",
  "MR": "Medicare Part D",
  "ER": "Eligibility Reversal",
};

export function lookupRejectionCode(code: string): string {
  return NCPDP_REJECTION_CODES[code] || `Unknown code: ${code}`;
}
