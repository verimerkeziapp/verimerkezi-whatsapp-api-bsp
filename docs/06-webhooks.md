# 06 · Webhook Sistemi

Veri Merkezi, WhatsApp tarafında olan **her olayı** sizin sunucunuza otomatik bildirir. Bu sayede gelen mesajları gerçek zamanlı işleyebilir, chatbot'lar veya CRM entegrasyonları kurabilirsiniz.

## Mimari

```
[Müşteri] -> [WhatsApp] -> [Meta] -> [Veri Merkezi] -> [Sizin Sunucunuz]
 ^ v
 └───── ACK 200 ──────┘
```

Veri Merkezi olayı kuyruğa alır, sunucunuza POST eder ve **HTTP 2xx** yanıtı bekler. Hata durumunda **exponential backoff** ile retry yapar.

> **Teslimat hızı:** Teslimat **olay-anındadır (event-driven)** — mesaj Meta'dan Veri Merkezi'ne ulaştığı anda webhook'unuz tetiklenir; tipik uçtan uca gecikme **~1 saniyedir**. Kuyruk yalnızca başarısız denemelerin retry'ı için kullanılır.

## 1) Webhook Aboneliği Kurma

> **v1.9.0 (2026-09-23):** Webhook abonelikleri artık hem **REST API** hem panelden yönetilir. Böylece yeni müşteri/kiracı açılışında webhook kurulumunu tek seferde otomatikleştirebilirsiniz. İmza şeması (`whsec_`, HMAC-SHA256, zaman damgalı) değişmedi. Gerekli izin: `webhooks:write` (okuma için `webhooks:read`).

### `POST /wa/webhooks` — abonelik oluştur

```bash
curl -X POST https://api.verimerkezi.app/wa/webhooks \
 -H "Authorization: Bearer vmk_live_..." -H "Content-Type: application/json" \
 -d '{
   "url": "https://api.firmaniz.com/wa-webhook",
   "events": ["message.received", "message.status.delivered", "template.approved"],
   "description": "Production Bot"
 }'
```

Yanıt (`201 Created`):

```json
{
  "id": 17,
  "url": "https://api.firmaniz.com/wa-webhook",
  "events": ["message.received", "message.status.delivered", "template.approved"],
  "active": true,
  "secret": "whsec_9f3a...c21e",
  "secret_prefix": "whsec_9f3a"
}
```

> DIKKAT: `secret` **yalnızca oluşturma yanıtında bir kez** döner — güvenli saklayın. Sonraki listeleme/güncelleme çağrılarında yalnızca `secret_prefix` görünür. Kaybederseniz webhook'u silip yenisini oluşturun.
>
> URL **https** olmalı ve **genel erişime açık** bir adrese çözülmelidir (iç ağ / özel IP adresleri reddedilir — SSRF koruması).
>
> `events` boş bırakılırsa `["*"]` (tüm klasik olaylar) atanır. `*` seçtiğinizde, joker kapsamı dışındaki yeni olaylar için yanıtta bir `note` uyarısı döner (bkz. bölüm 2).

### `GET /wa/webhooks` — abonelikleri listele

```bash
curl https://api.verimerkezi.app/wa/webhooks -H "Authorization: Bearer vmk_live_..."
```
```json
{ "webhooks": [
  { "id": 17, "name": "Production Bot", "url": "https://api.firmaniz.com/wa-webhook",
    "events": ["message.received"], "active": true, "secret_prefix": "whsec_9f3a",
    "last_success_at": "2026-09-23T01:00:00+03:00", "last_failure_at": null,
    "failure_count": 0, "created_at": "2026-09-22T12:00:00+03:00" } ] }
```

### `PATCH /wa/webhooks/{id}` — güncelle

`url`, `events`, `active` (pasifleştir/aktifleştir) ve `description` alanlarından en az biri gönderilir.

```bash
curl -X PATCH https://api.verimerkezi.app/wa/webhooks/17 \
 -H "Authorization: Bearer vmk_live_..." -H "Content-Type: application/json" \
 -d '{ "events": ["message.received", "message.status.failed"], "active": true }'
```

### `DELETE /wa/webhooks/{id}` — sil

