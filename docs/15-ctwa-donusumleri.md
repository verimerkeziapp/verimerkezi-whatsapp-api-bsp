# 15 · CTWA Dönüşümleri (Conversions API for Business Messaging)

Click-to-WhatsApp (CTWA) reklamlarından gelen satış/dönüşümleri Meta'ya bildirir. Müşteri bir reklama ya da gönderiye tıklayıp sohbeti başlattığında Meta, ilk gelen mesajın `referral` nesnesinde `ctwa_clid` gönderir ([06-webhooks.md](06-webhooks.md), v2.33.0); Veri Merkezi bunu **kişi bazında saklar**. Satış gerçekleşince `POST /wa/conversions` ile `Purchase` (ya da başka) olayı iletilir; `ctwa_clid` vermezseniz ilgili müşteri (`to`) için yakalanmış son tıklama kullanılır.

- **Scope'lar:** `conversions:write` (bildirim) · `conversions:read` (liste, tıklama sorgusu).
- **Meta izni:** İletim için numaranın Meta erişim anahtarında `whatsapp_business_manage_events` izni gerekir; yoksa `403 manage_events_permission_required`.
- **Tekilleştirme:** Olaylar `event_id` ile tekilleştirilir (Meta tekilleştirmez).
- **Meta tarafı:** Olay `action_source: business_messaging`, `messaging_channel: whatsapp` ve `user_data.ctwa_clid` ile iletilir; dataset WABA başına otomatik oluşturulur.

## Uçlar

| Yöntem | Yol | Scope | Açıklama |
|---|---|---|---|
| `POST` | `/wa/conversions` | `conversions:write` | Dönüşüm (satış) bildir |
| `GET` | `/wa/conversions` | `conversions:read` | İletilen dönüşümler |
| `GET` | `/wa/conversions/click` | `conversions:read` | Kişi için yakalanmış son reklam tıklaması (`ctwa_clid` + reklam bilgisi) |

## Dönüşüm bildir — `POST /wa/conversions`

| Alan | Tip | Açıklama |
|---|---|---|
| `phone_number_id` | string, **zorunlu** | Dönüşümün ilişkili olduğu numara (yalnız rakam) |
| `event_name` | string | Varsayılan `Purchase` |
| `to` | string | Müşteri numarası. `ctwa_clid` verilmezse bu numara için yakalanmış son tıklama kullanılır |
| `ctwa_clid` | string | Reklam tıklaması kimliği. Verilirse `to` araması yapılmaz |
| `value` | number | Satış tutarı. Gönderilirse `currency` zorunludur |
| `currency` | string | ISO 4217 (3 harf), ör. `TRY` |
| `event_time` | integer | Unix zaman damgası (saniye). Varsayılan şimdi |
| `event_id` | string | Tekilleştirme kimliği. Verilmezse `order_id`, o da yoksa türetilir |
| `order_id` | string | Sipariş kimliği (`event_id` yoksa tekilleştirmede kullanılır) |
| `custom_data` | object | Meta olayına eklenecek ek alanlar |

```bash
curl -X POST "https://api.verimerkezi.app/wa/conversions" \
 -H "Authorization: Bearer $VM_API_KEY" \
 -H "Content-Type: application/json" \
 -d '{
 "phone_number_id": "1234567890",
 "event_name": "Purchase",
 "value": 1990,
 "currency": "TRY",
 "to": "905550000000",
 "order_id": "SIP-2026-0001"
 }'
```

```json
{
 "ok": true,
 "event_id": "SIP-2026-0001",
 "event_name": "Purchase",
 "dataset_id": "1111111111111111",
 "events_received": 1,
 "duplicate": false,
 "ctwa_clid": "ARAb1C…k9Qd"
}
```

- Aynı `event_id` yeniden gönderilirse olay tekrar iletilmez (`duplicate: true`).
- Yanıttaki `ctwa_clid` kısmen maskelenir.

**Hatalar:**

| Kod | HTTP | Anlamı |
|---|---|---|
| `insufficient_scope` | 403 | Anahtarda `conversions:write` yok |
| `manage_events_permission_required` | 403 | Numaranın Meta anahtarında `whatsapp_business_manage_events` izni yok |
| `number_not_found` | 404 | `phone_number_id` hesabınızda aktif değil |
| `ctwa_clid_required` | 422 | `ctwa_clid` verilmedi ve `to` için yakalanmış tıklama yok |
| `currency_required` | 422 | `value` var ama `currency` yok |
| `invalid_event_name` | 422 | `event_name` geçersiz |
| `conversion_failed` | 502 | Meta olayı kabul etmedi (ayrıntı `message`'da) |

## İletilen dönüşümler — `GET /wa/conversions`

`limit`: 1–100 (varsayılan 25).

```json
{
 "ok": true,
 "conversions": [
 {
 "event_id": "SIP-2026-0001",
 "event_name": "Purchase",
 "phone_number_id": "1234567890",
 "ctwa_clid": "ARAb1C…k9Qd",
 "value": 1990,
 "currency": "TRY",
 "dataset_id": "1111111111111111",
 "status": "sent",
 "error": null,
 "created_at": "2026-11-13 15:55:46"
 }
 ]
}
```

## Yakalanmış tıklama — `GET /wa/conversions/click`

Dönüşümü kendi sisteminizden Meta'ya iletecekseniz tam `ctwa_clid`'i buradan alırsınız. Parametreler: `phone_number_id` ve `to` (ikisi de zorunlu). Tıklamalar **7 gün** boyunca tutulur.

```json
{
 "ok": true,
 "found": true,
 "ctwa_clid": "ARAb1CdEf…xyz0k9Qd",
 "source_id": "120210000000000000",
 "source_type": "ad",
 "headline": "Hemen keşfet",
 "received_at": "2026-11-13 14:02:10"
}
```

**Hatalar:** `403 insufficient_scope` · `404 number_not_found` · `422 invalid_request` (`phone_number_id` ve `to` zorunlu).

## SDK

| Node.js | PHP | Python |
|---|---|---|
| `sendConversion` | `sendConversion` | `send_conversion` |
| `listConversions` | `listConversions` | `list_conversions` |
| `getCtwaClick` | `ctwaClick` | `ctwa_click` |
