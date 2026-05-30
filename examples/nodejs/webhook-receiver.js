/**
 * Veri Merkezi Webhook Receiver — Node.js / Express
 *
 * Setup:
 * npm install express
 * VM_WEBHOOK_SECRET=whsec_xxx node webhook-receiver.js
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.VM_WEBHOOK_SECRET || 'whsec_REPLACE_ME';

// İmza doğrulaması için raw body lazım
app.use('/wa-webhook', express.raw({ type: 'application/json', limit: '5mb' }));

const processedEvents = new Set(); // Production'da Redis/DB

app.post('/wa-webhook', (req, res) => {
 const signature = req.headers['x-verimerkezi-signature-256'] || '';
 const timestamp = req.headers['x-verimerkezi-timestamp'] || '';
 const eventId = req.headers['x-verimerkezi-event-id'] || '';
 const rawBody = req.body.toString('utf8');

 // 1) Replay koruması
 if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300) {
 console.warn('[WaWebhook] expired:', timestamp);
 return res.status(403).send('expired');
 }

 // 2) İmza doğrulama
 const expected = 'sha256=' + crypto
 .createHmac('sha256', SECRET)
 .update(`${timestamp}.${rawBody}`)
 .digest('hex');

 const sigBuf = Buffer.from(signature);
 const expBuf = Buffer.from(expected);
 if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
 console.warn('[WaWebhook] invalid signature for event:', eventId);
 return res.status(403).send('invalid_signature');
 }

 // 3) Idempotency
 if (processedEvents.has(eventId)) {
 return res.json({ ok: true, note: 'already_processed' });
 }

 // 4) Parse + dispatch
 let event;
 try {
 event = JSON.parse(rawBody);
 } catch (e) {
 return res.status(400).send('invalid_json');
 }

 try {
 switch (event.event) {
 case 'message.received':
 handleIncomingMessage(event.data);
 break;
 case 'message.status.sent':
 case 'message.status.delivered':
 case 'message.status.read':
 handleStatusUpdate(event.data, event.event);
 break;
 case 'message.status.failed':
 handleFailedMessage(event.data);
 break;
 case 'template.approved':
 console.log('Şablon onaylandı:', event.data.template_name);
 break;
 case 'template.rejected':
 console.log('Şablon reddedildi:', event.data.template_name, event.data.rejected_reason);
 break;
 case 'quality.changed':
 console.log(`Kalite: ${event.data.display_phone_number} -> ${event.data.quality_rating}`);
 break;
 default:
 console.log('Bilinmeyen event:', event.event);
 }

 processedEvents.add(eventId);
 res.json({ ok: true });
 } catch (err) {
 console.error('[WaWebhook] handler error:', err);
 res.status(500).json({ ok: false, error: 'handler_error' });
 }
});

// ═══════════════════════════════════════════════════════════════
// HANDLER'LAR — Kendi iş mantığınızı buraya yazın
// ═══════════════════════════════════════════════════════════════

function handleIncomingMessage(data) {
 const { from, text, contact, phone_number_id } = data;
 const name = contact?.profile_name || 'Müşteri';
 console.log(` ${name} (${from}): ${text?.body || '[medya]'}`);

 // Otomatik yanıt göndermek için:
 // const { VeriMerkeziClient } = require('@verimerkezi/whatsapp-sdk');
 // const vm = new VeriMerkeziClient(process.env.VM_API_KEY);
 // await vm.sendText(phone_number_id, from, 'Mesajınızı aldık!');
}

function handleStatusUpdate(data, eventName) {
 const status = eventName.replace('message.status.', '');
 console.log(` ${data.wamid} -> ${status}`);
}

function handleFailedMessage(data) {
 console.error(`Hayir ${data.wamid} · ${data.error?.message || 'unknown'}`);
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
 console.log(`Veri Merkezi webhook receiver çalışıyor: http://localhost:${PORT}/wa-webhook`);
});
