# 03 · Mesaj Gönderme

Tüm mesaj gönderim endpoint'i tektir: `POST /wa/messages`. Type alanına göre payload değişir.

## Endpoint

```
POST https://api.verimerkezi.app/wa/messages
Authorization: Bearer vmk_live_...
Content-Type: application/json
Idempotency-Key: <uuid> (opsiyonel ama önerilir)
```

## Ortak Alanlar

| Alan | Tip | Açıklama |
|---|---|---|
| `phone_number_id` | string | Hangi WhatsApp numaranızdan gönderileceği |
| `to` | string | Alıcı E.164 formatında (örn. `905551234567`, başında + olmaz) |
| `type` | string | `text`, `image`, `document`, `video`, `audio`, `sticker`, `location`, `contacts`, `template`, `reaction` |

## Mesaj Tipleri

### 1) Düz Metin

> DIKKAT: Yalnızca **24 saat service window** içinde çalışır. Müşteri son 24 saatte mesaj atmadıysa şablon kullanın.

```json
{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "text",
 "text": {
 "body": "Merhaba! Size nasıl yardımcı olabilirim?",
 "preview_url": false
 }
}
```

### 2) Görsel

```json
{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "image",
 "image": {
 "link": "https://cdn.firmaniz.com/urun.jpg",
 "caption": "Yeni ürünümüz!"
 }
}
```

### 3) PDF / Doküman

```json
{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "document",
 "document": {
 "link": "https://cdn.firmaniz.com/fatura-2026-05.pdf",
 "filename": "fatura-2026-05.pdf",
 "caption": "Mayıs ayı faturanız ektedir."
 }
}
```

### 4) Video

```json
{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "video",
 "video": {
 "link": "https://cdn.firmaniz.com/demo.mp4",
 "caption": "Ürün tanıtım videosu"
 }
}
```

### 5) Şablon (24h dışında zorunlu)

```json
{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "template",
 "template": {
 "name": "siparis_onayi",
 "language": { "code": "tr" },
 "components": [
 {
 "type": "body",
 "parameters": [
 { "type": "text", "text": "Ahmet" },
 { "type": "text", "text": "VM-2026-1234" }
 ]
 }
 ]
 }
}
```

### 6) Header Medyalı Şablon (PDF, görsel, video)

```json
{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "template",
 "template": {
 "name": "fatura_bildirimi",
 "language": { "code": "tr" },
 "components": [
 {
 "type": "header",
 "parameters": [{
 "type": "document",
 "document": {
 "link": "https://cdn.firmaniz.com/fatura.pdf",
 "filename": "fatura-mayis.pdf"
 }
 }]
 },
 {
 "type": "body",
 "parameters": [
 { "type": "text", "text": "Ahmet" },
 { "type": "text", "text": "₺1.250,00" }
 ]
 }
 ]
 }
}
```

### 7) Konum

```json
{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "location",
 "location": {
 "latitude": 37.871865,
 "longitude": 32.484603,
 "name": "Veri Merkezi Ofis",
 "address": "Çankaya / Ankara"
 }
}
```

### 8) Reaction (Emoji tepki)

```json
{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "reaction",
 "reaction": {
 "message_id": "wamid.HBgL...",
 "emoji": ""
 }
}
```

### 9) Sticker

```json
{
 "type": "sticker",
 "sticker": { "link": "https://cdn.firmaniz.com/logo.webp" }
}
```

## Başarılı Yanıt

```json
{
 "ok": true,
 "messaging_product": "whatsapp",
 "contacts": [{ "input": "905551112233", "wa_id": "905551112233" }],
 "messages": [{ "id": "wamid.HBgL...", "message_status": "accepted" }]
}
```

## Hata Yanıtı

```json
{
 "ok": false,
 "error": {
 "code": "invalid_recipient",
 "message": "Alıcı numarası WhatsApp'ta kayıtlı değil.",
 "meta_code": 131021
 }
}
```

Tüm hata kodları için [09-errors.md](09-errors.md) bölümüne bakın.

## SDK ile Aynı Örnek

### PHP
```php
$vm = new VeriMerkeziClient('vmk_live_...');
$vm->sendText('1234567890', '905551112233', 'Merhaba!');
$vm->sendTemplate('1234567890', '905551112233', 'siparis_onayi', 'tr', [
 ['type' => 'body', 'parameters' => [['type' => 'text', 'text' => 'Ahmet']]]
]);
```

### Node.js
```js
const vm = new VeriMerkeziClient('vmk_live_...');
await vm.sendText('1234567890', '905551112233', 'Merhaba!');
```

### Python
```python
vm = VeriMerkeziClient('vmk_live_...')
vm.send_text('1234567890', '905551112233', 'Merhaba!')
```
