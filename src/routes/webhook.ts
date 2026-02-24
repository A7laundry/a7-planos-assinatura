import { Router, Request, Response } from "express";
import { config } from "../config";
import { extractMessage, isValidWebhook, sendMessage } from "../services/whatsapp.service";
import { generateResponse } from "../services/claude.service";
import { getOrCreateContact, getHistory, saveMessage } from "../services/conversation.service";
import { SYSTEM_PROMPT } from "../prompts/system-prompt";

const router = Router();

// Webhook verification (GET) - Meta sends this to verify the webhook URL
router.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    console.warn("Webhook verification failed");
    res.sendStatus(403);
  }
});

// Webhook message handler (POST) - Meta sends messages here
router.post("/webhook", async (req: Request, res: Response) => {
  // Always respond 200 quickly to acknowledge receipt
  res.sendStatus(200);

  try {
    if (!isValidWebhook(req.body)) return;

    const message = extractMessage(req.body);
    if (!message) return;

    console.log(`Message from ${message.from}: ${message.text}`);

    // Get or create contact
    const contact = await getOrCreateContact(message.from, message.name);

    // Save user message
    await saveMessage(contact.id, "user", message.text);

    // Load conversation history
    const history = await getHistory(contact.id);

    // Generate response with Claude
    const responseText = await generateResponse(SYSTEM_PROMPT, history);

    // Save assistant response
    await saveMessage(contact.id, "assistant", responseText);

    // Send response via WhatsApp
    await sendMessage(message.from, responseText);

    console.log(`Response sent to ${message.from}: ${responseText}`);
  } catch (error) {
    console.error("Error processing message:", error);
  }
});

export default router;
