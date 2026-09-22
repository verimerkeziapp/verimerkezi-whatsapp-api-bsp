# 11 · Gelişmiş: Yükleme, Uzlaştırma, Geçmiş, Numara Ayarları, Sağlık

Bu bölüm 22 Eylül 2026'da eklenen uçları kapsar. Hepsi mevcut sözleşmeyle uyumludur; var olan davranış değişmez.

---

## Alıntılı cevap (reply)

Herhangi bir `POST /wa/messages` isteğine `context` ekleyerek belirli bir mesaja yanıt verirsiniz; alıcıda mesaj alıntı balonuyla görünür.

```json
{
  "phone_number_id": "1234567890",
  "to": "905551112233",
  "type": "text",
  "text": "Tabii, hemen yardımcı olayım.",
  "context": { "message_id": "wamid.HBgL...(cevaplanan mesaj)" }
}
```

- `context.message_id` — cevapladığınız mesajın `wamid`'i (webhook'tan gelen `data.wamid`).
- **Tepki (`type: reaction`) mesajı alıntılı gönderilemez** (birlikte gönderilirse `422 invalid_request`).
- Meta, alıntılanan mesaj 30 günden eskiyse ya da şablonla yanıt verilirse alıntı balonunu göstermeyebilir.

---

## Dosya yükleme — `POST /wa/media`

Panelden/uygulamanızdan gelen bir dosyayı **herkese açık bir URL'de yayınlamadan** doğrudan Meta'ya yükleyip bir `media_id` alırsınız (KVKK dostu). Dönen kimlik **30 gün** geçerlidir ve `POST /wa/messages` içinde `{type}.id` olarak kullanılır.

> Bu `media_id`, gelen medyayı indirdiğiniz [`GET /wa/media/{id}`](10-media.md) depo kimliğinden **farklıdır**. Bu uç Meta'nın media id'sini üretir (giden gönderim için); o uç sizin deponuzdaki dosyayı indirir (gelen için).

```
POST https://api.verimerkezi.app/wa/media
Authorization: Bearer vmk_live_...
Content-Type: multipart/form-data
```

