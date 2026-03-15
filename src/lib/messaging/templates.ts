/**
 * Message templates for patient notifications
 * Each template returns {subject, html, text, sms}
 */

import { buildEmailHtml } from "./email";

export type TemplateName =
  | "readyForPickup"
  | "refillDue"
  | "refillProcessed"
  | "shippingUpdate"
  | "prescriptionExpiring";

export interface MessageTemplate {
  subject: string;
  html: string;
  text: string;
  sms: string;
}

export interface TemplateData {
  patientName?: string;
  rxNumber?: string;
  drugName?: string;
  pharmacyPhone?: string;
  refillsRemaining?: number;
  status?: string;
  trackingNumber?: string;
  carrier?: string;
  expirationDate?: string;
  [key: string]: any;
}

/**
 * Ready for pickup notification
 */
export function readyForPickup(data: TemplateData): MessageTemplate {
  const { patientName = "Valued Customer", rxNumber, drugName, pharmacyPhone } = data;

  const subject = `Your prescription is ready for pickup`;

  const htmlContent = `
<p>Hello ${patientName},</p>

<p>Good news! Your prescription is ready for pickup.</p>

<div class="highlight">
  <p><strong>Prescription Details:</strong></p>
  <p>Medication: <strong>${drugName || "Your medication"}</strong></p>
  <p>Rx Number: <strong>${rxNumber || "N/A"}</strong></p>
</div>

<p>Please visit our pharmacy at your earliest convenience to pick up your medication.
Our team will be happy to answer any questions you may have.</p>

<p>${
    pharmacyPhone
      ? `<strong>Questions?</strong> Give us a call at <strong>${pharmacyPhone}</strong>`
      : ""
  }</p>

<p>Thank you for choosing Boudreaux's Pharmacy!</p>
  `.trim();

  const textContent = `Hello ${patientName},

Good news! Your prescription is ready for pickup.

Medication: ${drugName || "Your medication"}
Rx Number: ${rxNumber || "N/A"}

Please visit our pharmacy to pick up your medication.
${pharmacyPhone ? `Questions? Call us at ${pharmacyPhone}` : ""}

Thank you for choosing Boudreaux's Pharmacy!`;

  const smsText = `Hi ${patientName}! Your prescription (${rxNumber || "Rx"}) for ${
    drugName || "your medication"
  } is ready for pickup. Visit us or call ${pharmacyPhone || "us"} for details.`;

  return {
    subject,
    html: buildEmailHtml("readyForPickup", htmlContent),
    text: textContent,
    sms: smsText,
  };
}

/**
 * Refill due notification
 */
export function refillDue(data: TemplateData): MessageTemplate {
  const { patientName = "Valued Customer", rxNumber, drugName, refillsRemaining } = data;

  const subject = `Time to refill your prescription`;

  const htmlContent = `
<p>Hello ${patientName},</p>

<p>It's time to refill your prescription. Don't run out of your medication!</p>

<div class="highlight">
  <p><strong>Prescription Details:</strong></p>
  <p>Medication: <strong>${drugName || "Your medication"}</strong></p>
  <p>Rx Number: <strong>${rxNumber || "N/A"}</strong></p>
  ${refillsRemaining !== undefined ? `<p>Refills Available: <strong>${refillsRemaining}</strong></p>` : ""}
</div>

<p>You can refill your prescription by:</p>
<ul>
  <li>Visiting our pharmacy in person</li>
  <li>Calling us for a quick refill</li>
  <li>Using our online pharmacy portal</li>
</ul>

<p>Refill your medication today to ensure continuous treatment.</p>

<p>Thank you for choosing Boudreaux's Pharmacy!</p>
  `.trim();

  const textContent = `Hello ${patientName},

It's time to refill your prescription. Don't run out of your medication!

Medication: ${drugName || "Your medication"}
Rx Number: ${rxNumber || "N/A"}
${refillsRemaining !== undefined ? `Refills Available: ${refillsRemaining}` : ""}

You can refill your prescription by visiting us, calling, or using our online portal.

Thank you for choosing Boudreaux's Pharmacy!`;

  const smsText = `Hi ${patientName}! It's time to refill your ${
    drugName || "medication"
  } (${rxNumber || "Rx"}). You have ${refillsRemaining ?? "refills"} available. Contact us to refill!`;

  return {
    subject,
    html: buildEmailHtml("refillDue", htmlContent),
    text: textContent,
    sms: smsText,
  };
}

/**
 * Refill processed notification
 */
