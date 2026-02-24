import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function getOrCreateContact(whatsappId: string, name?: string) {
  return prisma.contact.upsert({
    where: { whatsappId },
    update: { name: name || undefined },
    create: { whatsappId, name },
  });
}

export async function getHistory(contactId: string, limit: number = 20) {
  const messages = await prisma.message.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Return in chronological order
  return messages.reverse().map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));
}

export async function saveMessage(
  contactId: string,
  role: "user" | "assistant",
  content: string
) {
  return prisma.message.create({
    data: { contactId, role, content },
  });
}
