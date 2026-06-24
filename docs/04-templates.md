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
