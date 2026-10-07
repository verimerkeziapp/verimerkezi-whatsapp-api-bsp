# 13 · Formlar (WhatsApp Flows)

WhatsApp içinde açılan çok ekranlı formlar (başvuru, randevu, anket, iletişim). Form tasarımı Meta'nın **Flow JSON** biçimindedir; müşteri formu gönderdiğinde yanıt `flow.completed` olayıyla gelir.

- Formlar işletme hesabı (WABA) düzeyindedir: `phone_number_id` ile numaranızın WABA'sı seçilir.
- **Gerekli scope'lar:** `flows:read` · `flows:write`.
- **Ücret:** form yönetimi kredisizdir; form mesajı normal mesaj gibi **1 kredi**.
- **Kapsam:** **statik** formlar desteklenir. Meta'nın Endpoint (`data_exchange`) özelliğini kullanan formlarda şifreli Endpoint trafiğini Veri Merkezi karşılamaz; bu trafiği kendi sunucunuz karşılamalıdır.

## Akış

1. `POST /wa/flows` — form oluşturulur (`DRAFT`), Meta doğrulama hataları `validation_errors`'ta döner.
2. Hataları düzeltin: `PUT /wa/flows/{flow_id}/json` (yalnız `DRAFT`).
3. Taslağı kendinize gönderip deneyin: `POST /wa/messages` + `"mode": "draft"`.
4. `POST /wa/flows/{flow_id}/publish` — yayınlanan form değiştirilemez (yeni sürüm için yeni form oluşturun).
5. Müşteriye gönderin (serbest mesaj ya da FLOW butonlu şablon) → `flow.completed`.

## Uçlar

