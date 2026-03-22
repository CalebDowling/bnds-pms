"use server";

interface GetMessagesOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

interface MessageData {
  id: string;
  channel: string;
  fromAddress?: string;
  toAddress: string;
  subject?: string;
  body?: string;
  status: string;
  createdAt: string;
  isRead?: boolean;
}

export async function getMessages(
  channel: "sms" | "email" | "voicemail" | "fax",
  options: GetMessagesOptions = {}
): Promise<MessageData[]> {
  const { search = "", limit = 50, offset = 0 } = options;

  const { prisma } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Build filter
  const where: any = { channel };

  if (search) {
    where.OR = [
      { body: { contains: search, mode: "insensitive" } },
      { toAddress: { contains: search, mode: "insensitive" } },
      { fromAddress: { contains: search, mode: "insensitive" } },
    ];
  }

  const messages = await prisma.communicationLog.findMany({
    where,
    select: {
      id: true,
      channel: true,
      fromAddress: true,
      toAddress: true,
      subject: true,
      body: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return messages.map((m) => ({
    id: m.id,
    channel: m.channel,
    fromAddress: m.fromAddress || undefined,
    toAddress: m.toAddress,
    subject: m.subject || undefined,
    body: m.body || undefined,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
  }));
}

interface UnreadCountsData {
  sms: number;
  email: number;
  voicemail: number;
  fax: number;
}

export async function getUnreadCounts(): Promise<UnreadCountsData> {
  const { prisma } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const channels = ["sms", "email", "voicemail", "fax"] as const;

  const counts = await Promise.all(
    channels.map(async (channel) => {
      const count = await prisma.communicationLog.count({
        where: {
          channel,
          status: "unread",
        },
      });
      return { channel, count };
    })
  );

  const result: UnreadCountsData = {
    sms: 0,
    email: 0,
    voicemail: 0,
    fax: 0,
  };

  counts.forEach(({ channel, count }) => {
    result[channel] = count;
  });

  return result;
}

export async function markAsRead(messageId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  await prisma.communicationLog.update({
    where: { id: messageId },
    data: { status: "read" },
  });
}

export async function sendReply(messageId: string, body: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  if (!body.trim()) throw new Error("Reply cannot be empty");

  // Get the original message to reply to
  const original = await prisma.communicationLog.findUnique({
    where: { id: messageId },
  });

  if (!original) throw new Error("Original message not found");

  // Create reply message
  await prisma.communicationLog.create({
    data: {
      channel: original.channel,
      direction: "outbound",
      fromAddress: original.toAddress,
      toAddress: original.fromAddress || original.toAddress,
      subject: original.subject
        ? `RE: ${original.subject}`
        : undefined,
      body,
      status: "sent",
      sentBy: user.id,
      patientId: original.patientId,
      prescriberId: original.prescriberId,
    },
  });
}