```bash
curl -X DELETE https://api.verimerkezi.app/wa/webhooks/17 -H "Authorization: Bearer vmk_live_..."
```
```json
{ "ok": true, "deleted": true, "id": 17 }
```

### `POST /wa/webhooks/{id}/test` — test bildirimi

Aboneliğinize anında bir `test.ping` olayı gönderir (imzalı). Yanıt teslimatın sonucunu içerir:

```json
{ "ok": true, "result": "delivered" }
```

### Alternatif: panelden
Panel -> **API -> Webhooks -> "Yeni Webhook"**: Ad, URL, event'ler (veya tümü için `*`) girip **Oluştur** — secret ekranda bir kez gösterilir.

## 2) Event Tipleri

| Event | Açıklama |
|---|---|
| `message.received` | Müşteriden yeni mesaj geldi (chatbot için en kritik) |
| `message.echo` | **CoExistence**: işletme WhatsApp uygulamasından telefon üzerinden mesaj yazdığında — `data.from` işletme numarası, `data.to` müşteri |
| `message.status.sent` | Meta gönderimi kabul etti |
| `message.status.delivered` | Alıcının cihazına teslim edildi |
| `message.status.read` | Alıcı mesajı okudu (mavi tik) |
| `message.status.failed` | Gönderim başarısız (sebep payload'da) |
| `template.approved` | Şablonunuz Meta tarafından onaylandı |
| `template.rejected` | Şablon reddedildi (sebep payload'da) |
| `template.flagged` | Şablon işaretlendi (örn. çok şikayet) |
| `template.paused` | Şablon geçici durduruldu |
| `quality.changed` | Numaranızın kalite puanı değişti (GREEN/YELLOW/RED) |
| `account.alert` | Hesap düzeyinde önemli uyarı |
| `message.revoked` ⁿ | Müşteri ya da personel bir mesajı sildi |
| `message.edited` ⁿ | Müşteri ya da personel bir mesajı düzenledi |
| `message.sent` ⁿ | API dışı giden mesaj (panel / otomasyon / kampanya / opt-out) — `data.source` kaynağı belirtir |
| `message.history` ⁿ | Coexistence geçmiş aktarımı mesajı (bkz. [11-gelismis.md](11-gelismis.md)) |
| `number.status_changed` ⁿ | Numara bağlandı / koptu / işaretlendi / kısıtlandı |
| `credit.low` ⁿ | Mesaj kredisi bakiyesi eşiğin altına düştü (eşik hesap ayarından — varsayılan panelde tanımlı) |
| `credit.exhausted` ⁿ | Mesaj kredisi tükendi — gönderim engellendi |
| `*` | Tüm event'ler (yalnızca yukarıdaki **ⁿ işaretsiz** klasik olayları kapsar) |

> **ⁿ = yeni olay (22–23 Eylül 2026).** Bu olaylar `*` aboneliğine **dahil DEĞİLDİR** — mevcut `*` aboneleri beklemedikleri trafik almaz. Yeni bir olayı almak için abonelik oluştururken/güncellerken listeye **açıkça ekleyin** (API'de `events` dizisine, panelde işaret kutusuyla). `*` seçtiğinizde `POST /wa/webhooks` yanıtındaki `note` alanı, joker kapsamı dışında kalan bu olayları size hatırlatır.

### `message.echo` payload örneği

```json
{
  "event": "message.echo",
  "event_id": "019eb6fa-1030-7685-95eb-0f165953746b",
  "event_type": "message.echo",
  "occurred_at": "2026-06-11T16:58:22+03:00",
  "created_at": "2026-06-11 16:58:22",
  "data": {
    "wamid": "wamid.HBgM...",
    "from": "908503092016",
    "to": "905326060924",
    "type": "text",
    "text": "Teşekkürler, en kısa sürede dönüyorum.",
    "timestamp": "1781186302",
    "source": "coexistence_app",
    "phone_number_id": "314055571788368"
  }
}
```

> `event_type` ve `created_at`, `event` ve `occurred_at`'in eşanlamlılarıdır (geriye dönük uyumluluk için her ikisi de gönderilir).

> CoExistence Mode'da kullanıcı WhatsApp Business uygulamasından telefon üzerinden müşteriye yanıt yazınca Meta size echo gönderir. Bu sayede chatbot tarafınız hangi müşteriye işletmenin manuel cevap verdiğini görür, çift cevabı engelleyebilir.

#### Ön koşullar
- Numaranızın **CoExistence Mode**'da olması gerekir (Meta tarafında platform_type kontrolü ile doğrulanabilir).
- Meta tarafında `smb_message_echoes` webhook field'ı WABA aboneliğinizde subscribed olmalı.
- Hem ön koşulu hem aboneliği BSP yetkili tarafımız sizin için otomatik açar — siz panelden webhook'unuzu kurarken `*` (tümü) veya `message.echo` event'ini seçmeniz yeterlidir.

## 3) Webhook Payload Formatı

Veri Merkezi her event için bu JSON'u **POST** eder (`message.received` örneği):

```json
{
 "event": "message.received",
 "event_id": "019e787c-b7e0-74d8-9077-fb9ee8ad83d5",
 "event_type": "message.received",
 "occurred_at": "2026-05-30T13:45:00+03:00",
 "created_at": "2026-05-30 13:45:00",
 "data": {
 "wamid": "wamid.HBgL...",
 "from": "905551112233",
 "user_id": null,
 "username": null,
 "name": "Ayşe Müşteri",
 "type": "text",
 "text": "Merhaba, sipariş durumunu öğrenebilir miyim?",
 "media": null,
 "timestamp": "1780137900",
 "phone_number_id": "1234567890",
 "contact": {
 "wa_id": "905551112233",
 "user_id": null,
 "username": null,
 "profile_name": "Ayşe Müşteri"
 }
 }
}
```

> **Not:** `data.text` düz **string**'dir (Meta'daki gibi `{ "body": ... }` nesnesi değil). Medya mesajlarında açıklama (caption) buraya gelir; açıklama yoksa boş string'dir. Dosyanın kendisi `data.media` alanıyla gelir (aşağıya bakın).

### Zarf alanları

| Alan | Açıklama |
|---|---|
| `event` | Olay adı (ör. `message.received`) |
| `event_id` | Olayın benzersiz kimliği (UUIDv7, zaman sıralı). Tekrar denemelerde aynı kalır; `X-VeriMerkezi-Event-Id` header'ı ile aynıdır — idempotency için bunu saklayın |
| `event_type` | `event` ile aynı (geriye dönük uyumluluk) |
| `occurred_at` | Olay zamanı, ISO 8601 (`+03:00`) |
| `created_at` | Aynı zaman, `YYYY-MM-DD HH:MM:SS` biçiminde (geriye dönük uyumluluk) |
| `data` | Olaya özgü içerik — aşağıdaki tablolara bakın |

### `message.received` — `data` alanları

| Alan | Açıklama |
|---|---|
| `wamid` | WhatsApp mesaj kimliği |
| `from` | Gönderenin telefonu (E.164, `+` olmadan). Telefonu gizli kullanıcılarda `null` |
| `user_id` | WhatsApp kullanıcı kimliği (BSUID). `from` `null` ise gönderen kimliği budur |
| `username` | WhatsApp kullanıcı adı (varsa) |
| `name` | Kişinin WhatsApp profil adı |
| `type` | `text` · `image` · `video` · `audio` · `document` · `sticker` · `button` · `interactive` … |
| `text` | Mesaj metni; medyada açıklama (caption), açıklama yoksa boş |
| `media` | Medyalı mesajlarda dolu, diğerlerinde `null` — aşağıya bakın |
| `timestamp` | Meta'nın mesaj zamanı (Unix saniye, string) |
| `phone_number_id` | Mesajın geldiği numaranızın Meta kimliği |
| `contact` | `wa_id`, `user_id`, `username`, `profile_name` |
| `context` | Alıntılı cevapta dolu: `{ message_id, from, forwarded, frequently_forwarded }`; yoksa `null` |
| `reaction` | Tepki mesajında (`type: reaction`): `{ message_id, emoji }`; tepki kaldırıldıysa `emoji` boş string |
| `location` | Konum mesajında: `{ latitude, longitude, name, address, url }`; yoksa `null` |
| `contacts` | Kişi kartı paylaşıldıysa Meta'nın kişi dizisi; yoksa `null` |
| `original_message_id` | `revoke` / `edit` türünde hedef mesajın `wamid`'i; diğerlerinde `null` |

### Medyalı mesaj

Görsel, video, ses, belge veya çıkartma geldiğinde `data.media.media_id` dolu gelir. Dosyayı `GET /wa/media/{media_id}` ile indirin — ayrıntılar: [10-media.md](10-media.md).

```json
{
  "event": "message.received",
  "event_id": "01a0c7ee-d040-7730-8111-65b0c70acc26",
  "event_type": "message.received",
  "occurred_at": "2026-09-22T10:05:12+03:00",
  "created_at": "2026-09-22 10:05:12",
  "data": {
    "wamid": "wamid.HBgM...",
    "from": "905551112233",
    "user_id": null,
    "username": null,
    "name": "Ayşe Müşteri",
    "type": "image",
    "text": "Poliçe fotoğrafı",
    "media": {
      "media_id": 13109,
      "path": "wa-media/inbound/2026/09/kgI9iKVlvNw3yFpXrzNVL8w2T023kEaznP3z5NHD.jpeg"
    },
    "timestamp": "1790060712",
    "phone_number_id": "1234567890",
    "contact": { "wa_id": "905551112233", "user_id": null, "username": null, "profile_name": "Ayşe Müşteri" }
  }
}
```

- `media.media_id` — indirmede kullanacağınız kimlik.
- `media.path` — depoya ait iç yol; **doğrudan istenemez**, yalnızca bilgi amaçlıdır.
- Nadiren dosya Meta'dan alınamazsa `media` şu şekilde gelir; bu durumda indirilebilir dosya yoktur:

```json
"media": { "error": "media_download_failed", "meta_media_id": "1075907555339682" }
```

### Diğer olayların `data` alanları

| Olay | `data` alanları |
|---|---|
| `message.echo` | `wamid`, `from` (işletme), `to` (müşteri), `user_id` (müşteri BSUID), `type`, `text`, `media` (medya indirildiyse), `timestamp`, `source` (`coexistence_app`), `phone_number_id` + `context`/`reaction`/`location`/`contacts` |
| `message.revoked` · `message.edited` | `wamid`, `original_message_id`, `direction` (`inbound`/`echo`), `revoked_by`/`edited_by` (`customer`/`business`), `from`, `user_id`, `phone_number_id`, `timestamp`; `edited` ayrıca `type` + `text` |
| `message.sent` | `wamid`, `source` (`vm_panel`/`automation`/`campaign`/`opt_out`/`system`), `from`, `to`, `user_id`, `type`, `text`, `media`, `template_name`, `campaign_id`, `phone_number_id`, `timestamp` |
| `number.status_changed` | `phone_number_id`, `display_phone_number`, `status` (`connected`/`disconnected`/`flagged`/`restricted`/`pending`), `event`, `reason`, `initiated_by`, `occurred_at` |
| `message.history` | Normal mesaj alanları + `history: true`, `thread_id`, `phase`, `chunk_order`, `progress` ([11-gelismis.md](11-gelismis.md)) |
| `message.status.sent` · `.delivered` · `.read` · `.failed` | `wamid`, `recipient` (alıcının telefonu), `timestamp`, `errors` |
| `template.approved` · `.rejected` · `.flagged` · `.paused` | `template_id` (bizdeki kimlik — `GET /wa/templates/{id}` için), `meta_template_id`, `name`, `template_name` (eşanlamlı), `language`, `category`, `waba_id`, `status`, `reason` (Meta'nın bildirdiği ret sebebi; onayda `null`) |
| `credit.low` | `balance` (kalan mesaj kredisi), `threshold` (uyarı eşiği), `unit` (`messages`), `occurred_at` |
| `credit.exhausted` | `balance` (`0`), `unit` (`messages`), `occurred_at` |
| `quality.changed` | `phone` (numaranız), `quality` (`GREEN` / `YELLOW` / `RED`) |
| `account.alert` | `field` (`account_update` / `account_alerts`), `event` (Meta olay adı, ör. `DISABLED_UPDATE`, `PARTNER_REMOVED`) |

`errors` başarılı durumlarda `null`, `message.status.failed`'da Meta'nın hata listesidir:

```json
"errors": [{
  "code": 131047,
  "title": "Re-engagement message",
  "message": "Re-engagement message",
  "error_data": { "details": "Message failed to send because more than 24 hours have passed since the customer last replied to this number." },
  "href": "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/"
}]
```

### `template.rejected` payload örneği

```json
{
  "event": "template.rejected",
  "event_id": "01a0c8f1-2b40-7a10-9c02-77aa10bce231",
  "event_type": "template.rejected",
  "occurred_at": "2026-09-23T09:05:41+03:00",
  "created_at": "2026-09-23 09:05:41",
  "data": {
    "template_id": 512,
    "meta_template_id": "1249033812345678",
    "name": "police_yenileme_hatirlatma",
    "template_name": "police_yenileme_hatirlatma",
    "language": "tr",
    "category": "UTILITY",
    "waba_id": "1029384756",
    "status": "REJECTED",
    "reason": "INVALID_FORMAT"
  }
}
```

### `credit.low` payload örneği

```json
{
  "event": "credit.low",
  "event_id": "01a0c900-3c40-7bb0-8f11-90bd10ace512",
  "event_type": "credit.low",
  "occurred_at": "2026-09-23T10:30:00+03:00",
  "created_at": "2026-09-23 10:30:00",
  "data": { "balance": 42, "threshold": 100, "unit": "messages", "occurred_at": "2026-09-23T10:30:00+03:00" }
}
```

> `credit.low` / `credit.exhausted`, kampanya ortasında bakiye tükenmesini önceden görebilmeniz içindir. Uyarı eşiği hesap ayarınızda tanımlıdır. Aynı düşük-bakiye durumu için tekrar tekrar gönderilmez (24 saatte bir; bakiye yükleyince sıfırlanır).

## 4) Header'lar (Doğrulama için)

```
Content-Type: application/json
X-VeriMerkezi-Signature-256: sha256=abc123...
X-VeriMerkezi-Timestamp: 1717068300
X-VeriMerkezi-Event-Id: 019e787c-b7e0-74d8-9077-fb9ee8ad83d5
X-VeriMerkezi-Event-Type: message.received
X-VeriMerkezi-Delivery-Attempt: 1
User-Agent: VeriMerkezi-Webhook/1.0
```

## 5) HMAC İmza Doğrulama (KRİTİK)

Webhook'unuzu **mutlaka** imza doğrulaması yapmalısınız — yoksa biri sahte event gönderebilir.

### Formül
```
expected = "sha256=" + hash_hmac("sha256", timestamp + "." + raw_body, your_whsec_secret)
```

### PHP örneği

```php
<?php
$secret = getenv('VM_WEBHOOK_SECRET'); // whsec_xxx
$signature = $_SERVER['HTTP_X_VERIMERKEZI_SIGNATURE_256'] ?? '';
$timestamp = $_SERVER['HTTP_X_VERIMERKEZI_TIMESTAMP'] ?? '';
$rawBody = file_get_contents('php://input');

// Replay koruması — 5 dakikadan eski payload reddedilsin
if (abs(time() - (int)$timestamp) > 300) {
 http_response_code(403);
 exit('expired');
}

// İmza doğrulama
$expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
if (!hash_equals($expected, $signature)) {
 http_response_code(403);
 exit('invalid_signature');
}

// Event işleme
$event = json_decode($rawBody, true);
switch ($event['event']) {
 case 'message.received':
 // Müşteri mesajı geldi -> AI yanıt üret -> POST /wa/messages ile gönder
 handleIncomingMessage($event['data']);
 break;
 case 'message.status.delivered':
 // CRM'de mesaj durumunu güncelle
 markDelivered($event['data']['wamid']);
 break;
}

// Veri Merkezi 2xx bekliyor — başarılı işlem
http_response_code(200);
echo json_encode(['ok' => true]);
```

### Node.js örneği

```js
const crypto = require('crypto');
const express = require('express');
const app = express();

// raw body lazım (parsing'den önce)
app.use('/wa-webhook', express.raw({ type: 'application/json' }));

app.post('/wa-webhook', (req, res) => {
 const secret = process.env.VM_WEBHOOK_SECRET;
 const signature = req.headers['x-verimerkezi-signature-256'] || '';
 const timestamp = req.headers['x-verimerkezi-timestamp'] || '';
 const rawBody = req.body.toString('utf8');

 // Replay koruması
 if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300) {
 return res.status(403).send('expired');
 }

 // İmza doğrulama
 const expected = 'sha256=' + crypto
 .createHmac('sha256', secret)
 .update(timestamp + '.' + rawBody)
 .digest('hex');

 if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
 return res.status(403).send('invalid_signature');
 }

 const event = JSON.parse(rawBody);
 if (event.event === 'message.received') {
 handleIncomingMessage(event.data);
 }

 res.json({ ok: true });
});
```

### Python örneği

```python
import hmac, hashlib, time, json
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = os.getenv('VM_WEBHOOK_SECRET').encode()

@app.route('/wa-webhook', methods=['POST'])
def webhook():
 signature = request.headers.get('X-VeriMerkezi-Signature-256', '')
 timestamp = request.headers.get('X-VeriMerkezi-Timestamp', '')
 raw_body = request.get_data(as_text=True)

 # Replay koruması
 if abs(time.time() - int(timestamp)) > 300:
 abort(403, 'expired')

 # İmza doğrulama
 expected = 'sha256=' + hmac.new(
 SECRET,
 f"{timestamp}.{raw_body}".encode(),
 hashlib.sha256
 ).hexdigest()

 if not hmac.compare_digest(expected, signature):
 abort(403, 'invalid_signature')

 event = json.loads(raw_body)
 if event['event'] == 'message.received':
 handle_incoming_message(event['data'])

 return {'ok': True}
```

## 6) Retry Politikası

Sunucunuz 2xx dışı yanıt verirse veya timeout (10sn) yaparsa Veri Merkezi şu aralıklarla retry yapar:

| Deneme | Beklenme süresi |
|---|---|
| 1 | hemen (mesaj gelişiyle aynı saniyede, ~1sn) |
| 2 | +1 dakika |
| 3 | +5 dakika |
| 4 | +30 dakika |
| 5 | +2 saat |
| 6 | +12 saat |
| 7 | +24 saat |
| 8+ | **dead-letter** (silinir, panelden manuel replay edebilirsiniz) |

> **Idempotency:** Her event benzersiz `X-VeriMerkezi-Event-Id` taşır. Sunucunuzda bu ID'yi kaydedip duplicate işlemeyin (retry'ler aynı ID ile gelir).

## 7) Test Ping

Webhook'u canlıya almadan önce sahte bir `test.ping` olayı gönderebilirsiniz:

- **API:** `POST /wa/webhooks/{id}/test` → `{ "ok": true, "result": "delivered" }`
- **Panel:** Webhook detay -> **"Test Ping Gönder"** butonu.

## 8) Webhook'u Silme / Pasifleştirme

- **API:** `DELETE /wa/webhooks/{id}` (sil) veya `PATCH /wa/webhooks/{id}` `{ "active": false }` (pasifleştir).
- **Panel:** Panel -> **API -> Webhooks** -> ilgili webhook -> **Pasifleştir** / **Sil**.

## Sık Sorulanlar

**S: Webhook URL'mi nasıl test ederim?C:** [webhook.site](https://webhook.site) veya [ngrok](https://ngrok.com) kullanarak public URL elde edip Veri Merkezi'ne kaydedin. Test ping ile sahte event gönderin.

**S: HMAC doğrulama yapmazsam ne olur?C:** Bir saldırgan sahte event göndererek sisteminizi yanıltabilir. **Mutlaka doğrulayın.S: Webhook bir kere düşerse mesajları kaybeder miyim?C:** Hayır. Veri Merkezi 7 deneme + 36 saat içinde sunucunuzu denemeye devam eder. Dead-letter'a düşse bile panelden manuel replay edebilirsiniz.

**S: Aynı event birden fazla webhook'a gönderilebilir mi?C:** Evet. Birden fazla aktif subscription'ınız varsa her birine bağımsız iletilir.
