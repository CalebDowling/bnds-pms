/**
 * Notification dispatcher
 * Handles sending notifications to patients via email and/or SMS
 * Logs all communications to CommunicationLog
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "./email";
import { sendSMS } from "./sms";
import { getTemplate, TemplateName, TemplateData } from "./templates";

export type Channel = "email" | "sms";

interface NotifyPatientOptions {
  channels?: Channel[];
  sentBy?: string; // User ID of who triggered the notification
}

/**
 * Send a notification to a patient via specified channels
 * Respects patient communication preferences
 * Logs to CommunicationLog
 */
export async function notifyPatient(
  patientId: string,
  templateName: TemplateName,
  data: TemplateData,
  options: NotifyPatientOptions = {}
): Promise<{
  success: boolean;
  channels: Record<Channel, { success: boolean; messageId?: string; error?: string }>;
  communicationLogId?: string;
}> {
  const { channels = ["email", "sms"], sentBy } = options;

  try {
    // Fetch patient data
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        phoneNumbers: {
          where: { isPrimary: true },
        },
      },
    });

    if (!patient) {
      const notFoundResults: Record<Channel, { success: boolean; messageId?: string; error?: string }> = {
        email: { success: false, error: "Patient not found" },
        sms: { success: false, error: "Patient not found" },
      };
      return {
        success: false,
        channels: notFoundResults,
      };
    }

    // Get template
    const template = getTemplate(templateName, {
      patientName: `${patient.firstName} ${patient.lastName}`,
      ...data,
    });

    if (!template) {
      const emptyResults: Record<Channel, { success: boolean; messageId?: string; error?: string }> = {
        email: { success: false, error: "Template not found" },
        sms: { success: false, error: "Template not found" },
      };
      return {
        success: false,
        channels: emptyResults,
      };
    }

    const results: Record<Channel, { success: boolean; messageId?: string; error?: string }> = {
      email: { success: false, error: "Not sent" },
      sms: { success: false, error: "Not sent" },
    };

    let overallSuccess = false;
    let communicationLogId: string | undefined;

    // Send via email if requested and patient has email
    if (channels.includes("email") && patient.email) {
      const emailResult = await sendEmail({
        to: patient.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      results["email"] = emailResult;

      if (emailResult.success) {
        overallSuccess = true;

        // Log to CommunicationLog
        const log = await prisma.communicationLog.create({
          data: {
            channel: "email",
            direction: "outbound",
            patientId,
            fromAddress: process.env.SMTP_FROM || "noreply@boudreauxsnewdrug.com",
            toAddress: patient.email,
            subject: template.subject,
            body: template.text,
            status: "sent",
            templateName,
            sentBy,
          },
        });

        communicationLogId = log.id;
      }
    }

    // Send via SMS if requested and patient has phone with SMS consent
    if (channels.includes("sms")) {
      const phoneNumber = patient.phoneNumbers[0];

      if (phoneNumber && phoneNumber.acceptsSms) {
        const smsResult = await sendSMS(phoneNumber.number, template.sms);

        results["sms"] = smsResult;

        if (smsResult.success) {
          overallSuccess = true;

          // Log to CommunicationLog
          const log = await prisma.communicationLog.create({
            data: {
              channel: "sms",
              direction: "outbound",
              patientId,
              toAddress: phoneNumber.number,
              body: template.sms,
              status: "sent",
              templateName,
              sentBy,
            },
          });

          if (!communicationLogId) {
            communicationLogId = log.id;
          }
        }
      }
    }

    return {
      success: overallSuccess,
      channels: results,
      communicationLogId,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Failed to notify patient ${patientId}:`, errorMsg);

    return {
      success: false,
      channels: {
        email: { success: false, error: errorMsg },
        sms: { success: false, error: errorMsg },
      },
    };
  }
}

/**
 * Batch send notifications to multiple patients
 */
export async function notifyBatch(
  patientIds: string[],
  templateName: TemplateName,
  data: TemplateData,
  options: NotifyPatientOptions = {}
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    patientId: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const results = [];
  let successful = 0;
  let failed = 0;

  for (const patientId of patientIds) {
    try {
      const result = await notifyPatient(patientId, templateName, data, options);

      if (result.success) {
        results.push({ patientId, success: true });
        successful++;
      } else {
        results.push({
          patientId,
          success: false,
          error: "Failed to send notification",
        });
        failed++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ patientId, success: false, error: errorMsg });
      failed++;
    }
  }

  return {
    total: patientIds.length,
    successful,
    failed,
    results,
  };
}
