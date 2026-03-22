/**
 * Professional pharmacy email templates with responsive HTML
 * All templates are HIPAA-appropriate and render correctly in Gmail, Outlook, Apple Mail
 */

import { BRAND, getFullAddress } from "./config";

export type EmailTemplateType =
  | "prescriptionReady"
  | "refillReminder"
  | "orderShipped"
  | "welcomePatient"
  | "appointmentReminder"
  | "invoiceReceipt";

export interface EmailTemplate {
  html: string;
  text: string;
}

export interface GenerateEmailOptions {
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

/**
 * Build responsive email wrapper with pharmacy branding
 */
function buildEmailWrapper(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      min-width: 100% !important;
      font-family: ${BRAND.typography.fontFamily};
      font-size: 14px;
      line-height: 1.6;
      color: ${BRAND.colors.textPrimary};
      background-color: #f5f5f5;
    }
    table {
      border-collapse: collapse;
      border-spacing: 0;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
    }
    a {
      color: ${BRAND.colors.primary};
      text-decoration: none;
    }
    a:hover {
      color: ${BRAND.colors.primaryDark};
      text-decoration: underline;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: ${BRAND.colors.primary};
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header-logo {
      font-size: 16px;
      opacity: 0.9;
      font-weight: 400;
      letter-spacing: 0.5px;
    }
    .header h1 {
      margin: 10px 0 0 0;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
    }
    .content {
      padding: 30px 20px;
      background-color: #ffffff;
    }
    .content p {
      margin: 0 0 15px 0;
    }
    .highlight-box {
      background-color: ${BRAND.colors.lightBg};
      border-left: 4px solid ${BRAND.colors.primary};
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 2px;
    }
    .highlight-box p {
      margin: 10px 0;
    }
    .highlight-box strong {
      color: ${BRAND.colors.primary};
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: ${BRAND.colors.primary};
      margin: 25px 0 15px 0;
      border-bottom: 2px solid ${BRAND.colors.lightBorder};
      padding-bottom: 10px;
    }
    .rx-details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      font-family: ${BRAND.typography.fontFamilyMono};
    }
    .rx-detail-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      padding: 5px 0;
    }
    .rx-detail-label {
      color: ${BRAND.colors.textSecondary};
      font-weight: 600;
    }
    .rx-detail-value {
      color: ${BRAND.colors.textPrimary};
      font-weight: 500;
    }
    .cta-button {
      display: inline-block;
      background-color: ${BRAND.colors.primary};
      color: white !important;
      padding: 12px 28px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      margin: 20px 0;
      border: 2px solid ${BRAND.colors.primary};
    }
    .cta-button:hover {
      background-color: ${BRAND.colors.primaryDark};
      border-color: ${BRAND.colors.primaryDark};
    }
    .cta-button-secondary {
      background-color: transparent;
      color: ${BRAND.colors.primary} !important;
    }
    .cta-button-secondary:hover {
      background-color: ${BRAND.colors.lightBg};
    }
    .divider {
      border: none;
      border-top: 2px solid ${BRAND.colors.lightBorder};
      margin: 30px 0;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 25px 20px;
      border-top: 1px solid ${BRAND.colors.lightBorder};
      font-size: 12px;
      color: ${BRAND.colors.textSecondary};
      text-align: center;
    }
    .footer-section {
      margin: 15px 0;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: ${BRAND.colors.primary};
      text-decoration: none;
    }
    .footer-hours {
      background-color: white;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      font-size: 11px;
    }
    .footer-hours strong {
      color: ${BRAND.colors.primary};
    }
    .footer-contact {
      font-size: 12px;
    }
    .footer-contact a {
      display: inline-block;
      margin: 0 10px;
    }
    .warning-notice {
      background-color: #fff3cd;
      border-left: 4px solid ${BRAND.colors.warning};
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 2px;
    }
    .success-notice {
      background-color: #d4edda;
      border-left: 4px solid ${BRAND.colors.success};
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 2px;
      color: #155724;
    }
    .list-item {
      margin: 10px 0;
      padding-left: 25px;
      position: relative;
    }
    .list-item:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: ${BRAND.colors.success};
      font-weight: bold;
    }
    @media (max-width: 600px) {
      .container {
        width: 100% !important;
      }
      .header {
        padding: 20px 15px;
      }
      .header h1 {
        font-size: 22px;
      }
      .content {
        padding: 20px 15px;
      }
      .footer {
        padding: 20px 15px;
        font-size: 11px;
      }
      .cta-button {
        display: block;
        text-align: center;
      }
      .rx-detail-row {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="header">
              <div class="header-logo">Your Trusted Compounding Pharmacy</div>
              <h1>${BRAND.name}</h1>
            </td>
          </tr>
          <tr>
            <td class="content">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="footer">
              <div class="footer-section">
                <p><strong>${BRAND.name}</strong></p>
                <p>${getFullAddress()}</p>
              </div>
              <div class="footer-contact">
                <a href="tel:${BRAND.contact.phone.replace(/[^\d]/g, "")}">${BRAND.contact.phone}</a> |
                <a href="mailto:${BRAND.contact.email}">${BRAND.contact.email}</a>
              </div>
              <div class="footer-hours">
                <strong>Hours of Operation:</strong><br>
                ${BRAND.hours.weekday}<br>
                ${BRAND.hours.saturday}<br>
                ${BRAND.hours.sunday}
              </div>
              <p style="margin-top: 20px; opacity: 0.7;">This email contains confidential healthcare information. If you are not the intended recipient, please delete and notify us immediately.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Prescription Ready for Pickup template
 */
export function generatePrescriptionReadyEmail(
  options: GenerateEmailOptions
): EmailTemplate {
  const {
    patientName = "Valued Customer",
    rxNumber = "N/A",
    drugName = "Your medication",
  } = options;

  const htmlContent = `
    <p>Hello ${patientName},</p>

    <p>Good news! Your prescription is ready for pickup at ${BRAND.shortName}.</p>

    <div class="success-notice">
      <strong>Your prescription is ready!</strong>
    </div>

    <div class="highlight-box">
      <p class="section-title" style="margin-top: 0;">Prescription Details</p>
      <div class="rx-details">
        <div class="rx-detail-row">
          <span class="rx-detail-label">Medication:</span>
          <span class="rx-detail-value">${drugName}</span>
        </div>
        <div class="rx-detail-row">
          <span class="rx-detail-label">Rx Number:</span>
          <span class="rx-detail-value">${rxNumber}</span>
        </div>
      </div>
    </div>

    <p><strong>Next Steps:</strong></p>
    <div class="list-item">Visit our pharmacy at your earliest convenience</div>
    <div class="list-item">Our team will be ready to answer any questions</div>
    <div class="list-item">Bring your ID and insurance card if applicable</div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${BRAND.contact.portalUrl}" class="cta-button">View Details in Portal</a>
    </p>

    <hr class="divider">

    <p><strong>Questions or need to reschedule?</strong></p>
    <p>Contact us anytime at <a href="tel:${BRAND.contact.phone.replace(/[^\d]/g, "")}">${BRAND.contact.phone}</a> or visit us in person.</p>

    <p>Thank you for choosing ${BRAND.name}!</p>
  `;

  const textContent = `Hello ${patientName},

Good news! Your prescription is ready for pickup at ${BRAND.shortName}.

PRESCRIPTION DETAILS
====================
Medication: ${drugName}
Rx Number: ${rxNumber}

NEXT STEPS
==========
• Visit our pharmacy at your earliest convenience
• Our team will be ready to answer any questions
• Bring your ID and insurance card if applicable

View your details: ${BRAND.contact.portalUrl}

Questions?
==========
Call us: ${BRAND.contact.phone}
Address: ${getFullAddress()}
Hours: ${BRAND.hours.weekday}

Thank you for choosing ${BRAND.name}!`;

  return {
    html: buildEmailWrapper(htmlContent, `Prescription Ready - ${BRAND.shortName}`),
    text: textContent,
  };
}

/**
 * Refill Reminder template
 */
export function generateRefillReminderEmail(
  options: GenerateEmailOptions
): EmailTemplate {
  const {
    patientName = "Valued Customer",
    rxNumber = "N/A",
    drugName = "Your medication",
    lastFillDate,
    refillsRemaining,
  } = options;

  const htmlContent = `
    <p>Hello ${patientName},</p>

    <p>It's time to refill your prescription! Don't run out of your medication.</p>

    <div class="warning-notice">
      <strong>Refill reminder:</strong> Your prescription is due for a refill.
    </div>

    <div class="highlight-box">
      <p class="section-title" style="margin-top: 0;">Prescription Information</p>
      <div class="rx-details">
        <div class="rx-detail-row">
          <span class="rx-detail-label">Medication:</span>
          <span class="rx-detail-value">${drugName}</span>
        </div>
        <div class="rx-detail-row">
          <span class="rx-detail-label">Rx Number:</span>
          <span class="rx-detail-value">${rxNumber}</span>
        </div>
        ${lastFillDate ? `
        <div class="rx-detail-row">
          <span class="rx-detail-label">Last Filled:</span>
          <span class="rx-detail-value">${lastFillDate}</span>
        </div>
        ` : ""}
        ${refillsRemaining !== undefined ? `
        <div class="rx-detail-row">
          <span class="rx-detail-label">Refills Available:</span>
          <span class="rx-detail-value">${refillsRemaining}</span>
        </div>
        ` : ""}
      </div>
    </div>

    <p><strong>Easy Refill Options:</strong></p>
    <div class="list-item">Use our online portal for instant refill requests</div>
    <div class="list-item">Call us at ${BRAND.contact.phone} to refill by phone</div>
    <div class="list-item">Visit us in person for one-on-one consultation</div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${BRAND.contact.portalUrl}" class="cta-button">Refill Now</a>
    </p>

    <hr class="divider">

    <p>Refill your medication today to ensure continuous treatment. Our team is here to help!</p>

    <p>Thank you for choosing ${BRAND.name}!</p>
  `;

  const textContent = `Hello ${patientName},

It's time to refill your prescription! Don't run out of your medication.

PRESCRIPTION INFORMATION
========================
Medication: ${drugName}
Rx Number: ${rxNumber}
${lastFillDate ? `Last Filled: ${lastFillDate}` : ""}
${refillsRemaining !== undefined ? `Refills Available: ${refillsRemaining}` : ""}

EASY REFILL OPTIONS
===================
• Use our online portal: ${BRAND.contact.portalUrl}
• Call us: ${BRAND.contact.phone}
• Visit us in person at ${getFullAddress()}

Refill your medication today to ensure continuous treatment.

Thank you for choosing ${BRAND.name}!`;

  return {
    html: buildEmailWrapper(htmlContent, `Time to Refill - ${BRAND.shortName}`),
    text: textContent,
  };
}

/**
 * Order Shipped template
 */
export function generateOrderShippedEmail(
  options: GenerateEmailOptions
): EmailTemplate {
  const {
    patientName = "Valued Customer",
    trackingNumber,
    carrier = "Standard Shipping",
    estimatedDelivery,
  } = options;

  const htmlContent = `
    <p>Hello ${patientName},</p>

    <p>Great news! Your order has shipped and is on its way to you.</p>

    <div class="success-notice">
      <strong>Your order is on the way!</strong>
    </div>

    ${trackingNumber || carrier ? `
    <div class="highlight-box">
      <p class="section-title" style="margin-top: 0;">Shipping Information</p>
      <div class="rx-details">
        ${trackingNumber ? `
        <div class="rx-detail-row">
          <span class="rx-detail-label">Tracking Number:</span>
          <span class="rx-detail-value">${trackingNumber}</span>
        </div>
        ` : ""}
        ${carrier ? `
        <div class="rx-detail-row">
          <span class="rx-detail-label">Carrier:</span>
          <span class="rx-detail-value">${carrier}</span>
        </div>
        ` : ""}
        ${estimatedDelivery ? `
        <div class="rx-detail-row">
          <span class="rx-detail-label">Estimated Delivery:</span>
          <span class="rx-detail-value">${estimatedDelivery}</span>
        </div>
        ` : ""}
      </div>
    </div>
    ` : ""}

    <p><strong>What Happens Next:</strong></p>
    <div class="list-item">Your package is in transit with ${carrier}</div>
    <div class="list-item">Track your shipment using the tracking number above</div>
    <div class="list-item">You'll receive a delivery notification when it arrives</div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${BRAND.contact.portalUrl}" class="cta-button">Track Order</a>
    </p>

    <hr class="divider">

    <p>If you have any questions about your shipment, please don't hesitate to contact us at ${BRAND.contact.phone}.</p>

    <p>Thank you for your order!</p>
  `;

  const textContent = `Hello ${patientName},

Great news! Your order has shipped and is on its way to you.

SHIPPING INFORMATION
====================
${trackingNumber ? `Tracking Number: ${trackingNumber}` : ""}
${carrier ? `Carrier: ${carrier}` : ""}
${estimatedDelivery ? `Estimated Delivery: ${estimatedDelivery}` : ""}

WHAT HAPPENS NEXT
=================
• Your package is in transit
• Track your shipment using the tracking information above
• You'll receive a delivery notification when it arrives

Track Order: ${BRAND.contact.portalUrl}

Questions?
==========
Call us: ${BRAND.contact.phone}

Thank you for your order!`;

  return {
    html: buildEmailWrapper(htmlContent, `Order Shipped - ${BRAND.shortName}`),
    text: textContent,
  };
}

/**
 * Welcome Patient template
 */
export function generateWelcomePatientEmail(
  options: GenerateEmailOptions
): EmailTemplate {
  const { patientName = "Valued Customer", portalUrl = BRAND.contact.portalUrl } =
    options;

  const htmlContent = `
    <p>Welcome to ${BRAND.name}!</p>

    <p>We're thrilled to have you as a new patient. Our team is committed to providing you with the highest quality pharmaceutical care and personalized service.</p>

    <div class="highlight-box">
      <p class="section-title" style="margin-top: 0;">Why Choose Us?</p>
      <div class="list-item">Expert compounding pharmacy with decades of experience</div>
      <div class="list-item">Personalized medication management and consultation</div>
      <div class="list-item">Convenient online portal for prescription refills</div>
      <div class="list-item">Comprehensive health and wellness support</div>
    </div>

    <p><strong>Getting Started:</strong></p>

    <p>We've created a patient portal account for you. Log in to:</p>
    <div class="list-item">View and manage your prescriptions</div>
    <div class="list-item">Request prescription refills</div>
    <div class="list-item">Access your medication history</div>
    <div class="list-item">Update your contact information</div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" class="cta-button">Access Your Portal</a>
    </p>

    <hr class="divider">

    <p><strong>Our Team is Here to Help</strong></p>

    <p>Have questions about your medications or our services? Our knowledgeable pharmacists and staff are available to assist you:</p>

    <div class="rx-details">
      <div class="rx-detail-row">
        <span class="rx-detail-label">Phone:</span>
        <span class="rx-detail-value"><a href="tel:${BRAND.contact.phone.replace(/[^\d]/g, "")}">${BRAND.contact.phone}</a></span>
      </div>
      <div class="rx-detail-row">
        <span class="rx-detail-label">Email:</span>
        <span class="rx-detail-value"><a href="mailto:${BRAND.contact.email}">${BRAND.contact.email}</a></span>
      </div>
    </div>

    <p>We look forward to serving you and supporting your health and wellness journey.</p>

    <p>Welcome aboard!<br>
    <strong>The ${BRAND.shortName} Team</strong></p>
  `;

  const textContent = `Welcome to ${BRAND.name}!

We're thrilled to have you as a new patient. Our team is committed to providing you with the highest quality pharmaceutical care and personalized service.

WHY CHOOSE US?
==============
• Expert compounding pharmacy with decades of experience
• Personalized medication management and consultation
• Convenient online portal for prescription refills
• Comprehensive health and wellness support

GETTING STARTED
===============
We've created a patient portal account for you. Log in to:
• View and manage your prescriptions
• Request prescription refills
• Access your medication history
• Update your contact information

Access Your Portal: ${portalUrl}

OUR TEAM IS HERE TO HELP
========================
Phone: ${BRAND.contact.phone}
Email: ${BRAND.contact.email}
Address: ${getFullAddress()}

Hours:
${BRAND.hours.weekday}
${BRAND.hours.saturday}
${BRAND.hours.sunday}

We look forward to serving you!

The ${BRAND.shortName} Team`;

  return {
    html: buildEmailWrapper(htmlContent, `Welcome to ${BRAND.shortName}!`),
    text: textContent,
  };
}

/**
 * Appointment Reminder template
 */
export function generateAppointmentReminderEmail(
  options: GenerateEmailOptions
): EmailTemplate {
  const {
    patientName = "Valued Customer",
    appointmentDate = "TBD",
    appointmentTime = "TBD",
    appointmentType = "consultation",
  } = options;

  const htmlContent = `
    <p>Hello ${patientName},</p>

    <p>This is a friendly reminder about your upcoming appointment at ${BRAND.name}.</p>

    <div class="highlight-box">
      <p class="section-title" style="margin-top: 0;">Appointment Details</p>
      <div class="rx-details">
        <div class="rx-detail-row">
          <span class="rx-detail-label">Date:</span>
          <span class="rx-detail-value">${appointmentDate}</span>
        </div>
        <div class="rx-detail-row">
          <span class="rx-detail-label">Time:</span>
          <span class="rx-detail-value">${appointmentTime}</span>
        </div>
        <div class="rx-detail-row">
          <span class="rx-detail-label">Type:</span>
          <span class="rx-detail-value">${appointmentType}</span>
        </div>
        <div class="rx-detail-row">
          <span class="rx-detail-label">Location:</span>
          <span class="rx-detail-value">${getFullAddress()}</span>
        </div>
      </div>
    </div>

    <p><strong>What to Bring:</strong></p>
    <div class="list-item">Valid photo ID</div>
    <div class="list-item">Insurance card (if applicable)</div>
    <div class="list-item">List of current medications</div>
    <div class="list-item">Any questions or concerns</div>

    <p><strong>Need to Reschedule?</strong></p>
    <p>If you need to reschedule your appointment, please call us at <a href="tel:${BRAND.contact.phone.replace(/[^\d]/g, "")}">${BRAND.contact.phone}</a> as soon as possible. We're happy to help you find a time that works best.</p>

    <p style="text-align: center; margin: 30px 0;">
      <a href="tel:${BRAND.contact.phone.replace(/[^\d]/g, "")}" class="cta-button">Call to Confirm</a>
    </p>

    <hr class="divider">

    <p>We look forward to seeing you and addressing your healthcare needs!</p>

    <p>Thank you for choosing ${BRAND.name}!</p>
  `;

  const textContent = `Hello ${patientName},

This is a friendly reminder about your upcoming appointment at ${BRAND.name}.

APPOINTMENT DETAILS
===================
Date: ${appointmentDate}
Time: ${appointmentTime}
Type: ${appointmentType}
Location: ${getFullAddress()}

WHAT TO BRING
=============
• Valid photo ID
• Insurance card (if applicable)
• List of current medications
• Any questions or concerns

NEED TO RESCHEDULE?
===================
Call us: ${BRAND.contact.phone}

We're open:
${BRAND.hours.weekday}
${BRAND.hours.saturday}
${BRAND.hours.sunday}

We look forward to seeing you!

Thank you for choosing ${BRAND.name}!`;

  return {
    html: buildEmailWrapper(
      htmlContent,
      `Appointment Reminder - ${BRAND.shortName}`
    ),
    text: textContent,
  };
}

/**
 * Invoice/Receipt template
 */
export function generateInvoiceReceiptEmail(
  options: GenerateEmailOptions
): EmailTemplate {
  const {
    patientName = "Valued Customer",
    invoiceNumber,
    invoiceDate,
    items = [],
    subtotal = 0,
    tax = 0,
    total = 0,
  } = options;

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid ${BRAND.colors.lightBorder}; text-align: left;">
        ${item.description}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid ${BRAND.colors.lightBorder}; text-align: center; width: 80px;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid ${BRAND.colors.lightBorder}; text-align: right; width: 100px;">
        $${(item.amount / 100).toFixed(2)}
      </td>
    </tr>
    `
    )
    .join("");

  const htmlContent = `
    <p>Hello ${patientName},</p>

    <p>Thank you for your purchase at ${BRAND.name}. Please find your receipt details below.</p>

    <div class="highlight-box">
      <p class="section-title" style="margin-top: 0;">Invoice Information</p>
      <div class="rx-details">
        ${invoiceNumber ? `
        <div class="rx-detail-row">
          <span class="rx-detail-label">Invoice #:</span>
          <span class="rx-detail-value">${invoiceNumber}</span>
        </div>
        ` : ""}
        ${invoiceDate ? `
        <div class="rx-detail-row">
          <span class="rx-detail-label">Date:</span>
          <span class="rx-detail-value">${invoiceDate}</span>
        </div>
        ` : ""}
      </div>
    </div>

    ${items.length > 0 ? `
    <p class="section-title">Purchase Details</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 15px 0;">
      <thead>
        <tr style="background-color: ${BRAND.colors.lightBg}; border-bottom: 2px solid ${BRAND.colors.primary};">
          <th style="padding: 12px; text-align: left; color: ${BRAND.colors.primary}; font-weight: 600;">Description</th>
          <th style="padding: 12px; text-align: center; color: ${BRAND.colors.primary}; font-weight: 600; width: 80px;">Qty</th>
          <th style="padding: 12px; text-align: right; color: ${BRAND.colors.primary}; font-weight: 600; width: 100px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr style="background-color: #f9f9f9;">
          <td colspan="2" style="padding: 15px; text-align: right; font-weight: 600;">Subtotal:</td>
          <td style="padding: 15px; text-align: right; font-weight: 600;">$${(subtotal / 100).toFixed(2)}</td>
        </tr>
        ${tax > 0 ? `
        <tr style="background-color: #f9f9f9;">
          <td colspan="2" style="padding: 10px; text-align: right; font-weight: 600;">Tax:</td>
          <td style="padding: 10px; text-align: right; font-weight: 600;">$${(tax / 100).toFixed(2)}</td>
        </tr>
        ` : ""}
        <tr style="background-color: ${BRAND.colors.lightBg}; border-top: 2px solid ${BRAND.colors.primary};">
          <td colspan="2" style="padding: 15px; text-align: right; font-weight: 700; color: ${BRAND.colors.primary};">TOTAL:</td>
          <td style="padding: 15px; text-align: right; font-weight: 700; color: ${BRAND.colors.primary}; font-size: 16px;">$${(total / 100).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    ` : ""}

    <hr class="divider">

    <p><strong>Questions about your receipt?</strong></p>
    <p>Please contact us at <a href="tel:${BRAND.contact.phone.replace(/[^\d]/g, "")}">${BRAND.contact.phone}</a> or <a href="mailto:${BRAND.contact.email}">${BRAND.contact.email}</a>.</p>

    <p>Thank you for your business!</p>
  `;

  const textContent = `Hello ${patientName},

Thank you for your purchase at ${BRAND.name}. Please find your receipt details below.

INVOICE INFORMATION
===================
${invoiceNumber ? `Invoice #: ${invoiceNumber}` : ""}
${invoiceDate ? `Date: ${invoiceDate}` : ""}

${
  items.length > 0
    ? `PURCHASE DETAILS
=================
${items.map((item) => `${item.description} x${item.quantity} $${(item.amount / 100).toFixed(2)}`).join("\n")}

Subtotal: $${(subtotal / 100).toFixed(2)}
${tax > 0 ? `Tax: $${(tax / 100).toFixed(2)}` : ""}
TOTAL: $${(total / 100).toFixed(2)}`
    : ""
}

QUESTIONS?
==========
Phone: ${BRAND.contact.phone}
Email: ${BRAND.contact.email}

Thank you for your business!`;

  return {
    html: buildEmailWrapper(htmlContent, `Receipt - ${BRAND.shortName}`),
    text: textContent,
  };
}

/**
 * Main email generator function
 */
export function generateEmailHTML(
  type: EmailTemplateType,
  options: GenerateEmailOptions
): EmailTemplate {
  const generators: Record<
    EmailTemplateType,
    (options: GenerateEmailOptions) => EmailTemplate
  > = {
    prescriptionReady: generatePrescriptionReadyEmail,
    refillReminder: generateRefillReminderEmail,
    orderShipped: generateOrderShippedEmail,
    welcomePatient: generateWelcomePatientEmail,
    appointmentReminder: generateAppointmentReminderEmail,
    invoiceReceipt: generateInvoiceReceiptEmail,
  };

  const generator = generators[type];
  if (!generator) {
    throw new Error(`Unknown email template type: ${type}`);
  }

  return generator(options);
}
