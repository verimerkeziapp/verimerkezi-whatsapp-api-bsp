# 14 · WhatsApp Business Uygulaması Rehberi (Coexistence)

Numaranızı telefondaki **WhatsApp Business uygulamasıyla birlikte** kullanıyorsanız (coexistence), uygulamadaki kişi rehberi Meta tarafından Veri Merkezi'ne aktarılır. Bu rehberi API'den okuyabilir ve değişikliklerini `contact.synced` olayıyla anlık alabilirsiniz.

- **Gerekli scope:** `contacts:read` · **Kredi:** düşmez.
- Panel kişi rehberi (`GET /wa/contacts`, [05-contacts.md](05-contacts.md)) **değişmedi**; uygulama rehberi ayrı bir kaynaktır.

## Uçlar

| Yöntem | Yol | Açıklama |
|---|---|---|
| `GET` | `/wa/app-contacts` | Uygulama rehberi kayıtları (imleçle sayfalı) |
| `GET` | `/wa/numbers/{phone_number_id}/app-contacts/sync` | Numaranın rehber senkron durumu |

## `GET /wa/app-contacts`

Sıralama: `updated_at desc, id desc`.

| Parametre | Tip | Açıklama |
|---|---|---|
| `phone_number_id` | string | Yalnız bu numaranın rehberi. Verilmezse hesabın tüm numaraları |
| `updated_since` | ISO 8601 | `updated_at >= updated_since` (artımlı eşitleme) |
| `include_removed` | bool (vars. `false`) | `true` → telefondaki rehberden silinmiş kayıtlar da (`removed_at` dolu) döner |
| `limit` | int | 1–200, varsayılan 50 |
| `cursor` | string | Opak imleç (`/contacts` ile aynı biçim) |

