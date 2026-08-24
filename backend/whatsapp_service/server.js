const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = process.env.WHATSAPP_PORT || 3001;
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let isConnected = false;
let qrCodeString = null;

async function startWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Friday Travel Copilot', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeString = qr;
      console.log('\n=============================================================');
      console.log('📱 SCAN THIS QR CODE ON YOUR WHATSAPP (Linked Devices):');
      console.log('=============================================================');
      qrcode.generate(qr, { small: true });
      console.log('=============================================================\n');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      isConnected = false;
      console.log('⚠️ WhatsApp connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 3000);
      }
    } else if (connection === 'open') {
      isConnected = true;
      qrCodeString = null;
      console.log('\n=============================================================');
      console.log('✅ FRIDAY WHATSAPP BOT IS CONNECTED & READY TO SEND MESSAGES!');
      console.log('=============================================================\n');
    }
  });
}

// Format phone number to WhatsApp JID (e.g. 03001234567 -> 923001234567@s.whatsapp.net)
function formatJid(phoneNumber) {
  let clean = String(phoneNumber).trim().replace(/\D/g, '');
  if (clean.startsWith('03')) {
    clean = '92' + clean.slice(1);
  } else if (clean.startsWith('9203')) {
    clean = '92' + clean.slice(3);
  }
  return `${clean}@s.whatsapp.net`;
}

// Endpoint: Send single message
app.post('/send-message', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Phone number (to) and message are required' });
  }

  if (!sock || !isConnected) {
    console.log(`[WHATSAPP QUEUED (Not Connected)] To: ${to} | Message: ${message.slice(0, 60)}...`);
    return res.json({
      success: true,
      status: 'queued_waiting_qr',
      to,
      note: 'Message queued. Please scan the terminal QR code to deliver.',
    });
  }

  try {
    const jid = formatJid(to);
    const sent = await sock.sendMessage(jid, { text: message });
    console.log(`✅ WhatsApp message sent to ${to} (JID: ${jid})`);
    return res.json({
      success: true,
      status: 'delivered',
      messageId: sent.key.id,
      to,
    });
  } catch (err) {
    console.error(`❌ Failed to send WhatsApp message to ${to}:`, err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Send to multiple phone numbers
app.post('/send-bulk', async (req, res) => {
  const { numbers, message } = req.body;

  if (!Array.isArray(numbers) || !message) {
    return res.status(400).json({ success: false, error: 'Array of numbers and message are required' });
  }

  const results = [];
  for (const num of numbers) {
    if (!num) continue;
    try {
      if (sock && isConnected) {
        const jid = formatJid(num);
        const sent = await sock.sendMessage(jid, { text: message });
        results.push({ to: num, success: true, messageId: sent.key.id });
      } else {
        results.push({ to: num, success: true, status: 'queued' });
      }
    } catch (err) {
      results.push({ to: num, success: false, error: err.message });
    }
  }

  return res.json({ success: true, dispatched_count: results.length, results });
});

// Endpoint: Check status
app.get('/status', (req, res) => {
  return res.json({
    service: 'Friday WhatsApp Baileys Bot',
    connected: isConnected,
    qrReady: !!qrCodeString,
    port: PORT,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Friday WhatsApp Baileys service listening on http://localhost:${PORT}`);
  startWhatsAppBot();
});
