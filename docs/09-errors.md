# 09 · Hata Kodları

## HTTP Status Code'ları

| Code | Açıklama |
|---|---|
| `200 OK` | Başarılı |
| `201 Created` | Yeni kaynak oluşturuldu (şablon, kişi, webhook) |
| `204 No Content` | Başarılı, gövde yok (DELETE) |
| `400 Bad Request` | İstek formatı hatalı (JSON parse, eksik alan) |
| `401 Unauthorized` | API key eksik veya geçersiz |
| `403 Forbidden` | Yetkisiz (yanlış scope, IP whitelist dışı, host kısıtı) |
| `404 Not Found` | Kaynak bulunamadı |
| `409 Conflict` | Çakışma (örn. aynı şablon adı) |
| `422 Unprocessable Entity` | Validasyon hatası (örn. geçersiz telefon) |
| `429 Too Many Requests` | Rate limit aşıldı (`Retry-After` header'ına bakın) |
| `500 Internal Server Error` | Beklenmeyen sunucu hatası |
| `502 Bad Gateway` | Meta'ya bağlantı sorunu (geçici) |
| `503 Service Unavailable` | Bakım modu (geçici) |
| `504 Gateway Timeout` | Meta yanıt vermedi |

## Hata Yanıt Formatı

Tüm hatalar şu yapıyı izler:

```json
{
  "ok": false,
  "error": {
    "code": "string",
    "message": "Türkçe açıklama",
    "meta_code": 131021,
    "meta_subcode": null,
    "details": {}
  }
}
```

## API Hata Kodları (`error.code`)

| Code | HTTP | Anlam |
|---|---|---|
| `invalid_api_key` | 401 | API key formatı veya değeri hatalı |
| `expired_api_key` | 401 | Key iptal edilmiş veya süresi dolmuş |
| `insufficient_scope` | 403 | Bu endpoint için yetkin yetersiz scope |
| `ip_not_allowed` | 403 | IP whitelist dışında |
| `invalid_host` | 403 | API yanlış host'tan çağrıldı |
| `rate_limited` | 429 | İstek limiti aşıldı |
| `idempotency_key_conflict` | 422 | Aynı key + farklı body |
| `invalid_phone` | 422 | E.164 formatına uygun değil |
| `invalid_recipient` | 422 | Alıcı WhatsApp'ta yok |
| `not_in_24h_window` | 422 | Service window dışında düz metin gönderildi |
| `template_not_approved` | 422 | Şablon henüz Meta onayında değil |
| `template_not_found` | 404 | Şablon bulunamadı |
| `quota_exceeded` | 429 | Günlük tier limiti aşıldı |
| `media_too_large` | 422 | Medya dosyası limit aşımı |
| `media_invalid_format` | 422 | Desteklenmeyen MIME |
| `webhook_url_invalid` | 422 | URL HTTPS değil veya erişilemez |
| `payment_required` | 402 | Hesabınızda ödeme yöntemi yok |
| `account_suspended` | 403 | Meta hesabınızı askıya aldı |

## Meta Hata Kodları (Otomatik Türkçeleştirme)

`error.meta_code` Meta Graph API'nin orijinal kodu. Aşağıdakileri otomatik Türkçeleştiriyoruz:

| Meta Code | Açıklama |
|---|---|
| `10` | Bu işlem için Meta BSP yetkisi gerekli (sandbox WABA'larda normal) |
| `190` | Erişim token süresi dolmuş, yeniden bağlanın |
| `200` | Yetersiz izin, panel'de yetki verin |
| `368` | Politika ihlali nedeniyle geçici engel |
| `613` | Çok fazla istek (Meta tarafı rate limit) |
| `131000` | Genel hata |
| `131005` | Erişim reddedildi |
| `131008` | Eksik zorunlu parametre |
| `131021` | Alıcı engellemiş veya geçersiz |
| `131026` | Mesaj teslim edilemedi |
| `131047` | 24h penceresi kapalı — şablon kullanın |
| `131048` | Spam politikası ihlali |
| `131051` | Mesaj tipi desteklenmiyor |
| `131052` | Medya indirme hatası |
| `131053` | Medya yükleme hatası |
| `132000` | Şablon parametre sayısı uyuşmuyor |
| `132001` | Şablon dili mevcut değil |
| `132005` | Şablon güncellenmiş, yeniden sync edin |
| `132007` | Şablon karakter sınırı aşıldı |
| `132012` | Şablon parametre formatı geçersiz |
| `132015` | Şablon askıya alınmış (kalite/rate) |
| `133010` | Telefon numarası kayıtlı değil |
| `133011` | Numara kalite eşiğini geçemedi |

## Şablon Hata Subcode'ları

Şablon oluştururken `meta_subcode` görebilirsiniz:

| Subcode | Açıklama |
|---|---|
| `2388043` | Aynı isimde şablon var |
| `2388044` | Şablon adı geçersiz (sadece a-z, 0-9, _) |
| `2388045` | Kategori içerikle uyumsuz |
| `2388046` | Şablon dili desteklenmiyor |
| `2388047` | Body 3+ ardışık boş satır içeriyor |
| `2388048` | Buton yapısı hatalı |
| `2388049` | Header medyası yüklenemedi |
| `2388050` | Parametre sıralaması hatalı |
| `2388051` | Ödeme yöntemi gerekli |

## Tipik Çözümler

### 401 `invalid_api_key`
```bash
# Key'in başlangıcı doğru mu?
echo "vmk_live_xxx" | grep -E "^vmk_(live|test)_"
```

### 422 `not_in_24h_window`
Müşteri son 24 saatte mesaj atmadıysa **şablon** kullanın:
```json
{ "type": "template", "template": { "name": "...", "language": {"code":"tr"}, ... } }
```

### 429 `rate_limited`
`Retry-After` header'ı kadar bekleyin, sonra tekrar deneyin. SDK kullanıyorsanız bu otomatiktir.

### 422 `template_not_approved`
Panel → WhatsApp → Şablonlar → şablon durumunu kontrol edin. `PENDING` ise Meta onayı bekliyor (genelde 5–30 dakika).

### 422 `invalid_phone`
Numarayı E.164 formatına çevirin: `905551234567` (başında + olmadan).

## Loglama Önerisi

Üretim sisteminizde her hatayı şu alanlarla loglayın:

```json
{
  "timestamp": "2026-05-30T13:45:00Z",
  "request_id": "req_abc123",
  "endpoint": "POST /wa/messages",
  "http_status": 422,
  "error_code": "not_in_24h_window",
  "meta_code": 131047,
  "user_action": "Tried to send text outside 24h window",
  "retry_strategy": "Switch to template"
}
```

`X-Request-Id` header'ı yanıtın içinde döner; destek talebi açarken bu ID'yi belirtin.
