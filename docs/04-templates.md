# 04 · Şablon Yönetimi

Müşterilerinize 24 saat dışında ulaşmak için **Meta onaylı şablonlar** kullanmanız gerekir.

## Şablon Kategorileri

| Kategori | Kullanım | Quality riski |
|---|---|---|
| `UTILITY` | Sipariş onayı, randevu, kargo, fatura, şifre değiştirme | Düşük |
| `MARKETING` | Kampanya, indirim, ürün lansmanı | Yüksek |
| `AUTHENTICATION` | OTP, doğrulama kodu | Düşük (sade format) |

## Şablon Oluşturma

```bash
curl -X POST https://api.verimerkezi.app/wa/templates \
 -H "Authorization: Bearer vmk_live_..." \
 -H "Content-Type: application/json" \
 -d '{
 "name": "siparis_onayi",
 "language": "tr",
 "category": "UTILITY",
 "components": [
 {
 "type": "HEADER",
 "format": "TEXT",
 "text": "Sipariş Onayınız"
 },
 {
 "type": "BODY",
 "text": "Merhaba {{1}}, sipariş #{{2}} onaylandı. Kargo: {{3}}",
 "example": {
 "body_text": [["Ahmet", "VM-2026-1234", "Yarın 14:00-18:00"]]
 }
 },
 {
 "type": "FOOTER",
 "text": "Veri Merkezi"
 },
 {
 "type": "BUTTONS",
 "buttons": [
 { "type": "QUICK_REPLY", "text": "Siparişi takip et" },
 { "type": "PHONE_NUMBER", "text": "Bizi ara", "phone_number": "+903326060924" }
 ]
 }
 ]
 }'
```

## Header Medyalı Şablon

Eğer şablonunuzun başlığında **görsel / video / PDF** varsa, **header_handle** vermeniz gerekir. Bu handle Meta'ya direkt yüklenir.

**1) Önce medyayı yükleyin:**
```bash
curl -X POST https://api.verimerkezi.app/wa/media/upload \
 -H "Authorization: Bearer vmk_live_..." \
 -F "file=@/path/to/header.pdf" \
 -F "type=document"
```

**Yanıt:**
```json
{
 "ok": true,
 "id": 42,
 "url": "https://cdn.verimerkezi.app/u/123/wa-media/...pdf",
 "handle": "h:abc123..."
}
```

**2) Şablon oluştururken handle'ı ekleyin:**
```json
{
 "name": "fatura_bildirimi",
 "language": "tr",
 "category": "UTILITY",
 "components": [
 {
 "type": "HEADER",
 "format": "DOCUMENT",
 "example": { "header_handle": ["h:abc123..."] }
 },
 {
 "type": "BODY",
 "text": "Merhaba {{1}}, faturanız hazır.",
 "example": { "body_text": [["Ahmet"]] }
 }
 ]
}
```

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

```bash
curl -X DELETE https://api.verimerkezi.app/wa/templates/siparis_onayi \
 -H "Authorization: Bearer vmk_live_..."
```

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
