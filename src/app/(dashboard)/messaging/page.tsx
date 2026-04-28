/**
 * /messaging — Communications history (real data).
 *
 * The mock-data version showed a chat-style inbox with hardcoded
 * patient/prescriber/payer threads ("Dr. Landry · Lafayette Family
 * Med", "James Hebert" etc.). The real schema is one-directional —
 * CommunicationLog records outbound SMS/email/call attempts. There's
 * no native two-way thread store yet.
 *
 * This page now shows the truth: a feed of recent outbound
 * notifications grouped by patient, with their delivery status.
 * Two-way messaging (Twilio inbound webhook → reply thread) is a
 * future build; for now the operator can see what's been sent and
 * use the "Send notification" action to send another.
 */
import { getMessagingStats, getNotificationHistory } from "./actions";
import { prisma } from "@/lib/prisma";
import { formatPatientName, formatDateTime } from "@/lib/utils/formatters";
import MessagingClient, { type MessageEntry } from "./MessagingClient";

export const dynamic = "force-dynamic";

export default async function MessagingPage() {
  const [stats, history] = await Promise.all([
    getMessagingStats(),
    getNotificationHistory({ limit: 100 }),
  ]);

  // Notification history doesn't include patient names — fetch them in
  // bulk so the feed reads humanly. Filter out null patientIds (system
  // notifications without an explicit recipient).
  const patientIds = Array.from(
    new Set(history.map((h) => h.patientId).filter((id): id is string => !!id))
  );
  const patients = patientIds.length
    ? await prisma.patient.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, firstName: true, lastName: true, middleName: true },
      })
    : [];
  const patientById = new Map(patients.map((p) => [p.id, p]));

  const entries: MessageEntry[] = history.map((h) => {
    const patient = h.patientId ? patientById.get(h.patientId) : null;
    return {
      id: h.id,
      channel: h.channel as "email" | "sms",
      to: h.toAddress,
      patientName: patient ? formatPatientName(patient) : null,
      subject: h.subject ?? null,
      template: h.templateName ?? null,
      sentAt: formatDateTime(h.createdAt),
    };
  });

  return (
    <MessagingClient
      entries={entries}
      stats={{
        totalSent: stats.totalSent,
        smsSent: stats.smsSent,
        emailsSent: stats.emailsSent,
        lastSentAt: stats.lastSentAt ? formatDateTime(stats.lastSentAt) : null,
      }}
    />
  );
}
