# Boudreaux's New Drug Store Branding Module

Custom branding materials for professional pharmacy communications, including email templates, print labels, and centralized brand configuration.

## Files

### 1. `config.ts` - Brand Configuration
Central configuration object with all brand elements, colors, contact info, and helper functions.

**Key Exports:**
- `BRAND` - Main configuration object
- `getFullAddress()` - Returns formatted full address string
- `getPharmacyHours()` - Returns formatted pharmacy hours

**Usage:**
```typescript
import { BRAND, getFullAddress, getPharmacyHours } from "./config";

console.log(BRAND.name); // "Boudreaux's New Drug Store"
console.log(BRAND.colors.primary); // "#40721d"
console.log(getFullAddress()); // "1234 Main Street, Lafayette, LA 70501"
```

**Configuration Includes:**
- **Pharmacy Details:** Name, short name, tagline, logo URLs
- **Brand Colors:** Primary (#40721d), accent, status colors (danger, warning, success, info)
- **Contact Info:** Phone, fax, email, website, portal URL, full address
- **Hours:** Weekday, Saturday, Sunday
- **Social Media:** Facebook link
- **Legal:** NPI, license number, DEA number
- **Typography:** Font families for body and monospace text

---

### 2. `email-templates.ts` - Professional Email Templates
Responsive HTML email templates for pharmacy communications that render correctly in Gmail, Outlook, and Apple Mail.

**Email Template Types:**
1. `prescriptionReady` - "Your prescription is ready for pickup"
2. `refillReminder` - "Time to refill your medication"
3. `orderShipped` - "Your order has shipped"
4. `welcomePatient` - "Welcome to Boudreaux's"
5. `appointmentReminder` - Consultation/pickup appointment reminder
6. `invoiceReceipt` - Payment receipt with itemized charges

**Key Functions:**

#### Main Generator
```typescript
import { generateEmailHTML, EmailTemplateType, GenerateEmailOptions } from "./email-templates";

const template = generateEmailHTML("prescriptionReady", {
  patientName: "John Doe",
  rxNumber: "RX123456",
  drugName: "Lisinopril 10mg",
});

console.log(template.html); // Full HTML email
console.log(template.text); // Plain text fallback
```

#### Individual Template Functions
```typescript
import {
  generatePrescriptionReadyEmail,
  generateRefillReminderEmail,
  generateOrderShippedEmail,
  generateWelcomePatientEmail,
  generateAppointmentReminderEmail,
  generateInvoiceReceiptEmail,
} from "./email-templates";

// Each returns { html, text }
const emailTemplate = generatePrescriptionReadyEmail({
  patientName: "Jane Smith",
  rxNumber: "RX789012",
  drugName: "Atorvastatin 20mg",
});
```

**Template Options (GenerateEmailOptions):**
```typescript
interface GenerateEmailOptions {
  patientName?: string;
  rxNumber?: string;
  drugName?: string;
  quantity?: number;
  lastFillDate?: string;
  refillsRemaining?: number;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  portalUrl?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentType?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  items?: Array<{ description: string; quantity: number; amount: number }>;
  subtotal?: number;
  tax?: number;
  total?: number;
  [key: string]: any;
}
```

**Email Features:**
- Responsive design (mobile-friendly)
- Inline CSS for reliable rendering
- Brand colors and pharmacy branding
- HIPAA-appropriate content (no drug names in subjects)
- Plain text fallback versions
- Professional footer with contact info and hours
- Call-to-action buttons with portal links
- Highlight boxes for important information

---

### 3. `print-templates.ts` - Print-Optimized Templates
HTML templates designed for printing labels, receipts, and shipping labels.

**Print Template Types:**

#### Prescription Label (4" x 2.5")
```typescript
import { generateRxLabel } from "./print-templates";

const label = generateRxLabel({
  patientName: "John Doe",
  patientDOB: "01/15/1970",
  rxNumber: "RX123456",
  drugName: "Lisinopril 10mg",
  quantity: 30,
  directions: "Take 1 tablet by mouth once daily",
  warnings: ["Do not drive", "May cause dizziness"],
  refillsRemaining: 5,
  filledDate: "03/22/2026",
  expirationDate: "03/22/2027",
  prescriber: "Dr. Smith",
  pharmacistInitials: "JD",
});

// Save to file for printing
fs.writeFileSync("rx-label.html", label);
```

#### Point-of-Sale Receipt
```typescript
import { generateReceiptHTML } from "./print-templates";

const receipt = generateReceiptHTML({
  receiptNumber: "REC20260322001",
  date: "03/22/2026",
  time: "10:30 AM",
  patientName: "Jane Smith",
  items: [
    { description: "Lisinopril 10mg (30)", quantity: 1, unitPrice: 1500, total: 1500 },
    { description: "Vitamin D3 (60)", quantity: 1, unitPrice: 800, total: 800 },
  ],
  subtotal: 2300,
  tax: 184,
  total: 2484,
  paymentMethod: "Visa",
  notes: "Thank you for your business!",
});

// Save to file for printing
fs.writeFileSync("receipt.html", receipt);
```

#### Shipping Label (4" x 6")
```typescript
import { generateShippingLabel } from "./print-templates";

const label = generateShippingLabel({
  trackingNumber: "1Z999AA10123456784",
  from: {
    name: "Boudreaux's Pharmacy",
    street: "1234 Main Street",
    city: "Lafayette",
    state: "LA",
    zip: "70501",
    phone: "(337) 234-5678",
  },
  to: {
    name: "John Doe",
    street: "567 Oak Avenue",
    city: "Baton Rouge",
    state: "LA",
    zip: "70801",
  },
  carrier: "UPS Ground",
  weight: "1 lb",
  service: "Ground",
});

// Save to file for printing
fs.writeFileSync("shipping-label.html", label);
```

**Print Features:**
- Inline CSS for reliable printing
- Thermal label printer compatible
- `@media print` styles for proper page breaks
- Professional pharmacy branding
- Clear layout for easy reading
- All elements designed for standard printer output

---

## Integration Example

### Using in Existing Templates
The `src/lib/messaging/templates.ts` file has been updated to use the new branded email templates:

```typescript
import { generateEmailHTML } from "../branding/email-templates";

export function readyForPickup(data: TemplateData): MessageTemplate {
  const subject = `Your prescription is ready for pickup`;

  // Use branded email template
  const brandedTemplate = generateEmailHTML("prescriptionReady", {
    patientName: data.patientName,
    rxNumber: data.rxNumber,
    drugName: data.drugName,
  });

  return {
    subject,
    html: brandedTemplate.html,
    text: textContent,
    sms: smsText,
  };
}
```

### Using in Email Service
```typescript
import { sendEmail } from "./messaging/email";
import { generateEmailHTML } from "./branding/email-templates";

// Generate branded email
const emailTemplate = generateEmailHTML("prescriptionReady", {
  patientName: "John Doe",
  rxNumber: "RX123456",
  drugName: "Lisinopril 10mg",
});

// Send email
await sendEmail({
  to: "john@example.com",
  subject: "Your prescription is ready for pickup",
  html: emailTemplate.html,
  text: emailTemplate.text,
});
```

### Using in Print Services
```typescript
import { generateRxLabel } from "./branding/print-templates";
import fs from "fs";

// Generate label HTML
const labelHtml = generateRxLabel({
  patientName: "John Doe",
  rxNumber: "RX123456",
  drugName: "Lisinopril 10mg",
  quantity: 30,
  directions: "Take 1 tablet by mouth once daily",
  refillsRemaining: 5,
  filledDate: "03/22/2026",
  expirationDate: "03/22/2027",
});

// Print directly from browser or save to file
// Send to thermal printer via print API
window.print(); // In browser context
// Or save: fs.writeFileSync("label.html", labelHtml);
```

---

## Brand Colors Reference

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #40721d | Main brand color, headers, buttons |
| Primary Light | #5a9f2a | Hover states, highlights |
| Primary Dark | #2d5114 | Dark mode, pressed states |
| Accent | #14b8a6 | Secondary actions |
| Danger | #ef4444 | Warnings, errors |
| Warning | #f59e0b | Caution notices |
| Success | #10b981 | Confirmations, success messages |
| Info | #3b82f6 | Information notices |
| Light BG | #f0f5e6 | Highlight boxes |
| Light Border | #e5edda | Subtle borders |

---

## HIPAA Compliance Notes

All email templates are designed with HIPAA compliance in mind:

1. **No drug names in subject lines** - Uses "Your prescription" instead
2. **Patient-specific content** - Never reveals details to unintended recipients
3. **Footer disclaimer** - Includes HIPAA confidentiality notice
4. **No PHI in plain text summaries** - Text versions are minimal
5. **Secure portal links** - Encourages use of secure patient portal

---

## Customization

To update brand colors or contact information, edit `config.ts`:

```typescript
export const BRAND = {
  colors: {
    primary: "#40721d", // Change primary color
    // ... other colors
  },
  contact: {
    phone: "(337) 234-5678", // Update phone
    email: "info@boudreauxsnewdrug.com", // Update email
    // ... other contact info
  },
  // ... other fields
};
```

All templates automatically pick up these changes since they import from `config.ts`.

---

## Dependencies

No external dependencies required. All modules use:
- TypeScript
- Native HTML/CSS
- Standard JavaScript

## Files Structure

```
src/lib/branding/
├── config.ts              # Brand configuration
├── email-templates.ts     # Email templates (940 lines)
├── print-templates.ts     # Print templates (680 lines)
└── README.md              # This file
```

**Total:** 1,699 lines of production code
