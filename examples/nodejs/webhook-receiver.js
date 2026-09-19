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
 case 'message.echo':
 // CoExistence: işletme telefondaki WhatsApp uygulamasından müşteriye yazdı
 console.log(`İşletme yanıtladı -> ${event.data.to}: ${event.data.text || '[' + event.data.type + ']'}`);
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
 case 'template.flagged':
 case 'template.paused': {
 const durum = { 'template.rejected': 'reddedildi', 'template.flagged': 'işaretlendi', 'template.paused': 'durduruldu' }[event.event];
 console.log(`Şablon ${durum}: ${event.data.template_name} (${event.data.language})${event.data.reason ? ' · ' + event.data.reason : ''}`);
 break;
 }
 case 'quality.changed':
 console.log(`Kalite: ${event.data.phone} -> ${event.data.quality}`);
 break;
 case 'account.alert':
 // field: account_update | account_alerts — event: Meta'nın olay adı (örn. DISABLED_UPDATE)
 console.warn(`Hesap uyarısı: ${event.data.field} · ${event.data.event}`);
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
 // data.text düz metindir (medyada açıklama; açıklama yoksa boş).
 // Telefonu gizli kullanıcılarda data.from null gelir; kimlik data.user_id (BSUID) olur.
 const { from, user_id, name, type, text, media, phone_number_id } = data;
 const kimden = from || user_id || 'bilinmiyor';
 const ad = name || 'Müşteri';

 if (media && media.media_id) {
 console.log(`${ad} (${kimden}) ${type} gönderdi · media_id=${media.media_id}${text ? ' · ' + text : ''}`);
 // Dosyayı indirmek için (bkz. docs/10-media.md):
 // const { VeriMerkeziClient } = require('@verimerkezi/whatsapp-sdk');
 // const vm = new VeriMerkeziClient(process.env.VM_API_KEY);
 // vm.downloadMedia(media.media_id, require('fs').createWriteStream(`medya-${media.media_id}`)).catch(console.error);
 } else if (media && media.error) {
 // Nadiren dosya Meta'dan alınamaz; bu durumda indirilebilir dosya yoktur.
 console.warn(`${ad} (${kimden}) ${type} gönderdi, dosya alınamadı: ${media.error}`);
 } else {
 console.log(`${ad} (${kimden}): ${text}`);
 }

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
 // errors: Meta'nın hata listesi — [{ code, title, message, error_data: { details }, href }]
 const hata = (data.errors && data.errors[0]) || {};
 console.error(`Gönderim başarısız · ${data.wamid} · alıcı=${data.recipient} · kod=${hata.code ?? '-'} · ${hata.message || hata.title || 'bilinmiyor'}`);
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
 console.log(`Veri Merkezi webhook receiver çalışıyor: http://localhost:${PORT}/wa-webhook`);
});