export function refillProcessed(data: TemplateData): MessageTemplate {
  const { patientName = "Valued Customer", rxNumber, status } = data;

  const subject = `Your refill request has been processed`;

  const htmlContent = `
<p>Hello ${patientName},</p>

<p>Your refill request has been processed and is ready.</p>

<div class="highlight">
  <p><strong>Status:</strong> ${status || "Ready for pickup"}</p>
  <p><strong>Rx Number:</strong> ${rxNumber || "N/A"}</p>
</div>

<p>Please pick up your medication at your earliest convenience.</p>

<p>Thank you for choosing Boudreaux's Pharmacy!</p>
  `.trim();

  const textContent = `Hello ${patientName},

Your refill request has been processed and is ready.

Status: ${status || "Ready for pickup"}
Rx Number: ${rxNumber || "N/A"}

Please pick up your medication at your earliest convenience.

Thank you for choosing Boudreaux's Pharmacy!`;

  const smsText = `Hi ${patientName}! Your refill (${rxNumber || "Rx"}) is ready for pickup. Status: ${
    status || "ready"
  }. Thank you for choosing Boudreaux's!`;

  return {
    subject,
    html: buildEmailHtml("refillProcessed", htmlContent),
    text: textContent,
    sms: smsText,
  };
}

/**
 * Shipping update notification
 */
export function shippingUpdate(data: TemplateData): MessageTemplate {
  const { patientName = "Valued Customer", trackingNumber, carrier } = data;

  const subject = `Your order has shipped`;

  const htmlContent = `
<p>Hello ${patientName},</p>

<p>Your order has shipped and is on its way to you!</p>

<div class="highlight">
  <p><strong>Tracking Information:</strong></p>
  ${trackingNumber ? `<p>Tracking Number: <strong>${trackingNumber}</strong></p>` : ""}
  ${carrier ? `<p>Carrier: <strong>${carrier}</strong></p>` : ""}
</div>

<p>You can track your shipment using the information above. We appreciate your patience!</p>

<p>Thank you for choosing Boudreaux's Pharmacy!</p>
  `.trim();

  const textContent = `Hello ${patientName},

Your order has shipped and is on its way to you!

${trackingNumber ? `Tracking Number: ${trackingNumber}` : ""}
${carrier ? `Carrier: ${carrier}` : ""}

You can track your shipment using the information above.

Thank you for choosing Boudreaux's Pharmacy!`;

  const smsText = `Hi ${patientName}! Your order has shipped. ${
    trackingNumber ? `Track it: ${trackingNumber}` : ""
  } ${carrier ? `via ${carrier}` : ""}. Thank you!`;

  return {
    subject,
    html: buildEmailHtml("shippingUpdate", htmlContent),
    text: textContent,
    sms: smsText,
  };
}

/**
 * Prescription expiring soon notification
 */
export function prescriptionExpiring(data: TemplateData): MessageTemplate {
  const {
    patientName = "Valued Customer",
    rxNumber,
    drugName,
    expirationDate,
  } = data;

  const subject = `Your prescription is expiring soon`;

  const htmlContent = `
<p>Hello ${patientName},</p>

<p>Your prescription is expiring soon. Please contact your prescriber to renew if needed.</p>

<div class="highlight">
  <p><strong>Prescription Details:</strong></p>
  <p>Medication: <strong>${drugName || "Your medication"}</strong></p>
  <p>Rx Number: <strong>${rxNumber || "N/A"}</strong></p>
  ${expirationDate ? `<p>Expires: <strong>${expirationDate}</strong></p>` : ""}
</div>

<p>To ensure continuous treatment, please request a renewal from your prescriber as soon as possible.
We'll be ready to fill it promptly.</p>

<p>Thank you for choosing Boudreaux's Pharmacy!</p>
  `.trim();

  const textContent = `Hello ${patientName},

Your prescription is expiring soon. Please contact your prescriber to renew if needed.

Medication: ${drugName || "Your medication"}
Rx Number: ${rxNumber || "N/A"}
${expirationDate ? `Expires: ${expirationDate}` : ""}

Please request a renewal from your prescriber to ensure continuous treatment.

Thank you for choosing Boudreaux's Pharmacy!`;

  const smsText = `Hi ${patientName}! Your prescription (${rxNumber || "Rx"}) for ${
    drugName || "your medication"
  } expires ${expirationDate || "soon"}. Contact your prescriber to renew.`;

  return {
    subject,
    html: buildEmailHtml("prescriptionExpiring", htmlContent),
    text: textContent,
    sms: smsText,
  };
}

/**
 * Get a template by name
 */
export function getTemplate(
  templateName: TemplateName,
  data: TemplateData
): MessageTemplate | null {
  const templates: Record<TemplateName, (data: TemplateData) => MessageTemplate> = {
    readyForPickup,
    refillDue,
    refillProcessed,
    shippingUpdate,
    prescriptionExpiring,
  };

  const templateFn = templates[templateName];
  if (!templateFn) {
    console.error(`Unknown template: ${templateName}`);
    return null;
  }

  return templateFn(data);
}
