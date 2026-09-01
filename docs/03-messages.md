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

> **`language` alanı esnektir:** Hem Meta'nın nesne formatı `"language": { "code": "tr" }` hem de kısa string formu `"language": "tr"` kabul edilir — ikisi de aynı şekilde çalışır. (Dil kodunu birebir şablonunuzun onaylandığı dille gönderin; örn. `tr`.)

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

## OTP / Doğrulama Kodu Gönderme

Onaylı bir `AUTHENTICATION` şablonu ile OTP göndermek için **en kolay yol**: `template.otp` alanına kodu verin — gövde ve "Kodu Kopyala" butonu Meta kuralına uygun **otomatik** doldurulur:

```json
{
  "phone_number_id": "1234567890",
  "to": "905551112233",
  "template": { "name": "otp_dogrulama", "language": "tr", "otp": "482913" }
}
```

**Alternatif (tam kontrol):** bileşenleri açıkça verin. Gövde parametresi ile `sub_type: "url"` / `index: 0` olan buton parametresi **aynı kodu** taşımalıdır (Meta kuralı):

```json
{
  "phone_number_id": "1234567890",
  "to": "905551112233",
  "template": {
    "name": "otp_dogrulama",
    "language": "tr",
    "components": [
      { "type": "body",   "parameters": [{ "type": "text", "text": "482913" }] },
      { "type": "button", "sub_type": "url", "index": 0, "parameters": [{ "type": "text", "text": "482913" }] }
    ]
  }
}
```

> Kodu siz üretir ve son kullanıcıya siz doğrulatırsınız; VeriMerkezi yalnızca kodu WhatsApp ile iletir. OTP şablonu oluşturma: [04-templates.md](04-templates.md#otp--kimlik-doğrulama-şablonu-authentication).

## Dinamik URL Butonu

Onaylı şablonunuzda **değişken (dinamik) URL butonu** varsa — yani butonun adresi son kısmında `{{1}}` içeriyorsa (örn. `https://site.com/git?id={{1}}`) — o değişkeni **her gönderimde** `button` bileşeniyle doldurabilirsiniz. Böylece her alıcıya **kişiye özel bir link** gider (sepet kurtarma, kişisel takip sayfası, kupon linki vb.).

> **Ön koşul — şablonu panelden oluşturun:** Panel → WhatsApp → Şablonlar → Yeni Şablon → *URL* tipi buton ekleyin, adresin **sonuna** `{{1}}` koyun ve "örnek adres" alanına tam bir örnek girin. Meta onayından sonra API ile gönderebilirsiniz. Ayrıntı: [04-templates.md](04-templates.md#dinamik-url-butonu).

```json
{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "template",
 "template": {
 "name": "sepet_kurtarma",
 "language": { "code": "tr" },
 "components": [
 {
 "type": "body",
 "parameters": [{ "type": "text", "text": "Ahmet" }]
 },
 {
 "type": "button",
 "sub_type": "url",
 "index": 0,
 "parameters": [{ "type": "text", "text": "d32eec6c,5cbd62f6" }]
 }
 ]
 }
}
```

- `type: "button"` + `sub_type: "url"` — dinamik URL butonunu hedefler.
- `index` — butonun sıfır tabanlı sırası (ilk/tek buton için `0`).
- `parameters[0].text` — `{{1}}`'in yerine geçen değer. Yalnızca **adresin sonuna eklenecek** kısım gönderilir; sabit taban şablonda tanımlıdır. Örnek sonuç: `https://taksicialik.com/checkout?code=SEPET5&restore_products=d32eec6c,5cbd62f6`.

> **Kurallar:** Meta gereği bir URL butonunda **tek** değişken (`{{1}}`) olur ve **adresin sonunda** yer alır. Şablonda body değişkenleri de varsa `body` bileşenini de ekleyin. Dinamik URL butonlu şablonlar **yalnızca API ile** gönderilir (panel toplu kampanya ekranından değil).

## Medya Mesajları

`POST /wa/messages` ile **şablonsuz (free-form)** medya gönderebilirsiniz: görsel, video, ses ve doküman. Bu mesajlar serbest biçimlidir ve **yalnızca 24 saatlik müşteri hizmet penceresi (service window) içinde** teslim edilir — pencere kapalıyken Meta **131047** hatası döner; bu durumda onaylı bir **şablon** kullanın. Her başarılı gönderim **1 kredi** tüketir.

### Örnek (video, link ile)

```bash
curl -X POST https://api.verimerkezi.app/wa/messages \
 -H "Authorization: Bearer vmk_live_..." \
 -H "Content-Type: application/json" \
 -d '{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "video",
 "video": {
 "link": "https://cdn.firmaniz.com/demo.mp4",
 "caption": "Ürün tanıtım videosu"
 }
 }'
```

### Medya nesnesi alanları

- `type` ∈ `image` · `video` · `audio` · `document`
- Medya nesnesi (`image` / `video` / `audio` / `document`) içinde kaynak **ya** `link` (herkese açık `https://` URL) **ya da** `id` (önceden yüklenmiş Meta media id) bulunur — biri zorunludur.
- `caption` — yalnızca `image`, `video` ve `document` için geçerlidir (görünen açıklama metni).
- `filename` — yalnızca `document` için; alıcıda görünen dosya adı.
- `audio` — ne `caption` ne `filename` alır (yalnızca `link`/`id`).

### Meta boyut ve format limitleri

| Tip | Maks. boyut | Format |
|---|---|---|
| `image` | 5 MB | JPEG, PNG |
| `video` | 16 MB | MP4, 3GPP |
| `audio` | 16 MB | AAC, MP4, MPEG, AMR, OGG |
| `document` | 100 MB | PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX |

> 201 yanıtı diğer mesaj tipleriyle **aynı düz (flat) yapıdadır**; `type` alanı gönderilen medya tipini (`image`/`video`/`audio`/`document`) taşır.

## Okundu + Yazıyor (typing)

Gelen bir mesajı **okundu** olarak işaretlemek (mavi tik) ve isteğe bağlı olarak "yazıyor…" göstergesi yaymak için `POST /wa/messages/read` kullanın. Bu uç nokta **kredi tüketmez**.

```bash
curl -X POST https://api.verimerkezi.app/wa/messages/read \
 -H "Authorization: Bearer vmk_live_..." \
 -H "Content-Type: application/json" \
 -d '{
 "phone_number_id": "1234567890",
 "message_id": "wamid.HBgL...",
 "typing": true
 }'
```

- `message_id` — okundu işaretlenecek **gelen** mesajın `wamid`'i (webhook ile aldığınız mesaj id'si).
- `typing: true` — alıcıda ~25 saniye süren bir **"yazıyor…"** göstergesi gösterir. Bot'unuz cevabı göndermeden hemen önce çağırın; insan hissi verir.

### Yanıt

```json
{
 "ok": true,
 "marked_read": true,
 "typing": true
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
 "field": "to"
 }
}
```

> `field` opsiyoneldir — yalnızca hata belirli bir girdi alanına bağlıysa döner. Hata zarfı `code`, `message` ve opsiyonel `field` dışında alan içermez.

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
