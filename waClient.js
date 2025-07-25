require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ← KEEP this (you’ll need it to locate your Chromium)
const puppeteer = require("puppeteer");

const B_JID = process.env.ACCOUNT_B_JID;
const LOCAL_ENDPOINT = process.env.LOCAL_BACKEND_ENDPOINT;
const BROCHURE_DIR = path.join(__dirname, "brochures");

// Ensure brochures folder exists
if (!fs.existsSync(BROCHURE_DIR)) {
  fs.mkdirSync(BROCHURE_DIR);
}

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./.wwebjs_auth",
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // ← ONLY CHANGE: point at the Chromium that Puppeteer just installed
    executablePath: puppeteer.executablePath()
  },
});

client.on("qr", (qr) => {
  console.log("Scan the QR code with Account A:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Account A is ready");
});

// Utility: Skip irrelevant messages
const isValidProjectMessage = (text) => {
  if (!text || typeof text !== "string") return false;
  const skipPhrases = [
    "thanks", "any update", "?", "send again", "what is price", "how much",
    "interested", "availability", "available", "location", "unit", "payment plan",
    "details", "information", "how many bedrooms", "send more", "same project",
    "can you", "do you", "are you", "what’s the", "what is", "can i"
  ];
  return !skipPhrases.some((phrase) =>
    text.toLowerCase().includes(phrase.toLowerCase())
  );
};

client.on("message", async (msg) => {
  try {
    const isGroup = msg.from && msg.from.endsWith("@g.us");
    if (!isGroup) return;

    const isText = msg.type === "chat" && typeof msg.body === "string";
    const senderName =
      msg.sender?.pushname || msg._data?.notifyName || msg.author || "Unknown";
    const group = msg._data.notifyName || "Unknown Group";

    // 1️⃣ PDF Brochure Handling
    if (
      msg.hasMedia &&
      msg.type === "document" &&
      msg._data.mimetype === "application/pdf"
    ) {
      const media = await msg.downloadMedia();
      if (media && media.data) {
        const filenameRaw =
          msg._data.filename || `brochure_${Date.now()}.pdf`;
        const safeFilename = filenameRaw.replace(
          /[^\w\d.\-_]+/g,
          "_"
        );
        const pdfPath = path.join(BROCHURE_DIR, safeFilename);
        fs.writeFileSync(
          pdfPath,
          Buffer.from(media.data, "base64")
        );
        console.log("📎 Brochure saved:", safeFilename);

        const rawMessage =
          `Group: ${msg.from}\n` +
          `Sender: ${group} / ${senderName}\n` +
          `Time: ${new Date().toISOString()}\n` +
          `Brochure:\n${safeFilename.replace(".pdf", "")}`;

        await axios.post(LOCAL_ENDPOINT, { raw: rawMessage });
        console.log(
          "✅ Brochure metadata sent to backend"
        );
      } else {
        console.warn("⚠️ PDF media data missing or unreadable");
      }
      return;
    }

    // 2️⃣ Text Message: Only valid project messages
    if (isText && isValidProjectMessage(msg.body)) {
      const rawMessage =
        `Group: ${msg.from}\n` +
        `Sender: ${group} / ${senderName}\n` +
        `Time: ${new Date().toISOString()}\n` +
        `Message:\n${msg.body}`;

      try {
        const response = await axios.post(LOCAL_ENDPOINT, {
          raw: rawMessage,
        });
        console.log(
          "✅ Project message stored:",
          response.data.message
        );
      } catch (err) {
        console.error(
          "❌ Failed to POST to backend:",
          err.message
        );
      }
    } else {
      console.log(
        "⚠️ Skipped irrelevant message:",
        msg.body?.slice(0, 60)
      );
    }
  } catch (err) {
    console.error("❌ Error handling message:", err.message);
  }
});

// 🔁 Auto-reconnect watchdog
setInterval(() => {
  if (!client.info) {
    console.warn(
      "⚠️ WhatsApp client info unavailable — attempting reconnect..."
    );
    client.initialize();
  }
}, 10000); // every 10 seconds

client.initialize();
