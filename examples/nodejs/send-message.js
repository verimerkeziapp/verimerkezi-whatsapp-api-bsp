/**
 * Veri Merkezi WhatsApp API — Mesaj Gönderim Örneği (Node.js)
 *
 * Çalıştırma:
 * VM_API_KEY=vmk_live_xxx node examples/nodejs/send-message.js
 */

const { VeriMerkeziClient } = require('../../sdk/nodejs/lib/verimerkezi-client');

const apiKey = process.env.VM_API_KEY || 'vmk_live_REPLACE';
const phoneNumberId = process.env.VM_PHONE_NUMBER_ID || '1234567890';
const recipient = '905551112233';

const vm = new VeriMerkeziClient(apiKey);

(async () => {
 // ───── Düz Metin ─────
 try {
 const r = await vm.sendText(phoneNumberId, recipient, 'Merhaba! Bu test mesajıdır.');
 console.log('Metin:', r.wamid);
 } catch (e) {
 console.error('HATA: Metin hatası:', e.message);
 }

 // ───── Şablon ─────
 try {
 const r = await vm.sendTemplate(
 phoneNumberId,
 recipient,
 'hosgeldin',
 'tr',
 [
 {
 type: 'body',
 parameters: [{ type: 'text', text: 'Ahmet' }],
 },
 ]
 );
 console.log('Şablon:', r.wamid);
 } catch (e) {
 console.error('HATA: Şablon hatası:', e.message);
 }

 // ───── Dinamik URL Butonlu Şablon (her alıcıya özel link) ─────
 // Şablon panelde, URL butonunun sonu {{1}} olacak şekilde oluşturulur.
 try {
 const r = await vm.sendTemplate(
 phoneNumberId,
 recipient,
 'sepet_kurtarma',
 'tr',
 [
 { type: 'body', parameters: [{ type: 'text', text: 'Ahmet' }] },
 {
 type: 'button',
 sub_type: 'url',
 index: 0,
 parameters: [{ type: 'text', text: 'd32eec6c,5cbd62f6' }],
 },
 ]
 );
 console.log('Dinamik URL butonlu şablon:', r.wamid);
 } catch (e) {
 console.error('HATA: Dinamik URL butonu hatası:', e.message);
 }
})();