| Yöntem | Yol | Scope | Açıklama |
|---|---|---|---|
| `POST` | `/wa/flows` | `flows:write` | Form oluştur (`DRAFT`; `Idempotency-Key` desteklenir) |
| `GET` | `/wa/flows` | `flows:read` | Formları listele (`phone_number_id`, `limit`) |
| `GET` | `/wa/flows/{flow_id}` | `flows:read` | Form ayrıntısı |
| `PUT` | `/wa/flows/{flow_id}/json` | `flows:write` | Flow JSON güncelle (yalnız `DRAFT`) |
| `POST` | `/wa/flows/{flow_id}/publish` | `flows:write` | Yayınla |
| `POST` | `/wa/flows/{flow_id}/deprecate` | `flows:write` | Kullanımdan kaldır |
| `DELETE` | `/wa/flows/{flow_id}` | `flows:write` | Sil (yalnız `DRAFT`) |
| `GET` | `/wa/flows/{flow_id}/preview` | `flows:read` | Önizleme bağlantısı (`?invalidate=true` yeni bağlantı üretir) |
| `GET` | `/wa/flows/{flow_id}/metrics` | `flows:read` | Metrikler (yalnız Endpoint'li formlar) |

## Form oluşturma

```http
POST /wa/flows
Idempotency-Key: 5b0f...
{
 "phone_number_id": "1234567890",
 "name": "Kredi başvurusu",
 "categories": ["LEAD_GENERATION"],
 "flow_json": { "version": "7.2", "screens": [ ... ] }
}
→ 201 { "ok": true, "flow_id": "1234567890123456", "status": "DRAFT", "validation_errors": [] }
```

- `categories`: `SIGN_UP`, `SIGN_IN`, `APPOINTMENT_BOOKING`, `LEAD_GENERATION`, `CONTACT_US`, `CUSTOMER_SUPPORT`, `SURVEY`, `OTHER` (en az bir).
- `flow_json` nesne ya da JSON metni olabilir (en fazla 10 MB).
- İsteğe bağlı `endpoint_uri` (https) — yalnız Meta'nın Endpoint özelliği için; bkz. yukarıdaki **Kapsam** notu.

## Hazır örnek: Teklif formu

Tek ekranlı statik form: ad soyad ve sigorta türü sorar, "Gönder" ile tamamlanır. Canlıda gerçek bir numaraya gönderilip doldurulmuş ve yanıtı `flow.completed` ile alınmıştır.

Dosya: [examples/flows/teklif-formu.flow.json](../examples/flows/teklif-formu.flow.json)

```http
POST /wa/flows
{
 "phone_number_id": "1234567890",
 "name": "Teklif formu",
 "categories": ["LEAD_GENERATION"],
 "flow_json": { ...teklif-formu.flow.json içeriği... }
}

POST /wa/flows/{flow_id}/publish

POST /wa/messages
{
 "phone_number_id": "1234567890",
 "to": "905550000000",
 "type": "flow",
 "flow": { "flow_id": "{flow_id}", "cta": "Formu aç", "body": "Teklif için formu doldurun.", "screen": "TEKLIF", "mode": "published" }
}
```

`flow.completed` olayında `data.response`:

```json
{ "flow_token": "vmf_…", "ad": "Ayşe Yılmaz", "brans": "trafik" }
```

## Güncelleme, yayın, silme

```http
PUT    /wa/flows/1234567890123456/json        { "flow_json": { ... } }
→ { "ok": true, "flow_id": "1234567890123456", "validation_errors": [ { "error": "INVALID_PROPERTY_VALUE", "message": "...", "line_start": 12 } ] }
POST   /wa/flows/1234567890123456/publish     → { "ok": true, "flow_id": "...", "status": "PUBLISHED" }
POST   /wa/flows/1234567890123456/deprecate   → { "ok": true, "flow_id": "...", "status": "DEPRECATED" }
DELETE /wa/flows/1234567890123456             → { "ok": true, "flow_id": "...", "deleted": true }   (yalnız DRAFT)
```

## Ayrıntı, liste, önizleme, metrik

```http
GET /wa/flows?phone_number_id=1234567890&limit=25
→ { "ok": true, "phone_number_id": "1234567890", "waba_id": "1029384756",
 "flows": [ { "flow_id": "1234567890123456", "name": "Kredi başvurusu", "status": "PUBLISHED", "categories": ["LEAD_GENERATION"], "validation_errors": [] } ],
 "paging": { "after": "QVFIU..." } }

GET /wa/flows/1234567890123456
→ { "ok": true, "flow_id": "1234567890123456", "name": "Kredi başvurusu", "status": "PUBLISHED",
 "categories": ["LEAD_GENERATION"], "validation_errors": [], "health_status": { "can_send_message": "AVAILABLE" },
 "json_version": "7.2", "data_api_version": null, "endpoint_uri": null }

GET /wa/flows/1234567890123456/preview
→ { "ok": true, "flow_id": "1234567890123456", "preview_url": "https://business.facebook.com/wa/manage/flows/.../preview/?token=...", "expires_at": "2026-11-07T10:00:00+0000" }

GET /wa/flows/1234567890123456/metrics?from=2026-10-01&to=2026-10-07&metric=ENDPOINT_REQUEST_COUNT&granularity=DAY
→ { "ok": true, "flow_id": "...", "from": "2026-10-01", "to": "2026-10-07", "metric": { "...": "Meta yanıtı aynen" } }
```

- `status`: `DRAFT` · `PUBLISHED` · `DEPRECATED` · `BLOCKED` · `THROTTLED`.
- WhatsApp Manager'da oluşturduğunuz formlar `GET /wa/flows` ile ya da `{flow_id}` uçlarına `?phone_number_id=` eklenerek hesabınıza bağlanır.
- Metrikler (`ENDPOINT_REQUEST_COUNT`, `ENDPOINT_REQUEST_ERROR`, `ENDPOINT_REQUEST_ERROR_RATE`, `ENDPOINT_REQUEST_LATENCY_SECONDS_CEIL`, `ENDPOINT_AVAILABILITY`) yalnız Endpoint'li formlar içindir; `granularity`: `DAY` · `HOUR` · `LIFETIME`. Varsayılan aralık son 7 gün.

## Gönderim — `POST /wa/messages` `type: "flow"`

| Alan | Açıklama |
|---|---|
| `flow.flow_id` / `flow.flow_name` | Yalnız biri |
| `flow.flow_token` | Sizin eşleştirme anahtarınız (≤ 191 bayt). Verilmezse üretilir ve yanıtta `flow.flow_token` olarak döner; `flow.completed`'da aynen gelir |
| `flow.cta` | Buton metni, en fazla 20 karakter, emoji yok |
| `flow.body` · `flow.header` · `flow.footer` | Gövde zorunlu (≤ 1024); başlık / alt bilgi isteğe bağlı (≤ 60) |
| `flow.mode` | `published` (varsayılan) · `draft` (yayınlanmamış formu denemek için) |
| `flow.action` | `navigate` (varsayılan) · `data_exchange` (yalnız Endpoint'li formlar) |
| `flow.screen` · `flow.data` | `navigate`'te açılış ekranı (zorunlu) ve ekrana verilecek başlangıç verisi (nesne) |

```json
{ "ok": true, "id": 42, "wamid": "wamid.HBgM...", "to": "905551234567", "type": "flow", "status": "sent",
 "mode": "live", "credits_used": 1, "balance": 4999,
 "flow": { "flow_token": "crm-basvuru-42", "flow_id": "1234567890123456", "flow_name": null, "mode": "published" } }
```

> 24 saatlik pencere kapalıyken serbest form mesajı Meta tarafından reddedilir (`422 meta_send_failed`, `meta_code: 131047`) — bu durumda FLOW butonlu şablon kullanın.

### Şablonla gönderim (FLOW butonu)

Şablonu `POST /wa/templates` ile FLOW butonuyla oluşturun ([04-templates.md](04-templates.md)). Gönderirken buton parametresi:

```json
"template": {
 "name": "basvuru_formu", "language": "tr",
 "components": [
 { "type": "button", "sub_type": "flow", "index": 0,
 "parameters": [ { "type": "action", "flow_token": "crm-basvuru-42", "flow_action_data": { "ad": "Ahmet" } } ] }
 ]
}
```

Meta'nın kendi biçimi (`{"type":"action","action":{"flow_token":...}}`) de kabul edilir. `flow_token` ve `flow_action_data` isteğe bağlıdır.

## Yanıt — `flow.completed`

Müşteri formu gönderdiğinde (Meta `interactive.nfm_reply`) gelir. Aynı mesaj ayrıca `message.received` (`type: interactive`) olarak da gelir; form yanıtı otomasyonları tetiklemez. Formdaki fotoğraf/belge alanları sunucumuzda indirilir ve **`GET /wa/media/{media_id}`** ile alınır (Meta bu dosyaları en fazla 20 gün tutar).

```json
{
 "event": "flow.completed",
 "event_id": "0192...",
 "data": {
 "event_id": "flow_7f3c...",
 "phone_number_id": "1234567890",
 "from": "905551234567",
 "user_id": null,
 "contact_name": "Ahmet",
 "message_id": "wamid.HBgM...",
 "context_message_id": "wamid.HBgL...",
 "flow_token": "crm-basvuru-42",
 "flow_id": "1234567890123456",
 "response": { "flow_token": "crm-basvuru-42", "ad": "Ahmet", "kimlik_foto": [ { "file_name": "IMG_0001.jpg", "mime_type": "image/jpeg", "sha256": "...", "id": "1111111111111111" } ] },
 "response_raw": null,
 "media": [ { "field": "kimlik_foto", "media_id": 13120, "mime_type": "image/jpeg", "sha256": "9f2c...", "file_name": "IMG_0001.jpg", "meta_media_id": "1111111111111111" } ],
 "timestamp": "1760000000"
 }
}
```

- `response`: Meta'nın `response_json`'u ayrıştırılmış hâliyle (alan adları form tasarımınızdan gelir). JSON çözülemezse `response: {}` ve ham metin `response_raw`'da.
- `data.event_id` aynı yanıt için sabittir (tekilleştirme). `flow_id` yalnız formu bu API'den gönderdiyseniz dolar; aksi hâlde `null`.
- `media[].media_id` bizim depo kimliğimizdir; indirme başarısızsa `null` + `"error": "media_download_failed"`. `sha256` indirilen dosyanın onaltılık özetidir.

## Durum değişimi — `flow.status_changed`

```json
{ "event": "flow.status_changed",
 "data": { "flow_id": "1234567890123456", "waba_id": "1029384756", "old_status": "PUBLISHED", "new_status": "THROTTLED",
 "reason": "Flow Webhook Status Change", "occurred_at": "2026-10-08T12:00:00+03:00" } }
```

Meta formu yayınladığında, kısıtladığında (`THROTTLED`), engellediğinde (`BLOCKED`) ya da kaldırdığında gelir. Endpoint hata/gecikme uyarıları şimdilik iletilmez.

> `flow.completed` ve `flow.status_changed` **`*` joker aboneliğine dahil değildir**; abonelikte açıkça ekleyin.

## Hata kodları

| Kod | HTTP | Anlamı |
|---|---|---|
| `invalid_flow` | 422 | `POST /messages` `flow` nesnesi hatalı (`error.field`) |
| `invalid_flow_json` | 422 | `flow_json` geçerli bir JSON nesnesi değil / 10 MB'ı aşıyor |
| `invalid_template_flow_button` | 422 | Şablon FLOW buton parametresi hatalı |
| `flow_not_found` | 404 | Form yok / size ait değil (Meta'da oluşturduysanız `phone_number_id` ekleyin) |
| `flow_not_draft` | 409 | JSON güncelleme ve silme yalnız `DRAFT` formda |
| `meta_flow_failed` | 422 | Meta isteği reddetti (ör. doğrulama hatası olan form yayınlanamaz) |
| `meta_outcome_unknown` | 409 | Meta'ya iletildi, sonuç belirsiz — tekrar göndermeyin, `GET /wa/flows` ile kontrol edin |
| `test_mode_unsupported` | 403 | Yazma uçları test anahtarıyla çalışmaz (okuma uçları ve `POST /messages` simülasyonu çalışır) |
