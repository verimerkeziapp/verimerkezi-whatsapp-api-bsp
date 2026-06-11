# 06 · Webhook Sistemi

Veri Merkezi, WhatsApp tarafında olan **her olayı** sizin sunucunuza otomatik bildirir. Bu sayede gelen mesajları gerçek zamanlı işleyebilir, chatbot'lar veya CRM entegrasyonları kurabilirsiniz.

## Mimari

```
[Müşteri] -> [WhatsApp] -> [Meta] -> [Veri Merkezi] -> [Sizin Sunucunuz]
 ^ v
 └───── ACK 200 ──────┘
```

Veri Merkezi olayı kuyruğa alır, sunucunuza POST eder ve **HTTP 2xx** yanıtı bekler. Hata durumunda **exponential backoff** ile retry yapar.

## 1) Webhook Aboneliği Kurma

### Panel üzerinden
Panel -> **API -> Webhooks -> "Yeni Webhook"**:
- **Ad:** "Production Bot"
- **URL:** `https://api.firmaniz.com/wa-webhook`
- **Event'ler:** seçeceğiniz olaylar (veya tümü için `*`)
- **Oluştur** -> ekranda **secret** (`whsec_xxxxx`) gösterilir — **bir kez** gösterilir, kaydedin

### API üzerinden
```bash
curl -X POST https://api.verimerkezi.app/wa/webhooks \
 -H "Authorization: Bearer vmk_live_..." \
 -H "Content-Type: application/json" \
 -d '{
 "name": "Production Bot",
 "url": "https://api.firmaniz.com/wa-webhook",
 "events": ["message.received", "message.status.delivered", "message.status.read"]
 }'
```

**Yanıt:**
```json
{
 "ok": true,
 "id": 42,
 "plain_secret": "whsec_abc123...",
 "secret_prefix": "whsec_abc123",
 "events": ["message.received", "message.status.delivered", "message.status.read"]
}
```

> DIKKAT: `plain_secret` sadece bu yanıtta görünür. Kaybederseniz webhook'u silip yenisini oluşturmanız gerekir.

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
| `*` | Tüm event'ler (wildcard) |

### `message.echo` payload örneği

```json
{
  "event": "message.echo",
  "event_id": "01963a2b-...",
  "occurred_at": "2026-06-11T16:58:22+03:00",
  "data": {
    "wamid": "wamid.HBgM...",
    "from": "908503092016",
    "to": "905326060924",
    "type": "text",
    "text": "Teşekkürler, en kısa sürede dönüyorum.",
    "source": "coexistence_app",
    "phone_number_id": "314055571788368"
  }
}
```

> CoExistence Mode'da kullanıcı WhatsApp Business uygulamasından telefon üzerinden müşteriye yanıt yazınca Meta size echo gönderir. Bu sayede chatbot tarafınız hangi müşteriye işletmenin manuel cevap verdiğini görür, çift cevabı engelleyebilir.

#### Ön koşullar
- Numaranızın **CoExistence Mode**'da olması gerekir (Meta tarafında platform_type kontrolü ile doğrulanabilir).
- Meta tarafında `smb_message_echoes` webhook field'ı WABA aboneliğinizde subscribed olmalı.
- Hem ön koşulu hem aboneliği BSP yetkili tarafımız sizin için otomatik açar — siz sadece `events: ["*"]` veya `events: ["message.echo"]` ile subscription kurarsınız.

## 3) Webhook Payload Formatı

Veri Merkezi her event için bu JSON'u **POST** eder:

```json
{
 "event": "message.received",
 "event_id": "01963a2b-7c1d-7f4e-9b21-...",
 "occurred_at": "2026-05-30T13:45:00+03:00",
 "data": {
 "phone_number_id": "1234567890",
 "from": "905551112233",
 "wamid": "wamid.HBgL...",
 "type": "text",
 "text": { "body": "Merhaba, sipariş durumunu öğrenebilir miyim?" },
 "contact": {
 "wa_id": "905551112233",
 "profile_name": "Ayşe Müşteri"
 }
 }
}
```

## 4) Header'lar (Doğrulama için)

```
Content-Type: application/json
X-VeriMerkezi-Signature-256: sha256=abc123...
X-VeriMerkezi-Timestamp: 1717068300
X-VeriMerkezi-Event-Id: 01963a2b-7c1d-7f4e-9b21-...
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

Sunucunuz 2xx dışı yanıt verirse veya timeout (15sn) yaparsa Veri Merkezi şu aralıklarla retry yapar:

| Deneme | Beklenme süresi |
|---|---|
| 1 | hemen |
| 2 | +1 dakika |
| 3 | +5 dakika |
| 4 | +30 dakika |
| 5 | +2 saat |
| 6 | +12 saat |
| 7 | +24 saat |
| 8+ | **dead-letter** (silinir, panelden manuel replay edebilirsiniz) |

> **Idempotency:** Her event benzersiz `X-VeriMerkezi-Event-Id` taşır. Sunucunuzda bu ID'yi kaydedip duplicate işlemeyin (retry'ler aynı ID ile gelir).

## 7) Test Ping

Webhook'u canlıya almadan önce sahte event göndererek test edin:

```bash
curl -X POST https://api.verimerkezi.app/wa/webhooks/42/test \
 -H "Authorization: Bearer vmk_live_..."
```

Veya panel -> Webhook detay -> **"Test Ping Gönder"** butonu.

## 8) Webhook'u Silme / Pasifleştirme

```bash
# Pasifleştir (event göndermez ama kayıt kalır)
curl -X PATCH https://api.verimerkezi.app/wa/webhooks/42 \
 -H "Authorization: Bearer vmk_live_..." \
 -d '{"is_active": false}'

# Tamamen sil
curl -X DELETE https://api.verimerkezi.app/wa/webhooks/42 \
 -H "Authorization: Bearer vmk_live_..."
```

## Sık Sorulanlar

**S: Webhook URL'mi nasıl test ederim?C:** [webhook.site](https://webhook.site) veya [ngrok](https://ngrok.com) kullanarak public URL elde edip Veri Merkezi'ne kaydedin. Test ping ile sahte event gönderin.

**S: HMAC doğrulama yapmazsam ne olur?C:** Bir saldırgan sahte event göndererek sisteminizi yanıltabilir. **Mutlaka doğrulayın.S: Webhook bir kere düşerse mesajları kaybeder miyim?C:** Hayır. Veri Merkezi 7 deneme + 36 saat içinde sunucunuzu denemeye devam eder. Dead-letter'a düşse bile panelden manuel replay edebilirsiniz.

**S: Aynı event birden fazla webhook'a gönderilebilir mi?C:** Evet. Birden fazla aktif subscription'ınız varsa her birine bağımsız iletilir.
