require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");

const propertyRoutes = require("./routes/propertyRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", propertyRoutes);

// Health Check Route for Render
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "Health check passed ✅" });
});

// Webhook Verification
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Webhook Receiver
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const body = req.body;
  console.log("Received webhook:", JSON.stringify(body, null, 2));

  const entries = body.entry || [];
  for (let entry of entries) {
    const changes = entry.changes || [];
    for (let change of changes) {
      const value = change.value || {};
      const messages = value.messages || [];

      for (let msg of messages) {
        if (msg.type === "text" && msg.text && msg.text.body) {
          const from = msg.from;
          const timestamp = msg.timestamp;
          const text = msg.text.body;

          const rawMessage =
            `From: ${from}\n` +
            `At: ${new Date(timestamp * 1000).toISOString()}\n` +
            `Message:\n` +
            text;

          try {
            await axios.post(
              process.env.LOCAL_BACKEND_ENDPOINT,
              { raw: rawMessage }
            );
            console.log("✅ Forwarded message to /process-message");
          } catch (err) {
            console.error("❌ Error forwarding message:", err.message);
          }
        }
      }
    }
  }
});

// DB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
  });
