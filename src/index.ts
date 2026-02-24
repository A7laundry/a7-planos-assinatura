import express from "express";
import { config } from "./config";
import webhookRouter from "./routes/webhook";

const app = express();

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Webhook routes
app.use(webhookRouter);

app.listen(config.PORT, () => {
  console.log(`WhatsApp Agent server running on port ${config.PORT}`);
});
