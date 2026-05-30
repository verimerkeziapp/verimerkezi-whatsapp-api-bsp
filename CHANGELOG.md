# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir. Format [Keep a Changelog](https://keepachangelog.com/) standardını takip eder.

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
- Tier auto-sync (TIER_50 → UNLIMITED)
- Resumable upload (PDF/Image/Video header)
- Multi-tenant izolasyon

---

Yeni sürümler için: https://github.com/verimerkeziapp/whatsapp-sdk/releases
