# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir. Format [Keep a Changelog](https://keepachangelog.com/) standardını takip eder.

## [1.2.0] — 2026-06-11

### Eklenenler — CoExistence Echo Webhook
- Yeni event tipi: **`message.echo`** — işletme WhatsApp uygulamasından telefon üzerinden müşteriye doğrudan yazdığında Meta'nın gönderdiği `smb_message_echoes` event'i artık müşteri webhook'una iletilir
- `data.from` = işletme numarası, `data.to` = müşteri numarası, `data.source = "coexistence_app"`
- Mesaj `v2_wa_messages`'a `direction='outbound'` + kaynak `coexistence_app` olarak yazılır; konuşma `last_message_at` güncellenir
- OpenAPI events enum + docs/06-webhooks.md güncellendi

## [1.1.0] — 2026-06-11

### Eklenenler — Webhook Subscription CRUD
- **PHP SDK**: `listWebhooks()`, `createWebhook(name, url, events)`, `setWebhookActive(id, bool)`, `deleteWebhook(id)`, `testWebhook(id)`, `webhookDeliveries(id)` metodları
- **Node.js SDK**: `listWebhooks()`, `createWebhook(name, url, events)`, `setWebhookActive(id, isActive)`, `deleteWebhook(id)`, `testWebhook(id)`, `webhookDeliveries(id)` metodları
- **Python SDK**: `list_webhooks()`, `create_webhook(name, url, events)`, `set_webhook_active(id, is_active)`, `delete_webhook(id)`, `test_webhook(id)`, `webhook_deliveries(id)` metodları
- **OpenAPI 3.1 şeması**: `/webhooks` (GET, POST), `/webhooks/{id}` (PATCH, DELETE), `/webhooks/{id}/test` (POST), `/webhooks/{id}/deliveries` (GET) endpoint'leri
- **Postman koleksiyonu**: 6 yeni request (CRUD + test + deliveries)
- HTTP DELETE method desteği SDK request helper'larında

### Sunucu Tarafı — Backend İyileştirmeleri (üretim ortamı)
- `OutgoingWebhookService::dispatch()` `WaDispatcher` cron'a entegre edildi — her dakika kuyruk işlenir
- `MetaWhatsAppController::saveIncomingMessage` publish sonrası anında `dispatch(5)` çağrısı — yeni mesajlar 1-2 sn içinde müşteri sunucusuna ulaşır (cron beklemez)
- Webhook delivery teslimat geçmişi GET endpoint'i ile sorgulanabilir

### Notlar
- Bu sürüm geriye dönük uyumlu — mevcut webhook entegrasyonları aynen çalışmaya devam eder
- `plain_secret` hâlâ yalnızca `createWebhook` yanıtında 1 kez döner; HMAC imza akışı değişmedi (`sha256=hmac_sha256(ts + '.' + body, secret)`)

## [1.0.0] — 2026-05-30

### Eklenenler
- İlk sürüm: Veri Merkezi WhatsApp Business API SDK + dokümantasyon
- PHP SDK (PSR-4, tek dosya destekli)
- Node.js SDK (CommonJS + ESM)
- Python SDK (sync + async)
- OpenAPI 3.1 şeması
- Postman koleksiyonu
- Detaylı dokümantasyon (9 bölüm)
- Webhook receiver örnekleri (PHP / Node.js / Python)
- MIT lisansı

### API Özellikleri
- Embedded Signup v4 ile WABA bağlama
- 27+ REST endpoint
- Outgoing webhook (HMAC SHA-256, 11 event tipi)
- Idempotency-Key (24h TTL)
- Cursor pagination
- Per-user rate limit (`X-RateLimit-*` header'ları)
- Tier auto-sync (TIER_50 -> UNLIMITED)
- Resumable upload (PDF/Image/Video header)
- Multi-tenant izolasyon

---

Yeni sürümler için: https://github.com/verimerkeziapp/whatsapp-sdk/releases
