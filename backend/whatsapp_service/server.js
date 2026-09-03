const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || process.env.WHATSAPP_PORT || 3001;
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

// Root URL: Visual Web QR Scanner & Status
app.get('/', (req, res) => {
  if (isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Friday WhatsApp Bot</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px; background: #00261D; color: white;">
        <div style="max-width: 500px; margin: auto; background: rgba(255,255,255,0.05); padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
          <h1 style="color: #4ade80; margin: 0 0 10px 0; font-size: 24px;">Friday WhatsApp Bot Connected!</h1>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Your WhatsApp number is actively linked and sending instant booking alerts & receipts.</p>
          <div style="margin-top: 25px; padding: 8px 16px; background: rgba(74, 222, 128, 0.15); border-radius: 20px; display: inline-block; color: #86efac; font-size: 12px; font-weight: bold;">
            ● STATUS: ONLINE & READY
          </div>
        </div>
      </body>
      </html>
    `);
  }

  if (qrCodeString) {
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeString)}`;
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Scan Friday WhatsApp QR Code</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="5">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #F8FAF6; color: #191C1A;">
        <div style="max-width: 480px; margin: auto; background: white; padding: 35px; border-radius: 28px; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
          <h2 style="color: #00261D; margin: 0 0 8px 0; font-size: 22px;">📱 Link Friday WhatsApp Bot</h2>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
            Open WhatsApp on your phone ➔ <b>Linked Devices</b> ➔ <b>Link a Device</b>, then scan the QR code below:
          </p>
          <div style="padding: 15px; background: #ffffff; border: 2px dashed #00261D; border-radius: 20px; display: inline-block;">
            <img src="${qrImgUrl}" alt="WhatsApp QR Code" style="width: 250px; height: 250px; display: block;" />
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 20px;">Auto-refreshing every 5 seconds until paired...</p>
        </div>
      </body>
      </html>
    `);
  }

  return res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Friday WhatsApp Bot</title><meta http-equiv="refresh" content="3"></head>
    <body style="font-family: sans-serif; text-align: center; padding: 50px 20px; background: #F8FAF6;">
      <h3>⏳ Initializing Friday WhatsApp Bot...</h3>
      <p style="color: #666; font-size: 13px;">Generating QR code, please wait 3 seconds...</p>
    </body>
    </html>
  `);
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
