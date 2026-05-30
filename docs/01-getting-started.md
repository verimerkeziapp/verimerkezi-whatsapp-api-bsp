# 01 · Başlangıç

Bu rehber, Veri Merkezi WhatsApp Business API'yi sıfırdan kullanmaya başlamanız için gereken **3 adımı** anlatır.

## 1) Hesap & Paket

1. [verimerkezi.app](https://verimerkezi.app) üzerinden ücretsiz kayıt olun.
2. Panelde **Paketler** kısmından ihtiyacınıza uygun planı seçip aktifleştirin.

## 2) WhatsApp Business Hesabı (WABA) Bağlama

Veri Merkezi, Meta'nın resmî **Embedded Signup v4** akışını kullanır:

1. Panel -> **WhatsApp -> Bağlan** sayfasına gidin.
2. **"WhatsApp Business Hesabı Bağla"** butonuna tıklayın.
3. Açılan Meta penceresinde:
 - Facebook hesabınızla giriş yapın
 - İşletme bilgilerinizi doğrulayın
 - Bağlayacağınız telefon numarasını seçin (yeni numara veya CoExistence)
 - Veri Merkezi'ne **Tech Provider** olarak erişim izni verin
4. Yönlendirme tamamlandığında WABA + telefon numaranız panelde aktif görünür.

**Notlar:**
- Embedded Signup ile bağlanan numara için **2FA PIN** Veri Merkezi tarafından otomatik üretilir
- Mevcut WhatsApp Business uygulaması kullanıyorsanız **CoExistence** modunu seçin
- Bağlantı sonrası numaranızın **kalite puanı** ve **tier seviyesi** otomatik sync edilir

## 3) API Anahtarı Oluşturma

1. Panel -> **API -> Anahtarlar** sayfasına gidin.
2. **"Yeni Anahtar Oluştur"** -> bir ad verin (örn. "Production Bot") -> scope seçin:
 - `messages:write` — mesaj gönderme
 - `templates:write` — şablon yönetimi
 - `contacts:write` — kişi rehberi
 - `webhooks:write` — webhook abonelik
 - `admin` — tüm yetkiler (dikkatli kullanın)
3. **Oluştur**'a basın -> anahtar **bir kez** gösterilir:
 - `vmk_live_abc123...` (production)
 - `vmk_test_xyz789...` (sandbox)

> DIKKAT: **Anahtarı güvenli yerde saklayın.** Tekrar gösterilmez. Kaybederseniz iptal edip yenisini oluşturun.

## 4) İlk API Çağrısı

### Hesap kontrolü
```bash
curl https://api.verimerkezi.app/wa/me \
 -H "Authorization: Bearer vmk_live_..."
```

**Beklenen yanıt:**
```json
{
 "ok": true,
 "user": {
 "id": 42,
 "name": "Ahmet Yılmaz",
 "email": "ahmet@firma.com",
 "plan": "professional"
 },
 "numbers": [
 {
 "phone": "+905551234567",
 "verified_name": "Firma A.Ş.",
 "tier": "TIER_1K",
 "quality_rating": "GREEN",
 "status": "active"
 }
 ]
}
```

### İlk mesaj
```bash
curl -X POST https://api.verimerkezi.app/wa/messages \
 -H "Authorization: Bearer vmk_live_..." \
 -H "Content-Type: application/json" \
 -d '{
 "phone_number_id": "1234567890",
 "to": "905551112233",
 "type": "text",
 "text": { "body": "Merhaba! Bu mesaj API üzerinden gönderildi." }
 }'
```

> DIKKAT: **24 saat kuralı:** Müşteriniz size son 24 saat içinde mesaj atmadıysa, sadece **onaylı bir şablon** ile mesaj gönderebilirsiniz. Düz metin ancak service window içinde çalışır.

## Sonraki Adımlar

- [02-authentication.md](02-authentication.md) — Bearer token detayları + key rotation
- [03-messages.md](03-messages.md) — Tüm mesaj tipleri
- [04-templates.md](04-templates.md) — Şablon oluşturma + Meta onayı
- [06-webhooks.md](06-webhooks.md) — Gelen mesajları yakalama

## Destek

- bilgi@verimerkezi.app
- 0332 606 09 24
- [api.verimerkezi.app/docs/wa](https://api.verimerkezi.app/docs/wa) (canlı dokümanlar)