| Alan | Açıklama |
|---|---|
| `file` | Yüklenecek dosya (multipart) |
| `phone_number_id` | Hangi numaranız için (aynı WABA'da geçerli olur) |

```bash
curl -X POST https://api.verimerkezi.app/wa/media \
  -H "Authorization: Bearer $VM_API_KEY" \
  -F "phone_number_id=1234567890" \
  -F "file=@police.pdf"
```

```json
{
  "media_id": "1075907555339682",
  "type": "document",
  "mime_type": "application/pdf",
  "file_size": 183421,
  "phone_number_id": "1234567890",
  "expires_at": "2026-10-22T09:00:00Z",
  "mode": "live"
}
```

Ardından gönderim:

```json
{ "phone_number_id": "1234567890", "to": "905551112233", "type": "document",
  "document": { "id": "1075907555339682", "filename": "police.pdf" } }
```

**Boyut ve tür sınırları (Meta ile aynı):** görsel (jpeg/png) 5 MB · çıkartma (webp) 500 KB · video (mp4/3gpp) 16 MB · ses (aac/amr/mp3/mp4/ogg) 16 MB · belge (pdf/doc/docx/xls/xlsx/ppt/pptx/txt) 100 MB. Dosyanın gerçek içeriği doğrulanır; uzantısı yanıltıcıysa `415 media_invalid_format` döner. Bu uç **medya hız kovasında** (dakikada 60) sayılır. `vmk_test_` anahtarıyla Meta'ya gidilmez, `"mode":"test"` simülasyon yanıtı döner.

---

## Uzlaştırma — kaçan olayları geri alma

Webhook teslimi kaçarsa (sunucunuz bakımdaysa, ağ koptuysa) mesajları geri almak için iki yol vardır.

### `GET /wa/messages` — mesaj kayıtları

```
GET https://api.verimerkezi.app/wa/messages
  ?phone_number_id=1234567890&since=2026-09-22T00:00:00Z&cursor=0&limit=100
```

| Parametre | Açıklama |
|---|---|
| `phone_number_id` | zorunlu |
| `since` | ISO 8601; en fazla 90 gün geriye |
| `cursor` | sayfalama (yanıttaki `next_cursor`) |
| `limit` | 1–100 (varsayılan 50) |

Yanıt, `message.received` / `message.echo` / giden mesaj biçimindeki kayıtları **zamana göre artan** döndürür:

```json
{
  "phone_number_id": "1234567890",
  "data": [
    { "id": 248117, "wamid": "wamid...", "direction": "inbound", "type": "text",
      "status": "received", "from": "905551112233", "to": null, "user_id": null,
      "text": "Merhaba", "media": null, "created_at": "2026-09-22T10:00:00+03:00",
      "context": null, "reaction": null, "location": null, "original_message_id": null }
  ],
  "has_more": true,
  "next_cursor": 248117
}
```

Bu uç **okumadır** — kredi düşmez ve mesaj gönderim kotanızı tüketmez. Gerekli scope: `messages:read` veya `inbox:read`.

### `POST /wa/webhooks/redeliver` — dead-letter yeniden teslim

7 denemeden sonra "dead-letter"a düşen kendi teslimatlarınızı yeniden kuyruğa alır.

```http
POST /wa/webhooks/redeliver
{ "since": "2026-09-22T00:00:00Z" }

→ { "requeued": 12, "since": "2026-09-22T00:00:00Z", "note": "..." }
```

`since` en fazla son 7 günü kapsar. Olaylar dakikalık teslimat turunda yeniden gönderilir.

---

## Coexistence geçmiş aktarımı

WhatsApp Business uygulamasıyla birlikte (coexistence) bağlanan bir numarada Meta, son **180 güne** kadar olan yazışmaları aktarabilir. Veri Merkezi bunu numara bağlanır bağlanmaz **otomatik** başlatır (Meta yalnızca bağlantıdan sonraki **24 saat** içinde ve **bir kez** izin verir).

### `message.history` webhook olayı

Her geçmiş mesajı bu olayla gelir (normal mesaj alanlarına ek olarak):

```json
{
  "event": "message.history",
  "data": {
    "wamid": "wamid...", "history": true, "direction": "inbound",
    "from": "905551112233", "to": null, "thread_id": "905551112233",
    "type": "text", "text": "Eski mesaj", "media": null, "status": "READ",
    "timestamp": "1774000000", "phase": 1, "chunk_order": 3, "progress": 45,
    "phone_number_id": "1234567890"
  }
}
```

- `phase` — 0 (0–1 gün), 1 (1–90 gün), 2 (90–180 gün).
- `chunk_order` — parçalar sırayla gelmeyebilir; buna göre sıralayın.
- `progress` — 0–100; 100 aktarım tamamlandı demektir.
- İşletme geçmiş paylaşımını kapattıysa mesaj yerine hata kaydı gelir (Meta kodu `2593109`).

> `message.history` olayı **`*` aboneliğine dahil değildir**; almak için panelden ayrıca seçin.

### Aktarım durumu

```
GET  /wa/numbers/{phone_number_id}/history-import   → durum
POST /wa/numbers/{phone_number_id}/history-import    → otomatik başlatma kaçtıysa elle başlat
```

```json
{
  "history_import": {
    "phone_number_id": "1234567890", "eligible": true, "status": "in_progress",
    "window_open": false, "phase": 1, "progress": 45,
    "chunks_received": 4, "messages_received": 180, "media_downloaded": 12,
    "error": null
  }
}
```

`status`: `not_applicable` (coexistence değil) · `not_started` · `pending` · `requested` · `in_progress` · `completed` · `declined` (işletme kapattı) · `failed` · `window_expired` (24 saat geçti). Pencere kapandıysa geçmişi almak için numaranın bağlantısını kaldırıp yeniden bağlamak gerekir.

---

## Numara ayarları — `PATCH /wa/numbers/{phone_number_id}/settings`

Veri Merkezi'nin kendi otomasyon motoru ve opt-out otomatik yanıtı, kendi panelinizde otomasyon çalıştırıyorsanız çift yanıta yol açabilir. Numara bazında kapatabilirsiniz (varsayılan: açık).

```http
PATCH /wa/numbers/1234567890/settings
{ "automation_enabled": false, "opt_out_autoreply_enabled": false }

→ { "phone_number_id": "1234567890",
    "settings": { "automation_enabled": false, "opt_out_autoreply_enabled": false } }
```

`opt_out_autoreply_enabled` kapalıyken opt-out (bültenden çıkış) **yine kaydedilir** (yasal gereklilik); yalnızca otomatik onay mesajı gönderilmez. Bu ayarlar `GET /wa/numbers` yanıtında da görünür. Gerekli scope: `profile:write`.

---

## `GET /wa/numbers` — yeni alanlar

Yanıttaki her numara artık şunları da içerir:

| Alan | Açıklama |
|---|---|
| `messaging_limit_tier` | Meta mesaj limiti kademesi (`TIER_250` / `TIER_2K` / `TIER_10K` / `TIER_100K` / `TIER_UNLIMITED`) |
| `throughput` | Meta gönderim hızı bilgisi (numarada varsa; yoksa `null`) |
| `automation_enabled` | Veri Merkezi otomasyonu bu numarada açık mı |
| `opt_out_autoreply_enabled` | Opt-out otomatik yanıtı açık mı |

---

## Sağlık — `GET /wa/health`

Webhook teslimat sağlığınızı döndürür (izleme/durum sayfası için).

```json
{
  "status": "ok",
  "time": "2026-09-22T09:00:00Z",
  "webhook_delivery": {
    "active_subscriptions": 1, "queue_depth": 0, "delivered_last_hour": 240,
    "latency_seconds_last_hour": { "avg": 1.2, "p95": 3 },
    "dead_last_24h": 0, "last_delivered_at": "2026-09-22T08:59:58+03:00"
  },
  "meta_webhook": { "last_received_at": "2026-09-22T08:59:59+03:00", "failed_last_hour": 0 }
}
```

`status` kuyruk 1000'i ya da p95 gecikme 120 sn'yi aşarsa `degraded` olur.
