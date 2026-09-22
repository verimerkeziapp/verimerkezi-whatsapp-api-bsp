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
| `sendOtp(phoneId, to, templateName, code, lang?)` | `Promise<MessageResponse>` |
| `sendImage(phoneId, to, link, caption?)` | `Promise<MessageResponse>` |
| `sendVideo(phoneId, to, link, caption?)` | `Promise<MessageResponse>` |
| `sendAudio(phoneId, to, link)` | `Promise<MessageResponse>` |
| `sendDocument(phoneId, to, link, filename?, caption?)` | `Promise<MessageResponse>` |
| `markRead(phoneId, messageId, typing?)` | `Promise<MessageResponse>` |
| `listContacts({ cursor?, limit?, search? })` | `Promise<ContactList>` |
| `createContact(phone, name, extra?)` | `Promise<Contact>` |
| `bulkContacts(contacts, skipDuplicates?)` | `Promise<BulkResult>` |
| `listTemplates(filters?)` | `Promise<TemplateListResponse>` |
| `getProfile(phoneId)` | `Promise<Profile>` |
| `updateProfile(phoneId, fields)` | `Promise<Profile>` |
| `reportsSummary(period?)` | `Promise<ReportSummary>` |
| `listMedia({ source?, kind?, cursor?, limit? })` | `Promise<MediaList>` |
| `mediaInfo(mediaId)` | `Promise<MediaInfo>` |
| `downloadMedia(mediaId, writableStream?)` | `Promise<Buffer \| Writable>` |
| `createTemplate(data)` | `Promise<Template>` |
| `validateTemplate(data)` | `Promise<ValidationResult>` |
| `getTemplate(id)` | `Promise<Template>` |
| `updateTemplate(id, components, opts?)` | `Promise<Template>` |
| `deleteTemplate(id)` | `Promise<DeleteResult>` |
| `createWebhook(url, events?, description?)` | `Promise<Webhook>` |
| `listWebhooks()` | `Promise<WebhookList>` |
| `updateWebhook(id, fields)` | `Promise<Webhook>` |
| `deleteWebhook(id)` | `Promise<DeleteResult>` |
| `testWebhook(id)` | `Promise<TestResult>` |

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

> Webhook abonelikleri artık hem panelden hem de SDK ile (v1.9.0) yönetilebilir —
> aşağıdaki **Webhook Yönetimi** bölümüne bakın. Gelen olayların imzasını doğrulamak için
> `VeriMerkeziClient.verifyWebhookSignature(secret, body, signature, timestamp)`
> statik metodunu ve `examples/nodejs/webhook-receiver.js` örneğini kullanın.

## Gelen Medyayı İndirme

Webhook'taki `data.media.media_id` ile dosyayı indirin (anahtarda `messages:read` ya da Tam Yetki gerekir):

```js
const fs = require('fs');

const buf = await vm.downloadMedia(13109);                               // küçük dosya → Buffer
await vm.downloadMedia(13109, fs.createWriteStream('gelen.jpeg'));      // büyük dosya → akış
const info = await vm.mediaInfo(13109);                                  // boyut, tür, sha256
const liste = await vm.listMedia({ source: 'inbound', limit: 50 });
```

Ayrıntılar: [docs/10-media.md](../../docs/10-media.md)

## Şablon Yönetimi

Şablonları listeleyin, oluşturun, doğrulayın, güncelleyin veya silin (anahtarda
`templates:read` / `templates:write` yetkisi gerekir). Yeni şablon Meta'ya gönderilir ve
durumu `PENDING` olur; onay/ret sonucu `template.approved` / `template.rejected` webhook'u
ile bildirilir. Her istekte `waba_id` **veya** `phone_number_id` gerekir.

```js
// Filtreli listeleme — tüm filtreler opsiyonel, argümansız çağrı tüm şablonları döner
const { templates } = await vm.listTemplates({ status: 'APPROVED', category: 'UTILITY', limit: 20 });

// Meta'ya GÖNDERMEDEN doğrula (kredi/gönderim yok)
await vm.validateTemplate({
  phone_number_id: '1275179085670729',
  name: 'police_yenileme',
  language: 'tr',
  category: 'UTILITY',
  components: [
    { type: 'BODY', text: 'Sayın {{1}}, poliçeniz yenilenmelidir.', example: { body_text: [['Ahmet']] } },
  ],
});

// Yeni şablon oluştur → durum PENDING
const tpl = await vm.createTemplate({
  waba_id: '1029384756',
  name: 'police_yenileme',
  language: 'tr',
  category: 'UTILITY',
  components: [
    { type: 'BODY', text: 'Sayın {{1}}, poliçeniz yenilenmelidir.', example: { body_text: [['Ahmet']] } },
    { type: 'FOOTER', text: 'Mim Gökmen Sigorta' },
  ],
});

const detay = await vm.getTemplate(tpl.id);                                 // tek şablon + components
await vm.updateTemplate(tpl.id, detay.components, { category: 'UTILITY' }); // düzenle → tekrar PENDING (opts.category opsiyonel)
await vm.deleteTemplate(tpl.id);                                            // sil
```

## Webhook Yönetimi

Webhook aboneliklerini SDK ile yönetin (anahtarda `webhooks:read` / `webhooks:write`
yetkisi gerekir). **`secret` yalnızca `createWebhook` yanıtında bir kez döner** — güvenli
bir yerde saklayın; imza doğrulaması (`verifyWebhookSignature`) bu değeri kullanır.

```js
// Abonelik oluştur — events verilmezse ['*'] kullanılır
const hook = await vm.createWebhook(
  'https://ornek.com/wa-webhook',
  ['message.received', 'template.approved', 'credit.low'],
  "Üretim webhook'u"
);
console.log(hook.secret); // whsec_... — SADECE burada döner, saklayın

const { webhooks } = await vm.listWebhooks();          // secret DÖNMEZ
await vm.updateWebhook(hook.id, { active: false });    // url / events / active / description
await vm.testWebhook(hook.id);                         // anında test.ping teslimatı dener
await vm.deleteWebhook(hook.id);
```

> `*` (joker) joker-**dışı** yeni olayları kapsamaz (`message.revoked`, `message.edited`,
> `message.history`, `message.sent`, `number.status_changed`, `credit.low`,
> `credit.exhausted`) — bunları almak için olay listesine açıkça ekleyin.

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
