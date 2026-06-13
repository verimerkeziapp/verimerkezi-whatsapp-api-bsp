# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir. Format [Keep a Changelog](https://keepachangelog.com/) standardını takip eder.

## [1.2.3] — 2026-06-13

### Düzeltildi — `language` alanı her iki formatı kabul ediyor (#132001)
- `POST /wa/messages` template gönderiminde `language` alanı artık HEM `"tr"` (string) HEM `{"code":"tr"}` (Meta nesne formatı) kabul ediyor. Önceden yalnız string bekleniyor, nesne gönderildiğinde içeride `"Array"`'e dönüşüp Meta **132001 "template language not available"** veriyordu.
- Etki: Meta'nın native formatını (`{"code":"tr"}`) gönderen entegrasyonlar artık sorunsuz çalışır. Müşteri kodunda değişiklik gerekmez.

### Düzeltildi — Dokümantasyon
- `docs/03-messages.md`: `language` alanının iki formatı da kabul ettiği netleştirildi.
- `docs/07-rate-limits.md`: rate limit değerleri gerçek uygulamayla eşitlendi — her API anahtarı için **120/dakika** (mesaj gönderimi ayrı sayaçta, yine 120/dakika). Önceki tablo yanlış olarak 60/20/30 gösteriyordu.

## [1.2.2] — 2026-06-13

### İyileştirildi — Olay-anında (event-driven) webhook teslimatı
- Webhook teslimatı artık **olay-anında**: mesaj Meta'dan ulaştığı anda müşteri endpoint'ine POST edilir — uçtan uca tipik gecikme **~1 saniye** (önceden kuyruk periyodik işlendiği için 60 saniyeye kadar çıkabiliyordu)
- Dakikalık kuyruk işleyici yalnızca **retry/yedek** olarak çalışmaya devam eder; retry takvimi değişmedi
- Eşzamanlı teslimata karşı satır bazlı kilit eklendi — aynı event'in çift teslim edilmesi mimari olarak engellendi

### Eklendi — Doküman uyumu (geriye dönük uyumlu)
- Payload gövdesine `event` ve `occurred_at` alanları eklendi (dokümandaki sözleşme); mevcut `event_type` ve `created_at` alanları aynen korunur — **mevcut entegrasyonlarda değişiklik gerekmez**
- Yeni header'lar: `X-VeriMerkezi-Delivery-Attempt` ve `User-Agent: VeriMerkezi-Webhook/1.0`
- `message.echo` payload'ına `from`, `source: "coexistence_app"`, `phone_number_id` alanları eklendi
- `message.received` payload'ına `phone_number_id` ve `contact` nesnesi eklendi

### Düzeltildi — Dokümantasyon
- `docs/06-webhooks.md`: payload örnekleri canlı formatla birebir eşitlendi (`data.text` düz string'dir, `event_id` formatı `evt_...`), timeout değeri düzeltildi (10sn), olay-anında teslimat notu eklendi

### Doğrulama
- Canlı uçtan uca test: imzalı event → teslimat **0.11 sn**, HMAC imza doğrulandı, tüm yeni alan ve header'lar teyit edildi

## [1.2.1] — 2026-06-11

### Düzeltildi — `message.echo` payload parse bug'ı
- **Bug:** `smb_message_echoes` field'ında Meta mesajları `value.message_echoes` array'inde gönderir; biz `value.messages` arıyorduk → echo'lar webhook_log'a alınıyor ama outgoing webhook'a publish edilmiyordu
- **Düzeltme:** `MetaWhatsAppController::handleCoexistenceEcho()` her iki alanı da kabul ediyor (`message_echoes` öncelikli, `messages` fallback)
- Etki: CoExistence Mode kullanan müşteriler `message.echo` event'ini artık almaya başlar
- Müşteri kodunda değişiklik gerekmez — abonelik `events: ["*"]` veya `message.echo` içeriyorsa otomatik akar

### Doğrulama
- Bug fix sonrası mevcut bir Tech Provider hesabında son 1 saatteki 20 echo replay edildi → tümü ilk denemede HTTP 200 ile teslim edildi

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
