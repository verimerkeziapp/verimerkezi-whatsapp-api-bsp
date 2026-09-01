# 04 · Şablon Yönetimi

Müşterilerinize 24 saat dışında ulaşmak için **Meta onaylı şablonlar** kullanmanız gerekir.

## Şablon Kategorileri

| Kategori | Kullanım | Quality riski |
|---|---|---|
| `UTILITY` | Sipariş onayı, randevu, kargo, fatura, şifre değiştirme | Düşük |
| `MARKETING` | Kampanya, indirim, ürün lansmanı | Yüksek |
| `AUTHENTICATION` | OTP, doğrulama kodu | Düşük (sade format) |

## Şablon Oluşturma

> **Şablonlar panel üzerinden yönetilir.** Şablon oluşturma, header medyası yükleme ve Meta'ya gönderim (submit) işlemleri **panelden** yapılır — bu işlemler için API endpoint'i bulunmamaktadır. API üzerinden yalnızca onaylı şablonlarınızı **listeleyebilir** (`GET /wa/templates`) ve `POST /wa/messages` ile **kullanabilirsiniz**.

Panel -> **WhatsApp -> Şablonlar -> "Yeni Şablon"**:
- Kategori seçin (`UTILITY` / `MARKETING` / `AUTHENTICATION`)
- HEADER / BODY / FOOTER / BUTTONS bileşenlerini ekleyin
- Header'da görsel / video / PDF kullanacaksanız medyayı panelden yükleyin (Meta'ya `header_handle` olarak otomatik gönderilir)
- Parametreler için örnek değer girin
- **Meta'ya Gönder** -> Meta inceler (genelde 5-30 dk)

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

## Şablon Listesi

```bash
curl https://api.verimerkezi.app/wa/templates \
 -H "Authorization: Bearer vmk_live_..."
```

```json
{
 "ok": true,
 "data": [
 {
 "id": 1,
 "name": "siparis_onayi",
 "language": "tr",
 "category": "UTILITY",
 "status": "APPROVED",
 "components": [...],
 "quality_score": "GREEN"
 }
 ]
}
```

## Şablon Silme

Şablon silme işlemi **panelden** yapılır: Panel -> WhatsApp -> Şablonlar -> ilgili şablon -> **Sil**.

> DIKKAT: Şablon silinince **gerçek geçmiş mesajlar etkilenmez** ama bir daha o isimle kullanılamaz.

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
