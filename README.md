# Veri Merkezi — WhatsApp Business API SDK & Dokümantasyon

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![API](https://img.shields.io/badge/API-v1-emerald.svg)](https://api.verimerkezi.app)
[![Status](https://img.shields.io/badge/Status-Production-success.svg)](https://verimerkezi.app)

> Türkiye'nin **Meta onaylı WhatsApp Business Tech Provider**'ı — Veri Merkezi BSP altyapısı için resmî SDK, OpenAPI şeması ve dokümantasyon deposu.

Bu repo, **kendi uygulamanızı / chatbot'unuzu / CRM entegrasyonunuzu** Veri Merkezi'nin WhatsApp altyapısı üzerine inşa etmeniz için ihtiyacınız olan her şeyi içerir.

---

## Hızlı Bakış

```bash
curl -X POST https://api.verimerkezi.app/wa/messages \
 -H "Authorization: Bearer vmk_live_..." \
 -H "Content-Type: application/json" \
 -H "Idempotency-Key: $(uuidgen)" \
 -d '{
 "to": "905551234567",
 "type": "template",
 "template": {
 "name": "siparis_onayi",
 "language": { "code": "tr" },
 "components": [{
 "type": "body",
 "parameters": [{ "type": "text", "text": "Ahmet" }]
 }]
 }
 }'
```

---

## İçindekiler

```
.
├── schemas/
│ └── openapi.yaml # OpenAPI 3.1 — tüm endpoint şeması
├── sdk/
│ ├── php/ # PHP SDK (PSR-4)
│ ├── nodejs/ # Node.js SDK (CommonJS + ESM)
│ └── python/ # Python SDK (sync + async destekli)
├── docs/
│ ├── 01-getting-started.md # Onboarding, API key alma
│ ├── 02-authentication.md # Bearer token + scope
│ ├── 03-messages.md # Mesaj gönderim (text / template / media)
│ ├── 04-templates.md # Şablon listeleme (oluşturma panelden)
│ ├── 05-contacts.md # Kişi rehberi (ekle / toplu / listele)
│ ├── 06-webhooks.md # Webhook alıcı + HMAC doğrulama
│ ├── 07-rate-limits.md # Rate limit + Idempotency-Key
│ ├── 08-pagination.md # Cursor pagination
│ └── 09-errors.md # Hata kodları + Meta kod referansı
├── examples/
│ ├── php/ # Örnek kullanımlar
│ ├── nodejs/
│ └── python/
└── postman/
 └── VeriMerkezi.postman_collection.json
```

---

## Başlangıç (3 Adım)

### 1) Hesap + WhatsApp Bağlantısı
[verimerkezi.app](https://verimerkezi.app)'ten kayıt ol -> paketini seç -> **Embedded Signup** ile kendi WABA numaranı tek tıkla bağla.

### 2) API Anahtarı Al
Panel -> **API -> Anahtarlar** -> "Yeni Anahtar Oluştur" -> key'i kaydet (sadece bir kez gösterilir).

### 3) SDK ile Kod Yaz

**PHP:**
```php
require 'sdk/php/src/VeriMerkeziClient.php';
$vm = new VeriMerkeziClient('vmk_live_xxx');
$vm->sendText('1234567890', '905551234567', 'Merhaba!');
```

**Node.js:**
```js
const { VeriMerkeziClient } = require('./sdk/nodejs/lib/verimerkezi-client');
const vm = new VeriMerkeziClient('vmk_live_xxx');
await vm.sendText('1234567890', '905551234567', 'Merhaba!');
```

**Python:**
```python
from verimerkezi import VeriMerkeziClient
vm = VeriMerkeziClient('vmk_live_xxx')
vm.send_text('1234567890', '905551234567', 'Merhaba!')
```

---

## API Özellikleri

| Özellik | Durum |
|---|---|
| **Mesaj gönderimi** (text / image / document / video / audio / location / contact / sticker / reaction) | Evet — `POST /messages` |
| **Şablon listeleme** (`GET /templates`) | Evet (oluşturma/silme/submit panelden) |
| **Kişi rehberi** (ekle / toplu ekle / listele) | Evet — `POST /contacts`, `/contacts/bulk`, `GET /contacts` |
| **Hesap & numaralar** (`GET /me`, `GET /numbers`) | Evet |
| **Raporlar** (`GET /reports/summary`) | Evet |
| **Kredi** (`GET /credit/balance\|packages\|usage\|transactions`) | Evet |
| **İşletme profili** (`GET` / `PATCH /profile/{id}`) | Evet |
| **Outgoing webhook** (HMAC-SHA256, exponential backoff retry) | Evet (abonelik **panelden** — programatik API yok) |
| **11 webhook event tipi** (message.received, status.*, template.*, quality.changed) | Evet |
| **Idempotency-Key** (24h TTL, replay safe) | Evet — yalnızca `POST /messages` |
| **Rate limit** (fixed-window, `X-RateLimit-*` header'ları) | Evet — 120/dk |
| **Cursor pagination** (opaque, stateless) | Evet — `/contacts`, `/credit/transactions` |
| **Tier auto-sync** (TIER_50 -> 250 -> 1K -> 10K -> 100K -> UNLIMITED) | Evet |
| **Multi-tenant izolasyon** (her API key tek müşteri) | Evet |

---

## Güvenlik

- **HTTPS only** — `https://api.verimerkezi.app/wa` (HTTP otomatik reddedilir)
- **API key formatı:** `vmk_live_*` (production) / `vmk_test_*` (sandbox)
- **Webhook imzası:** `X-VeriMerkezi-Signature-256: sha256=<hmac>` header'ı
- **Replay koruması:** `X-VeriMerkezi-Timestamp` (5 dakikadan eski payload reddedilmeli)
- **HMAC formülü:** `hash_hmac('sha256', timestamp + '.' + raw_body, webhook_secret)`

Webhook doğrulama örneği için [docs/06-webhooks.md](docs/06-webhooks.md) bölümüne bakın.

---

## Detaylı Dokümantasyon

| Dosya | İçerik |
|---|---|
| [01-getting-started.md](docs/01-getting-started.md) | Hesap + WABA bağlantı + ilk API çağrısı |
| [02-authentication.md](docs/02-authentication.md) | Bearer token, scope, key rotation |
| [03-messages.md](docs/03-messages.md) | Tüm mesaj tipleri + örnekler |
| [04-templates.md](docs/04-templates.md) | Şablon listeleme (oluşturma panelden) + Meta onay süreci |
| [05-contacts.md](docs/05-contacts.md) | Kişi ekleme + toplu içe aktarma + listeleme |
| [06-webhooks.md](docs/06-webhooks.md) | Webhook alıcı (receiver) + HMAC doğrulama (abonelik panelden) |
| [07-rate-limits.md](docs/07-rate-limits.md) | Rate limit politikası + Idempotency-Key |
| [08-pagination.md](docs/08-pagination.md) | Cursor pagination kullanımı |
| [09-errors.md](docs/09-errors.md) | HTTP + Meta hata kodları |

---

## Örnekler

Her dilde çalışan, kopyala-yapıştır örnekler:

- **PHP:** [examples/php/](examples/php/)
- **Node.js:** [examples/nodejs/](examples/nodejs/)
- **Python:** [examples/python/](examples/python/)
- **Postman:** [postman/VeriMerkezi.postman_collection.json](postman/VeriMerkezi.postman_collection.json) — import et, hemen test et

---

## Faydalı Bağlantılar

- **Web:** [verimerkezi.app](https://verimerkezi.app)
- **API Hub:** [api.verimerkezi.app](https://api.verimerkezi.app)
- **WhatsApp Dokümanı:** [api.verimerkezi.app/docs/wa](https://api.verimerkezi.app/docs/wa)
- **OpenAPI:** [api.verimerkezi.app/sdk/openapi.yaml.txt](https://api.verimerkezi.app/sdk/openapi.yaml.txt)
- **Destek:** bilgi@verimerkezi.app · 0332 606 09 24

---

## Lisans

[MIT License](LICENSE) — Bu SDK + dokümantasyon depolarını ticari ürünlerinizde özgürce kullanabilirsiniz.

API servisinin kendisi **Veri Merkezi**'ne aittir; kullanım [hizmet şartlarına](https://verimerkezi.app/yasal/kullanim-sartlari) tabidir.

---

**Veri Merkezi** · Türkiye'nin Meta onaylı WhatsApp Business Tech Provider'ı
