import { config } from "../config";

const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;

export async function sendMessage(to: string, text: string): Promise<void> {
  const response = await fetch(WHATSAPP_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to send WhatsApp message:", error);
    throw new Error(`WhatsApp API error: ${response.status}`);
  }
}

interface WebhookMessage {
  from: string;
  name: string;
  text: string;
  messageId: string;
}

export function extractMessage(body: any): WebhookMessage | null {
  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) return null;

    const message = value.messages[0];

    // Only handle text messages
    if (message.type !== "text") return null;

    const contact = value.contacts?.[0];

    return {
      from: message.from,
      name: contact?.profile?.name ?? "",
      text: message.text.body,
      messageId: message.id,
    };
  } catch {
    return null;
  }
}

export function isValidWebhook(body: any): boolean {
  return (
    body?.object === "whatsapp_business_account" &&
    body?.entry?.[0]?.changes?.[0]?.value?.messaging_product === "whatsapp"
  );
}
