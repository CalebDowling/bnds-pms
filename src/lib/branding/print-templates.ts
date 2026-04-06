/**
 * Print-optimized HTML templates for pharmacy labels and receipts
 * All templates use inline CSS for reliable printing and proper page breaks
 */

import { BRAND, getFullAddress } from "./config";

export interface RxLabelData {
  patientName: string;
  patientDOB?: string;
  rxNumber: string;
  drugName: string;
  quantity: number;
  directions: string;
  warnings?: string[];
  refillsRemaining: number;
  filledDate: string;
  expirationDate: string;
  prescriber?: string;
  pharmacistInitials?: string;
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  time?: string;
  patientName: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  notes?: string;
}

export interface ShippingLabelData {
  trackingNumber: string;
  from: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
  };
  to: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  carrier: string;
  weight?: string;
  service?: string;
}

/**
 * Generate a 4"x2.5" prescription label (print-optimized)
 * Designed for thermal label printers
 */
export function generateRxLabel(data: RxLabelData): string {
  const {
    patientName,
    patientDOB,
    rxNumber,
    drugName,
    quantity,
    directions,
    warnings = [],
    refillsRemaining,
    filledDate,
    expirationDate,
    prescriber,
    pharmacistInitials,
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rx Label - ${rxNumber}</title>
  <style type="text/css">
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      background-color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 10px;
    }
    .label {
      width: 4in;
      height: 2.5in;
      background-color: white;
      border: 2px solid ${BRAND.colors.primary};
      border-radius: 3px;
      padding: 0.15in;
      font-size: 10pt;
      line-height: 1.2;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      page-break-after: always;
    }
    .label-header {
      border-bottom: 2px solid ${BRAND.colors.primary};
      padding-bottom: 0.05in;
      margin-bottom: 0.08in;
      text-align: center;
      font-weight: bold;
      font-size: 11pt;
      color: ${BRAND.colors.primary};
    }
    .rx-number {
      font-size: 9pt;
      font-weight: bold;
      color: #000;
      text-align: center;
      margin-bottom: 0.05in;
    }
    .patient-info {
      font-size: 9pt;
      margin-bottom: 0.05in;
      line-height: 1.3;
    }
    .patient-info strong {
      display: inline-block;
      width: 0.4in;
      font-weight: bold;
    }
    .drug-name {
      font-size: 11pt;
      font-weight: bold;
      color: ${BRAND.colors.primary};
      margin: 0.05in 0;
      word-wrap: break-word;
    }
    .drug-details {
      font-size: 8pt;
      margin: 0.05in 0;
      line-height: 1.2;
    }
    .directions {
      font-size: 8pt;
      margin: 0.05in 0;
      font-weight: 600;
      color: #000;
    }
    .warnings {
      font-size: 7pt;
      color: ${BRAND.colors.danger};
      font-weight: bold;
      margin: 0.05in 0;
      line-height: 1.1;
    }
    .footer-row {
      font-size: 7pt;
      display: flex;
      justify-content: space-between;
      margin-top: 0.05in;
      padding-top: 0.05in;
      border-top: 1px solid #ccc;
    }
    .footer-item {
      flex: 1;
    }
    .footer-label {
      font-weight: bold;
      display: block;
      font-size: 6pt;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        display: block;
        min-height: 0;
      }
      .label {
        box-shadow: none;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="label-header">${BRAND.shortName}</div>

    <div class="rx-number">Rx ${rxNumber}</div>

    <div class="patient-info">
      <strong>Pt:</strong> ${patientName}${patientDOB ? ` (${patientDOB})` : ""}
    </div>

    <div class="drug-name">${drugName}</div>

    <div class="drug-details">
      <strong>Qty:</strong> ${quantity} &nbsp;
      <strong>Refills:</strong> ${refillsRemaining}
    </div>

    <div class="directions">
      ${directions}
    </div>

    ${
      warnings.length > 0
        ? `<div class="warnings">${warnings.map((w) => `⚠️ ${w}`).join(" | ")}</div>`
        : ""
    }

    <div class="footer-row">
      <div class="footer-item">
        <span class="footer-label">Filled:</span>
        ${filledDate}
      </div>
      <div class="footer-item">
        <span class="footer-label">Expires:</span>
        ${expirationDate}
      </div>
      ${
        pharmacistInitials
          ? `<div class="footer-item">
        <span class="footer-label">RPh:</span>
        ${pharmacistInitials}
      </div>`
          : ""
      }
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate a point-of-sale receipt (8.5"x11" sheet, multiple receipts per page)
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const {
    receiptNumber,
    date,
    time,
    patientName,
    items,
    subtotal,
    tax,
    total,
    paymentMethod,
    notes,
  } = data;

  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td style="text-align: left; padding: 6px 4px; border-bottom: 1px solid #ddd; font-size: 9pt;">
        ${item.description}
      </td>
      <td style="text-align: center; padding: 6px 4px; border-bottom: 1px solid #ddd; font-size: 9pt; width: 50px;">
        ${item.quantity}
      </td>
      <td style="text-align: right; padding: 6px 4px; border-bottom: 1px solid #ddd; font-size: 9pt; width: 60px;">
        $${(item.total / 100).toFixed(2)}
      </td>
    </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${receiptNumber}</title>
  <style type="text/css">
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      background-color: white;
      padding: 0.25in;
      line-height: 1.4;
    }
    .receipt {
      max-width: 4in;
      margin: 0 auto 0.5in;
      border: 1px solid #333;
      padding: 0.2in;
      background-color: white;
      page-break-inside: avoid;
      font-size: 10pt;
    }
    .receipt-header {
      text-align: center;
      border-bottom: 2px solid ${BRAND.colors.primary};
      padding-bottom: 0.1in;
      margin-bottom: 0.1in;
    }
    .receipt-header h1 {
      font-size: 12pt;
      font-weight: bold;
      color: ${BRAND.colors.primary};
      margin: 0;
    }
    .receipt-header p {
      font-size: 8pt;
      margin: 2px 0;
    }
    .receipt-info {
      font-size: 9pt;
      margin-bottom: 0.1in;
      padding-bottom: 0.1in;
      border-bottom: 1px dashed #999;
    }
    .receipt-info-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
    }
    .receipt-info-label {
      font-weight: bold;
    }
    .items-table {
      width: 100%;
      margin-bottom: 0.1in;
      border-collapse: collapse;
    }
    .items-table th {
      text-align: left;
      padding: 6px 4px;
      border-bottom: 2px solid #333;
      font-size: 9pt;
      font-weight: bold;
    }
    .items-table th.qty {
      text-align: center;
      width: 50px;
    }
    .items-table th.amount {
      text-align: right;
      width: 60px;
    }
    .totals {
      margin: 0.1in 0;
      padding-top: 0.05in;
      border-top: 1px dashed #999;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
      font-size: 9pt;
    }
    .totals-row.total {
      font-weight: bold;
      font-size: 11pt;
      border-top: 1px solid #333;
      border-bottom: 1px solid #333;
      padding: 4px 0;
      margin-top: 6px;
    }
    .payment-method {
      font-size: 9pt;
      text-align: center;
      margin: 0.1in 0;
      padding-top: 0.05in;
      border-top: 1px dashed #999;
    }
    .receipt-footer {
      text-align: center;
      font-size: 8pt;
      margin-top: 0.1in;
      padding-top: 0.1in;
      border-top: 1px dashed #999;
    }
    .receipt-footer p {
      margin: 2px 0;
    }
    @media print {
      body {
        padding: 0.25in;
        margin: 0;
      }
      .receipt {
        box-shadow: none;
        border: 1px solid #333;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <h1>${BRAND.name}</h1>
      <p>${getFullAddress()}</p>
      <p>${BRAND.contact.phone}</p>
    </div>

    <div class="receipt-info">
      <div class="receipt-info-row">
        <span class="receipt-info-label">Receipt #:</span>
        <span>${receiptNumber}</span>
      </div>
      <div class="receipt-info-row">
        <span class="receipt-info-label">Date:</span>
        <span>${date}${time ? ` ${time}` : ""}</span>
      </div>
      <div class="receipt-info-row">
        <span class="receipt-info-label">Customer:</span>
        <span>${patientName}</span>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="qty">Qty</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>$${(subtotal / 100).toFixed(2)}</span>
      </div>
      ${
        tax > 0
          ? `<div class="totals-row">
        <span>Tax:</span>
        <span>$${(tax / 100).toFixed(2)}</span>
      </div>`
          : ""
      }
      <div class="totals-row total">
        <span>TOTAL:</span>
        <span>$${(total / 100).toFixed(2)}</span>
      </div>
    </div>

    ${paymentMethod ? `<div class="payment-method">Payment: ${paymentMethod}</div>` : ""}

    <div class="receipt-footer">
      <p>Thank you for your business!</p>
      <p>Serving your healthcare needs since 1947</p>
      ${notes ? `<p>${notes}</p>` : ""}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate a shipping label (4"x6" thermal label format)
 * Includes barcode placeholder for tracking number
 */
export function generateShippingLabel(data: ShippingLabelData): string {
  const { trackingNumber, from, to, carrier, weight, service } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipping Label - ${trackingNumber}</title>
  <style type="text/css">
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      background-color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 10px;
    }
    .label {
      width: 4in;
      height: 6in;
      background-color: white;
      border: 2px solid #000;
      padding: 0.2in;
      font-size: 11pt;
      line-height: 1.3;
      overflow: hidden;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }
    .label-section {
      margin-bottom: 0.15in;
    }
    .label-title {
      font-size: 9pt;
      font-weight: bold;
      background-color: #f0f0f0;
      padding: 3px 5px;
      margin-bottom: 3px;
    }
    .from-section {
      border: 2px solid #000;
      padding: 0.1in;
      margin-bottom: 0.15in;
    }
    .address-block {
      font-size: 10pt;
      line-height: 1.4;
      margin-bottom: 3px;
    }
    .address-block .name {
      font-weight: bold;
      font-size: 11pt;
    }
    .address-block .phone {
      font-size: 9pt;
    }
    .to-section {
      border: 3px solid #000;
      padding: 0.15in;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin-bottom: 0.15in;
    }
    .to-section .address-block {
      font-size: 14pt;
      line-height: 1.6;
      margin-bottom: 5px;
    }
    .to-section .name {
      font-weight: bold;
      font-size: 16pt;
    }
    .to-section .street {
      font-size: 13pt;
    }
    .to-section .city-state {
      font-size: 13pt;
    }
    .tracking-section {
      border-top: 2px solid #000;
      padding-top: 0.08in;
      margin-top: 0.1in;
    }
    .tracking-label {
      font-size: 8pt;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .tracking-number {
      font-size: 16pt;
      font-weight: bold;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
      margin-bottom: 3px;
      text-align: center;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
    }
    .barcode-placeholder {
      width: 100%;
      height: 0.4in;
      background-color: #f0f0f0;
      border: 1px dashed #999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      color: #999;
      margin-bottom: 3px;
    }
    .carrier-info {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      margin-top: 3px;
    }
    .carrier-info-item {
      flex: 1;
    }
    .carrier-info-label {
      font-weight: bold;
      font-size: 8pt;
      display: block;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        display: block;
        min-height: 0;
      }
      .label {
        page-break-inside: avoid;
        box-shadow: none;
      }
      .barcode-placeholder {
        background-color: white;
        border: 1px solid #000;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="from-section">
      <div class="label-title">FROM</div>
      <div class="address-block">
        <div class="name">${from.name}</div>
        <div>${from.street}</div>
        <div>${from.city}, ${from.state} ${from.zip}</div>
        ${from.phone ? `<div class="phone">${from.phone}</div>` : ""}
      </div>
    </div>

    <div class="to-section">
      <div class="label-title">TO</div>
      <div class="address-block">
        <div class="name">${to.name}</div>
        <div class="street">${to.street}</div>
        <div class="city-state">${to.city}, ${to.state} ${to.zip}</div>
      </div>
    </div>

    <div class="tracking-section">
      <div class="tracking-label">TRACKING #</div>
      <div class="tracking-number">${trackingNumber}</div>
      <div class="barcode-placeholder">[Barcode]</div>
      <div class="carrier-info">
        <div class="carrier-info-item">
          <span class="carrier-info-label">Carrier:</span>
          ${carrier}
        </div>
        ${weight ? `<div class="carrier-info-item">
          <span class="carrier-info-label">Weight:</span>
          ${weight}
        </div>` : ""}
        ${service ? `<div class="carrier-info-item">
          <span class="carrier-info-label">Service:</span>
          ${service}
        </div>` : ""}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
