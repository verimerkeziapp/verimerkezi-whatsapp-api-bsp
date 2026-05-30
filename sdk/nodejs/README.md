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

console.log('wamid:', response.messages[0].id);
```

## API

| Metot | İmza |
|---|---|
| `sendText(phoneId, to, body)` | `Promise<MessageResponse>` |
| `sendImage(phoneId, to, url, caption?)` | `Promise<MessageResponse>` |
| `sendDocument(phoneId, to, url, filename, caption?)` | `Promise<MessageResponse>` |
| `sendVideo(phoneId, to, url, caption?)` | `Promise<MessageResponse>` |
| `sendTemplate(phoneId, to, name, lang, components?)` | `Promise<MessageResponse>` |
| `sendLocation(phoneId, to, lat, lng, name?, address?)` | `Promise<MessageResponse>` |
| `sendReaction(phoneId, to, messageId, emoji)` | `Promise<MessageResponse>` |
| `getConversation(phone, cursor?)` | `Promise<ConversationResponse>` |
| `createTemplate(payload)` | `Promise<TemplateResponse>` |
| `listTemplates()` | `Promise<TemplateListResponse>` |
| `me()` | `Promise<AccountInfo>` |

## Hata Yönetimi

```js
try {
 await vm.sendText('...', '...', '...');
} catch (err) {
 console.error('Hata:', err.message);
 console.error('HTTP:', err.statusCode);
 console.error('Meta code:', err.metaCode);
 console.error('Request ID:', err.requestId);
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
