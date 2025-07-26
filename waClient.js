const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const puppeteer = require('puppeteer');
require('dotenv').config();

const client = new Client({
    authStrategy: new LocalAuth({ 
        clientId: process.env.SESSION_ID || "property-bot-session" 
    }),
    puppeteer: {
        headless: true,
        executablePath: puppeteer.executablePath(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--memory-pressure-off'
        ],
        timeout: 60000,
        // Remove problematic args that interfere with WhatsApp Web
        defaultViewport: null
    },
    // Add webVersionCache to avoid injection issues
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

// Generate QR Code
client.on('qr', (qr) => {
    console.log('🔲 QR Code received! Scan it with your WhatsApp:');
    qrcode.generate(qr, { small: true });
    console.log('QR Code URL:', qr);
});

// Client ready
client.on('ready', () => {
    console.log('✅ WhatsApp Client is ready!');
    console.log('🤖 Property bot is now listening for messages...');
});

// Handle authentication
client.on('authenticated', () => {
    console.log('✅ Client authenticated successfully');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
    console.log('❌ Client was disconnected:', reason);
});

// Listen for messages
client.on('message', async (message) => {
    try {
        const chat = await message.getChat();
        
        // Only process group messages
        if (chat.isGroup) {
            console.log(`📨 New message from group "${chat.name}":`, message.body.substring(0, 100) + '...');
            
            // Send to backend for processing
            if (process.env.LOCAL_BACKEND_ENDPOINT) {
                const response = await axios.post(`${process.env.LOCAL_BACKEND_ENDPOINT}/api/process-message`, {
                    groupName: chat.name,
                    groupId: chat.id._serialized,
                    message: message.body,
                    sender: message.from,
                    timestamp: new Date(message.timestamp * 1000),
                    messageId: message.id._serialized
                });
                console.log('✅ Message processed and sent to backend');
            }
        }
    } catch (error) {
        console.error('❌ Error processing message:', error.message);
    }
});

// Handle errors
client.on('error', (error) => {
    console.error('❌ WhatsApp Client Error:', error);
});

// Start the client
console.log('🚀 Starting Property WhatsApp Bot...');
console.log('📍 Using Chromium at:', puppeteer.executablePath());

client.initialize().catch(error => {
    console.error('❌ Failed to initialize client:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down WhatsApp Bot...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down...');
    await client.destroy();
    process.exit(0);
});
