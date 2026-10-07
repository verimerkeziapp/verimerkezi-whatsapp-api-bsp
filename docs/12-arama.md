# 12 · Arama (Calling)

WhatsApp Cloud API ile müşterilerinizden **sesli arama alabilir** ve izin veren müşterileri **arayabilirsiniz**. Ses, tarayıcınızdaki / uygulamanızdaki **WebRTC** ucu ile Meta arasında doğrudan akar; Veri Merkezi yalnızca sinyal verisini (SDP) iletir, sesi taşımaz veya kaydetmez.

**Gerekli scope'lar:** `calls:read` (ayarları, izin durumunu ve geçmişi okuma) · `calls:write` (ayar değiştirme, arama başlatma / yanıtlama, izin isteme).

## Önkoşullar

- Numara Cloud API ile bağlı ve `active` olmalı.
- Numaranın mesajlaşma limiti en az **2.000** olmalı (`GET /wa/numbers/{id}/calling` → `messaging_limit_ok`).
- Meta uygulamasında `calls` webhook alanı abone olmalı (Veri Merkezi tarafında açılır).
- Arama numara bazında açılır: `PATCH /wa/numbers/{id}/calling` ile `"enabled": true`.

## Uçlar

| Yöntem | Yol | Scope | Açıklama |
|---|---|---|---|
| `GET` | `/wa/numbers/{phone_number_id}/calling` | `calls:read` | Arama ayarları ve uygunluk (`?raw=1` Meta'nın ham `calling` nesnesini ekler) |
| `PATCH` | `/wa/numbers/{phone_number_id}/calling` | `calls:write` | Arama ayarlarını güncelle (yalnız gönderilen alanlar değişir) |
| `POST` | `/wa/calls` | `calls:write` | İşletme başlatmalı arama (`Idempotency-Key` desteklenir) |
| `POST` | `/wa/calls/{call_id}/pre_accept` | `calls:write` | Gelen aramada bağlantıyı önceden kur |
| `POST` | `/wa/calls/{call_id}/accept` | `calls:write` | Gelen aramayı kabul et |
| `POST` | `/wa/calls/{call_id}/reject` | `calls:write` | Gelen aramayı reddet |
| `POST` | `/wa/calls/{call_id}/terminate` | `calls:write` | Aramayı sonlandır |
| `POST` | `/wa/calls/permission-request` | `calls:write` | Müşteriden arama izni iste (1 mesaj kredisi) |
| `GET` | `/wa/calls/permission` | `calls:read` | Bir kişinin arama izni durumu |
| `GET` | `/wa/calls` | `calls:read` | Arama geçmişi |

## Arama ayarları

```http
PATCH /wa/numbers/1234567890/calling
{
 "enabled": true,
 "callback_permission": true,
 "call_icon_visibility": "DEFAULT",
 "call_hours": {
 "status": "ENABLED",
 "timezone_id": "Europe/Istanbul",
 "weekly_operating_hours": [
 { "day_of_week": "MONDAY", "open_time": "0900", "close_time": "1800" }
 ]
 }
}
```

```json
{ "ok": true, "updated": true, "phone_number_id": "1234567890", "enabled": true,
 "callback_permission": true, "call_icon_visibility": "DEFAULT", "call_hours": { "...": "..." },
 "messaging_limit_tier": "TIER_2K", "messaging_limit_ok": true }
```

- `callback_permission` açıkken müşteri sizi aradığında WhatsApp ona geri arama izni vermeyi önerir.
- `call_icon_visibility`: `DEFAULT` (sohbette arama simgesi görünür) · `DISABLE_ALL` (gizli).
- `GET` aynı yolda güncel durumu döndürür.

## Gelen arama (müşteri sizi arar)

1. `call.connect` olayı gelir: `direction: "user_initiated"`, `sdp_offer` dolu.
2. WebRTC ucunuzda offer'ı uygulayıp answer üretin; isteğe bağlı `pre_accept` ile bağlantıyı önceden kurun, sonra `accept`.
3. Görüşme bitince `call.terminate` gelir. Açmazsanız arama `missed` olur.

```http
POST /wa/calls/wacid.HBgL.../pre_accept   { "sdp_answer": "v=0\r\n..." }
POST /wa/calls/wacid.HBgL.../accept       { "sdp_answer": "v=0\r\n..." }
→ { "ok": true, "call_id": "wacid.HBgL...", "action": "accept", "success": true }
POST /wa/calls/wacid.HBgL.../reject       {}
POST /wa/calls/wacid.HBgL.../terminate    {}
```

- Her eylem **(call_id, eylem)** bazında idempotenttir: aynı eylemi tekrar gönderirseniz ilk sonuç aynen döner (`Idempotent-Replay: true`). Aynı eylem farklı SDP ile gelirse `409 call_action_conflict`.
- `call_id`'yi URL-kodlayın; içinde `/` varsa yol yerine `_` yazıp gövdede `"call_id"` gönderin.

## İşletme başlatmalı arama (müşteriyi arama)

Müşterinin **arama izni** olmalı (aşağıya bakın). `Idempotency-Key` desteklenir.

```http
POST /wa/calls
Idempotency-Key: 7d3c1c2e-...
{ "phone_number_id": "1234567890", "to": "905551112233",
 "sdp_offer": "v=0\r\n...", "biz_opaque": "crm-ticket-42" }
```

```json
{ "ok": true, "call_id": "wacid.HBgL...", "status": "initiated", "direction": "business_initiated", "to": "905551112233" }
```

Ardından `call.status` (`ringing` → `accepted` / `rejected`) ve Meta'nın answer'ı ile `call.connect` (`sdp_answer`) gelir. Kapatmak için `POST /wa/calls/{call_id}/terminate`. Bu aramalarda yalnız `terminate` kullanılabilir.

> **Ülke kısıtı:** Meta, işletme başlatmalı aramayı bazı ülkelerde sunmaz (Meta'nın listesi değişebilir; ör. ABD, Kanada, Mısır, Vietnam, Nijerya). Bu durumda `422 calling_not_available_in_country` döner. Hedef ülkenizde kullanılabilirliği ilk gerçek aramayla doğrulayın.

## Arama izni

```http
POST /wa/calls/permission-request
{ "phone_number_id": "1234567890", "to": "905551112233", "body": "Siparişiniz hakkında sizi arayabilir miyiz?" }
→ 201 { "ok": true, "message_id": "wamid.HBgM...", "to": "905551112233", "credits_consumed": 1, "balance": 4999 }

GET /wa/calls/permission?phone_number_id=1234567890&to=905551112233
→ { "ok": true, "status": "temporary", "expires_at": "2026-10-15T10:00:00+03:00",
 "can_request": false, "can_call": true, "actions": [ ... ] }
```

- Yanıt `call.permission_reply` olayıyla gelir (`granted`, `permanent`, `expires_at`).
- `status`: `no_permission` · `temporary` (7 gün) · `permanent`.
- Aynı kişiye en fazla **24 saatte 1**, **7 günde 2** izin isteği. Serbest metinli istek yalnız 24 saatlik pencere açıkken gider.
- Art arda **4 cevapsız** işletme araması kalıcı izni bile geri alır.

## Arama geçmişi

Süzgeçler: `phone_number_id`, `from` / `to` (ISO 8601 tarih aralığı), `peer` (karşı taraf numarası), `limit` (1–100, varsayılan 50), `cursor`. Yeniden eskiye sıralı.

```http
GET /wa/calls?phone_number_id=1234567890&from=2026-10-01T00:00:00%2B03:00&limit=20
```

```json
{ "ok": true, "calls": [ { "call_id": "wacid...", "direction": "user_initiated", "from": "905551112233",
 "to": "908500000000", "status": "completed", "started_at": "...", "ended_at": "...",
 "duration_sec": 74, "billable_pulses": null, "last_action": "accept", "errors": null } ],
 "has_more": false, "next_cursor": null }
```

`status` değerleri: `initiated` · `ringing` · `pre_accepted` · `accepted` · `terminating` · `rejected` · `missed` · `failed` · `completed`.

## Webhook olayları

`call.connect`, `call.status`, `call.terminate`, `call.permission_reply` — **`*` joker aboneliğine dahil değildir**; abonelikte açıkça ekleyin. Alanlar için bkz. [06-webhooks.md](06-webhooks.md).

## Ücretlendirme

- Müşterinin sizi araması **ücretsizdir**.
- Sizin başlattığınız aramaları **Meta 6 saniyelik dilimlerle doğrudan** faturalar; Veri Merkezi arama için **ücret veya mesaj kredisi almaz**.
- Yalnız **izin isteği** normal mesaj gibi **1 mesaj kredisi** düşer (başarısızsa iade edilir; yetersizse `402 insufficient_credits`).
- `billable_pulses` = ⌈süre / 6⌉ yalnızca bilgi amaçlıdır.

## Gizlilik (SDP + KVKK)

- SDP (IP/ICE bilgisi) `call.connect` olayının **ilk teslimatında tam** gider; teslimat başarılı olunca, en geç 1 saat sonra kayıtlarda `"[sdp N bytes]"` olarak maskelenir. Bu yüzden `/wa/webhooks/redeliver` ile yeniden gönderilen `call.connect`'te SDP yoktur — SDP'yi ilk teslimatta işleyin.
- Kişisel veri silme talebinde arama kayıtlarındaki kişi numarası da silinir; süre / durum bilgisi anonim kalır.
- Arama kayıtları, hesabınızın mesaj saklama süresi dolunca silinir.

## Hata kodları

| Kod | HTTP | Anlamı |
|---|---|---|
| `call_permission_required` | 403 | Müşterinin arama izni yok |
| `calling_not_enabled` | 409 | Numarada arama kapalı |
| `calling_not_available_in_country` | 422 | Alıcının ülkesinde işletme araması yok |
| `call_not_found` | 404 | Arama yok / size ait değil / test-canlı anahtar uyuşmuyor |
| `call_ended` | 409 | Arama sona ermiş |
| `invalid_action_for_direction` | 409 | Başlattığınız aramada yalnız `terminate` |
| `call_action_conflict` · `action_in_progress` | 409 | Aynı eylem farklı parametreyle uygulanmış / hâlâ işleniyor |
| `permission_request_limited` · `call_rate_limited` | 429 | İzin isteği / arama sınırı |
| `invalid_sdp` | 422 | SDP boş veya geçersiz |
| `meta_outcome_unknown` | 409 | Meta'ya iletildi, sonuç belirsiz — tekrar göndermeyin, `call.*` olayını bekleyin |
| `insufficient_credits` | 402 | İzin isteği için mesaj kredisi yetersiz |

> Test anahtarı (`vmk_test_`) ile tüm arama eylemleri Meta'ya gitmeden simüle edilir (`"simulated": true`).

## SDK

| Node.js | PHP | Python |
|---|---|---|
| `getCallingSettings` / `updateCallingSettings` | aynı adlar | `get_calling_settings` / `update_calling_settings` |
| `startCall` | `startCall` | `start_call` |
| `preAcceptCall` / `acceptCall` / `rejectCall` / `terminateCall` | aynı adlar | `pre_accept_call` / `accept_call` / `reject_call` / `terminate_call` |
| `requestCallPermission` / `getCallPermission` | aynı adlar | `request_call_permission` / `get_call_permission` |
| `listCalls` | `listCalls` | `list_calls` |
