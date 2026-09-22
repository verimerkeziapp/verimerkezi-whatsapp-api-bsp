# 04 · Şablon Yönetimi

Müşterilerinize 24 saat dışında ulaşmak için **Meta onaylı şablonlar** kullanmanız gerekir.

## Şablon Kategorileri

| Kategori | Kullanım | Quality riski |
|---|---|---|
| `UTILITY` | Sipariş onayı, randevu, kargo, fatura, şifre değiştirme | Düşük |
| `MARKETING` | Kampanya, indirim, ürün lansmanı | Yüksek |
| `AUTHENTICATION` | OTP, doğrulama kodu | Düşük (sade format) |

## Şablon Oluşturma

> **v1.9.0 (2026-09-23):** Şablon oluşturma, düzenleme, silme ve ön doğrulama artık **API üzerinden** yapılabilir. Panelden çıkmadan şablon oluşturup Meta'ya gönderebilirsiniz. (Panel arayüzü de çalışmaya devam eder — bkz. bölüm sonu.)

### `POST /wa/templates` — oluştur ve Meta'ya gönder

Hedef WABA'yı `waba_id` **veya** `phone_number_id` ile belirtin (numaradan WABA'yı biz çözeriz). Header'da görsel/video/PDF kullanacaksanız **herkese açık bir https adresini** `header_media_url` ile geçin; medyayı indirip Meta'ya `header_handle` olarak biz yükleriz (ayrı bir yükleme adımı gerekmez).

```bash
curl -X POST https://api.verimerkezi.app/wa/templates \
 -H "Authorization: Bearer vmk_live_..." \
 -H "Content-Type: application/json" \
 -d '{
   "waba_id": "1029384756",
   "name": "police_yenileme_hatirlatma",
   "language": "tr",
   "category": "UTILITY",
   "allow_category_change": true,
   "header_media_url": "https://cdn.example.com/logo.jpg",
   "components": [
     { "type": "HEADER", "format": "IMAGE" },
     { "type": "BODY",
       "text": "Sayın {{1}}, {{2}} plakalı aracınızın poliçesi {{3}} tarihinde sona eriyor.",
       "example": { "body_text": [["Ahmet Yılmaz", "34 ABC 123", "12.10.2026"]] } },
     { "type": "FOOTER", "text": "Mim Gökmen Sigorta" },
     { "type": "BUTTONS", "buttons": [ { "type": "QUICK_REPLY", "text": "Teklif istiyorum" } ] }
   ]
 }'
```

Yanıt (`202 Accepted`):

```json
{
  "id": 512,
  "meta_template_id": "1249033812345678",
  "name": "police_yenileme_hatirlatma",
  "language": "tr",
  "category": "UTILITY",
  "status": "PENDING",
  "waba_id": "1029384756",
  "phone_number_id": "1275179085670729"
}
```

**Doğrulama Meta'dan önce çalışır.** Sıralama/örnek/uzunluk gibi kural ihlalleri Meta'ya gönderilmeden **alan bazında** döner:

```http
HTTP/1.1 422 Unprocessable Entity
```
```json
{ "error": { "code": "template_invalid", "message": "Her parametre için örnek değer gerekir.", "field": "components.1.example" } }
```

Meta tarafında reddedilirse: `422 { "error": { "code": "template_rejected", "message": "..." } }`.

### `POST /wa/templates/validate` — göndermeden doğrula

Gövdeyi Meta'ya **göndermeden** aynı kurallarla denetler; kullanıcı "gönder"e basmadan hatasını görür.

```bash
curl -X POST https://api.verimerkezi.app/wa/templates/validate \
 -H "Authorization: Bearer vmk_live_..." -H "Content-Type: application/json" \
 -d '{ "phone_number_id": "1275179085670729", "name": "deneme", "language": "tr",
       "category": "UTILITY", "components": [ { "type": "BODY", "text": "Merhaba {{1}}",
       "example": { "body_text": [["Ahmet"]] } } ] }'
```
```json
{ "ok": true, "valid": true, "message": "Şablon Meta kurallarına uygun görünüyor." }
```

### Alternatif: panelden

API yerine panelden de yönetebilirsiniz — Panel -> **WhatsApp -> Şablonlar -> "Yeni Şablon"**: kategori seçin, HEADER / BODY / FOOTER / BUTTONS bileşenlerini ekleyin, header medyasını yükleyin, örnek değerleri girin, **Meta'ya Gönder**.