```json
{
 "ok": true,
 "app_contacts": [
 {
 "id": 501,
 "phone_number_id": "1234567890",
 "phone": "+905551112233",
 "wa_id": "905551112233",
 "user_id": null,
 "full_name": "Ayşe Yılmaz",
 "first_name": "Ayşe",
 "source": "app_sync",
 "updated_at": "2026-10-13T10:15:00+03:00",
 "removed_at": null
 }
 ],
 "next_cursor": "eyJ...",
 "has_more": true
}
```

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | int | Kayıt kimliği (numara + telefon başına tekil) |
| `phone_number_id` | string | Rehberin ait olduğu işletme numarası |
| `phone` | string\|null | E.164 (`+` ile) |
| `wa_id` | string\|null | Telefon numarasından türetilir (Meta ayrıca göndermez) |
| `user_id` | string\|null | WhatsApp kullanıcı kimliği (BSUID); kayıtların büyük çoğunluğunda dolu |
| `full_name` | string\|null | Uygulamadaki kayıtlı ad |
| `first_name` | string\|null | |
| `source` | string | Kaydın son değişikliğinin kaynağı: `app_initial_sync` (bağlantıdan sonraki ilk aktarım) · `app_sync` (canlı değişiklik) · `app_backfill` (2.23.0 öncesinde saklanmış olaylardan geriye dönük doldurma) |
| `updated_at` | ISO 8601 | Son ekleme / güncelleme / silme zamanı (Veri Merkezi'nin olayı aldığı zaman) |
| `removed_at` | ISO 8601\|null | Telefondaki rehberden silindiyse |

**Hatalar:** `401` · `403 insufficient_scope` · `404 number_not_found` · `422 invalid_request` (`field`: `updated_since` / `limit` / `cursor`) · `429`.

> Numara ayrıldıysa (`detach`, `purge_messages: false`) kayıtları silinene kadar okunabilir.

## `GET /wa/numbers/{phone_number_id}/app-contacts/sync`

```json
{
 "ok": true,
 "phone_number_id": "1234567890",
 "coexistence": true,
 "sync_supported": true,
 "reason": null,
 "initial_sync": {
 "status": "completed",
 "requested_at": "2026-10-13T09:00:00+03:00",
 "completed_at": "2026-10-13T09:02:10+03:00"
 },
 "last_event_at": "2026-10-13T10:15:00+03:00",
 "contact_count": 842,
 "removed_count": 12
}
```

| Alan | Açıklama |
|---|---|
| `coexistence` | Numara WhatsApp Business uygulamasıyla birlikte mi kullanılıyor |
| `sync_supported` | `false` ise `reason` dolu |
| `reason` | `not_coexistence` · `number_detached` · `null` |
| `initial_sync.status` | `not_requested` · `requested` · `in_progress` · `completed` · `expired` · `failed` |
| `contact_count` / `removed_count` | Aktif / silinmiş kayıt sayısı |

### İlk aktarım kuralı (Meta)

Meta, rehberin ilk aktarımını **yalnız numara bağlandıktan sonraki 24 saat içinde ve bir kez** verir. Veri Merkezi bu isteği bağlantıdan hemen sonra otomatik gönderir; bu yüzden API'de tekrar isteme ucu yoktur.

- Bu kuraldan önce bağlanmış numaralarda durum `expired` olur; bu numaralara yalnız bundan sonraki canlı değişiklikler (`app_sync`) ve geriye dönük doldurulan kayıtlar (`app_backfill`) gelir.
- Tam rehberi yeniden almak için numarayı ayırıp panelden yeniden bağlamak gerekir (yeni 24 saatlik hak).

## Olay: `contact.synced`

Rehberde ekleme, düzenleme ve silme olduğunda numara başına **toplu** gönderilir (bir olayda en fazla **100** değişiklik; fazlası birden çok olaya bölünür). **`*` joker aboneliğine dahil değildir**; abonelikte açıkça ekleyin.

```json
{
 "event": "contact.synced",
 "event_id": "0192f3a1-0000-7000-8000-0000000000aa",
 "event_type": "contact.synced",
 "occurred_at": "2026-10-13T10:15:00+03:00",
 "created_at": "2026-10-13 10:15:00",
 "data": {
 "phone_number_id": "1234567890",
 "sync_type": "incremental",
 "batch": { "index": 1, "count": 1 },
 "changes": [
 { "action": "add", "id": 501, "phone": "+905551112233", "wa_id": "905551112233", "user_id": null,
 "full_name": "Ayşe Yılmaz", "first_name": "Ayşe", "changed_at": "2026-10-13T10:15:00+03:00" },
 { "action": "update", "id": 502, "phone": "+905552223344", "wa_id": "905552223344", "user_id": null,
 "full_name": "Mehmet Kaya (İş)", "first_name": "Mehmet", "changed_at": "2026-10-13T10:15:00+03:00" },
 { "action": "remove", "id": 503, "phone": "+905553334455", "wa_id": "905553334455", "user_id": null,
 "full_name": null, "first_name": null, "changed_at": "2026-10-13T10:15:00+03:00" }
 ]
 }
}
```

| Alan | Açıklama |
|---|---|
| `sync_type` | `initial` (ilk aktarım) · `incremental` (canlı değişiklik) |
| `batch.index` / `batch.count` | Toplu gönderimin sırası |
| `changes[].action` | `add` · `update` · `remove` |
| `changes[].id` | `GET /wa/app-contacts` kaydının `id`'si |

- Meta düzenlemeleri de "ekleme" olarak gönderir; Veri Merkezi kayıt zaten varsa ve ad / BSUID değiştiyse bunu `update`'e çevirir. Değişiklik yoksa olay yayınlanmaz.
- `remove`'da ad alanları `null` gelir; eşleştirmeyi `id` (+ `phone_number_id`), bulunamazsa `phone` ile yapın.
- Geriye dönük doldurma (`app_backfill`) olay yayınlamaz; bu kayıtları `GET /wa/app-contacts` ile çekin.
- **Kaçırılan olay:** `GET /wa/app-contacts?updated_since=…&include_removed=true` ile telafi edin. `event_id` tekrar denemelerde aynıdır.

## Önerilen entegrasyon

1. Numara bağlanınca (ve isteğe bağlı bir "Rehberi eşitle" düğmesinde) `GET /wa/app-contacts?phone_number_id=…&include_removed=true` ile tam çekim (sayfalı).
2. Sonrasında `contact.synced` olaylarıyla artımlı güncelleme.
3. Günlük `updated_since` ile telafi.
4. Düğme görünürlüğünü durum ucundaki `sync_supported` ve `contact_count`'a göre belirleyin.

## Test anahtarı

- `GET /wa/app-contacts` 3 sabit örnek kayıt döner (`"simulated": true`, `"mode": "test"`).
- `POST /wa/test/inbound` `type: "app_contact_sync"` → `add` / `update` / `remove` içeren örnek bir `contact.synced` olayı gönderir.

## Silme

- `POST /wa/numbers/{id}/detach` + `purge_messages: true` → numaranın uygulama rehberi kayıtları silinir (`number.purged` → `counts.app_contacts`).
- `POST /wa/privacy/erasure` → kişinin uygulama rehberi kayıtları da silinir (`erased.app_contacts`; `privacy.erasure_completed` olayında da).

## SDK

| Node.js / PHP | Python |
|---|---|
| `listAppContacts(...)` | `list_app_contacts(...)` |
| `getAppContactsSyncStatus(phoneNumberId)` | `get_app_contacts_sync_status(...)` |
