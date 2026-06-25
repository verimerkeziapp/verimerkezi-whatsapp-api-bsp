# Veri Merkezi WhatsApp SDK — Node.js

[![npm](https://img.shields.io/badge/npm-%40verimerkezi%2Fwhatsapp--sdk-red)](https://www.npmjs.com/package/@verimerkezi/whatsapp-sdk)

## Kurulum

```bash
npm install @verimerkezi/whatsapp-sdk
# veya
yarn add @verimerkezi/whatsapp-sdk
```

## Hızlı Başlangıç

### CommonJS
```js
const { VeriMerkeziClient } = require('@verimerkezi/whatsapp-sdk');

const vm = new VeriMerkeziClient('vmk_live_xxxxxxxxxxxxxxxx');

await vm.sendText('1234567890', '905551234567', 'Merhaba!');
```

### ESM / TypeScript
```ts
import { VeriMerkeziClient } from '@verimerkezi/whatsapp-sdk';

const vm = new VeriMerkeziClient('vmk_live_xxxxxxxxxxxxxxxx');

const response = await vm.sendTemplate(
 '1234567890',
 '905551234567',
 'siparis_onayi',
 'tr',
 [
 { type: 'body', parameters: [{ type: 'text', text: 'Ahmet' }] },
 ]
);

console.log('wamid:', response.wamid);
```

## API

| Metot | İmza |
|---|---|
| `me()` | `Promise<AccountInfo>` |
| `numbers()` | `Promise<NumberList>` |
| `sendText(phoneId, to, body)` | `Promise<MessageResponse>` |
| `sendTemplate(phoneId, to, name, lang, components?)` | `Promise<MessageResponse>` |
| `sendImage(phoneId, to, link, caption?)` | `Promise<MessageResponse>` |
| `sendVideo(phoneId, to, link, caption?)` | `Promise<MessageResponse>` |
| `sendAudio(phoneId, to, link)` | `Promise<MessageResponse>` |
| `sendDocument(phoneId, to, link, filename?, caption?)` | `Promise<MessageResponse>` |
| `markRead(phoneId, messageId, typing?)` | `Promise<MessageResponse>` |
| `listContacts({ cursor?, limit?, search? })` | `Promise<ContactList>` |
| `createContact(phone, name, extra?)` | `Promise<Contact>` |
| `bulkContacts(contacts, skipDuplicates?)` | `Promise<BulkResult>` |
| `listTemplates()` | `Promise<TemplateListResponse>` |
| `getProfile(phoneId)` | `Promise<Profile>` |
| `updateProfile(phoneId, fields)` | `Promise<Profile>` |
| `reportsSummary(period?)` | `Promise<ReportSummary>` |

`POST /messages` düz (flat) bir yanıt döner — `messages[]` dizisi **yoktur**:

```js
const r = await vm.sendText('1234567890', '905551234567', 'Merhaba!');
console.log(r.wamid, r.status, r.credits_used, r.balance);
// { ok, id, wamid, to, type, status, mode, simulated, credits_used, balance }
```

## Medya Gönderme

Medya **link tabanlıdır** — public bir `https` URL gerekir (image ≤5MB jpeg/png, video ≤16MB
mp4, audio ≤16MB, document ≤100MB). Serbest medya yalnızca **24 saatlik müşteri hizmet
penceresi** içinde gönderilebilir; pencere kapalıysa Meta `131047` döner ve onaylı bir şablon
kullanmanız gerekir. Her medya mesajı **1 kredi**dir.

```js
await vm.sendVideo(
  '1234567890',
  '905551234567',
  'https://verimerkezi.app/uploads/tanitim.mp4',
  'Yeni ürünümüzü izleyin 🎬' // caption opsiyonel
);

// Diğerleri:
// await vm.sendImage(phoneId, to, 'https://.../afis.jpg', 'Kampanya');
// await vm.sendAudio(phoneId, to, 'https://.../ses.mp3');           // caption yok
// await vm.sendDocument(phoneId, to, 'https://.../katalog.pdf', 'katalog.pdf', 'Fiyat listesi');
```

## Okundu Bilgisi + Yazıyor Göstergesi

Gelen bir mesajı okundu işaretler (mavi tik). `typing: true` ile ~25 saniye boyunca müşteriye
"yazıyor…" göstergesi gösterilir. **Kredi harcamaz.**

```js
// Gelen mesajın id'sini okundu işaretle ve "yazıyor…" göster
await vm.markRead('1234567890', 'wamid.HBgM...', true);
```

> Webhook'lar SDK ile değil, panel üzerinden yapılandırılır:
> https://verimerkezi.app/panel/wa — Gelen olayların imzasını doğrulamak için
> `VeriMerkeziClient.verifyWebhookSignature(secret, body, signature, timestamp)`
> statik metodunu ve `examples/nodejs/webhook-receiver.js` örneğini kullanın.

## Hata Yönetimi

```js
try {
 await vm.sendText('...', '...', '...');
} catch (err) {
 console.error('Hata:', err.message);
 console.error('HTTP:', err.statusCode);
 console.error('Hata kodu:', err.errorCode);
 console.error('Detay:', err.errorData);
}
```

## Yapılandırma

```js
const vm = new VeriMerkeziClient('vmk_live_...', {
 baseUrl: 'https://api.verimerkezi.app/wa', // varsayılan
 timeout: 30000, // ms
 maxRetries: 3,
});
```

## Gereksinimler

- Node.js 18+

## Lisans

MIT