## Dinamik URL Butonu

Bir URL butonunun adresini **her gönderimde değiştirmek** istiyorsanız (örn. her müşteriye kişiye özel sepet / takip linki), butonu **dinamik** tanımlayın:

- Panelde şablon oluştururken *URL* tipi buton ekleyin.
- Adresin **sonuna** tek bir `{{1}}` değişkeni koyun: `https://taksicialik.com/checkout?code=SEPET5&restore_products={{1}}`
- "Örnek adres" alanına, `{{1}}` yerine gerçekçi bir değer içeren **tam örnek** girin (Meta onayı bunu ister): `https://taksicialik.com/checkout?code=SEPET5&restore_products=d32eec6c,5cbd62f6`
- Meta onayından sonra, gönderimde değişken kısım `button` bileşeniyle geçirilir — bkz. [03-messages.md](03-messages.md#dinamik-url-butonu).

> **Meta kuralları:** URL butonunda **tek** değişken olur ve **yalnız adresin sonunda** yer alır. Dinamik URL butonlu şablonlar **yalnızca API** (`POST /wa/messages`, `button` parametresi) ile gönderilir — panel toplu kampanya / otomasyon ekranından gönderilemez.

## OTP / Kimlik Doğrulama Şablonu (AUTHENTICATION)

WhatsApp üzerinden **OTP / tek kullanımlık doğrulama kodu** göndermek için `AUTHENTICATION` kategorisinde şablon oluşturun. Bu kategoride **gövde metni Meta tarafından sabittir ve düzenlenemez** — Meta gövdeyi ("`<kod>` doğrulama kodunuzdur") ve **Kodu Kopyala** butonunu otomatik üretir. Siz yalnızca aşağıdakileri belirlersiniz.

Panel -> **WhatsApp -> Şablonlar -> "Yeni Şablon" -> Kategori: Doğrulama (AUTHENTICATION)**:
- **Güvenlik önerisi** (aç/kapa) — "Bu kodu kimseyle paylaşmayın" satırı.
- **Kod geçerlilik süresi** (0–90 dk) — footer'da gösterilir (0 = gösterme).
- **Buton tipi:**
  - `COPY_CODE` (varsayılan) — kodu panoya kopyalar; **her cihazda** çalışır.
  - `ONE_TAP` — kodu **sizin Android uygulamanıza** otomatik doldurur; `autofill_text` + `package_name` + `signature_hash` (uygulamanızın imza hash'i, 11 karakter) gerektirir.

Meta'ya giden bileşen yapısı (panel otomatik kurar):

```json
{
  "name": "otp_dogrulama",
  "language": "tr",
  "category": "AUTHENTICATION",
  "components": [
    { "type": "BODY", "add_security_recommendation": true },
    { "type": "FOOTER", "code_expiration_minutes": 5 },
    { "type": "BUTTONS", "buttons": [
      { "type": "OTP", "otp_type": "COPY_CODE", "text": "Kodu Kopyala" }
    ] }
  ]
}
```

ONE_TAP butonu için `buttons` bileşeni:

```json
{ "type": "OTP", "otp_type": "ONE_TAP", "text": "Kodu Kopyala",
  "autofill_text": "Otomatik Doldur", "package_name": "com.sirket.uygulama", "signature_hash": "Xy9AbC12DeF" }
```

Onaydan sonra kodu göndermek için bkz. [03-messages.md](03-messages.md#otp--doğrulama-kodu-gönderme).

## Şablon Durumları

| Durum | Açıklama |
|---|---|
| `PENDING` | Meta inceliyor (5-30 dk) |
| `APPROVED` | Onaylandı, kullanıma hazır |
| `REJECTED` | Reddedildi (`rejected_reason` alanına bakın) |
| `FLAGGED` | İşaretlendi (geçici uyarı) |
| `PAUSED` | Geçici durduruldu (kalite/spam) |
| `DISABLED` | Tamamen devre dışı |

## Şablon Listesi — `GET /wa/templates`

Süzgeçler (hepsi opsiyonel): `status`, `category`, `language`, `q` (ad içinde arama), `limit` (varsayılan 50), `cursor` (imleç sayfalama — bkz. [08-pagination.md](08-pagination.md)).

```bash
curl "https://api.verimerkezi.app/wa/templates?status=APPROVED&category=UTILITY&language=tr&limit=50" \
 -H "Authorization: Bearer vmk_live_..."
```

```json
{
  "templates": [
    {
      "id": 512,
      "meta_template_id": "1249033812345678",
      "name": "siparis_onayi",
      "language": "tr",
      "category": "UTILITY",
      "status": "APPROVED",
      "rejected_reason": null,
      "waba_id": "1029384756",
      "phone_number_id": "1275179085670729",
      "created_at": "2026-09-20T10:12:00+03:00"
    }
  ],
  "has_more": false,
  "next_cursor": null
}
```

> **WABA ayrımı:** Şablonlar Meta'da **numaraya değil WABA'ya** bağlıdır — aynı WABA'daki tüm numaralar aynı onaylı şablonu kullanabilir. Her şablonda `waba_id`, her numarada (`GET /wa/numbers`) `waba_id` döndüğü için "bu şablon şu numaralarda kullanılabilir" eşleştirmesini doğru kurabilirsiniz.

## Şablon Ayrıntısı — `GET /wa/templates/{id}`

Listeye ek olarak `quality_score`, `status_updated_at`, `submitted_at`, tam `components` ve `display_phone_number` döner. Reddedilen bir şablonun **sebebini** (`rejected_reason`) buradan gösterebilirsiniz.

```json
{
  "id": 512,
  "meta_template_id": "1249033812345678",
  "name": "police_yenileme_hatirlatma",
  "language": "tr",
  "category": "UTILITY",
  "status": "REJECTED",
  "rejected_reason": "INVALID_FORMAT",
  "quality_score": null,
  "waba_id": "1029384756",
  "phone_number_id": "1275179085670729",
  "created_at": "2026-09-22T09:00:00+03:00",
  "submitted_at": "2026-09-22T09:00:03+03:00",
  "status_updated_at": "2026-09-22T09:05:41+03:00",
  "components": [ ... ],
  "display_phone_number": "+90 555 000 00 00"
}
```

## Şablon Düzenleme — `PATCH /wa/templates/{id}`

Meta, onaylı/reddedilmiş şablonların düzenlenmesine (sınırlı sayıda) izin verir. Yeni bileşenleri gönderin; şablon yeniden **PENDING** durumuna geçer.

```bash
curl -X PATCH https://api.verimerkezi.app/wa/templates/512 \
 -H "Authorization: Bearer vmk_live_..." -H "Content-Type: application/json" \
 -d '{ "components": [ { "type": "BODY", "text": "Sayın {{1}}, poliçeniz {{2}} tarihinde bitiyor.",
       "example": { "body_text": [["Ahmet", "12.10.2026"]] } } ] }'
```

## Şablon Silme — `DELETE /wa/templates/{id}`

```bash
curl -X DELETE https://api.verimerkezi.app/wa/templates/512 \
 -H "Authorization: Bearer vmk_live_..."
```
```json
{ "ok": true, "deleted": true, "id": 512 }
```

> DIKKAT: Şablon silinince **gerçek geçmiş mesajlar etkilenmez** ama bir daha o isimle kullanılamaz. Silme panelden de yapılabilir.

## Şablon Kuralları (Meta)

Evet **YAP:**
- BODY'de en fazla 1024 karakter
- En fazla 10 emoji
- Parametre sıralı olmalı: `{{1}}`, `{{2}}`, `{{3}}`
- Her parametre için **örnek değer** (example) gönderin
- HEADER, BODY, FOOTER, BUTTONS sırası

Hayir **YAPMA:**
- 3+ ardışık boş satır
- Body sadece parametre olmasın (sabit metin olmalı)
- Marka adı olmadan jenerik şablon ("Süper indirim!" reddedilir)
- Yanıltıcı vaatler
- WhatsApp / Meta logosu izinsiz

## Şablon Performansı

Panel -> WhatsApp -> Şablonlar -> şablon detayına tıklayın:
- **Gönderim sayısı**
- **Teslim oranı**
- **Okunma oranı**
- **Block / spam report oranı** (yüksekse Meta kalitenizi düşürür)

## Tipik Reddedilme Sebepleri

| Sebep | Çözüm |
|---|---|
| "Generic content" | Marka adınızı ekleyin |
| "Misleading offers" | Net ve gerçekçi yazın |
| "Variables without context" | Parametre etrafına sabit metin koyun |
| "Insufficient example" | Tüm parametreler için örnek değer verin |
| "Category mismatch" | UTILITY içerikleri MARKETING olarak göndermeyin |
