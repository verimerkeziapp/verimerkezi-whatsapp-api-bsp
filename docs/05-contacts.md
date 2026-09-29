# 05 · Kişi Rehberi

Veri Merkezi, müşterilerinizin telefon + isim + etiketlerini saklamak için kişi rehberi sunar. API üzerinden kişi **ekleyebilir** (`POST /wa/contacts`), **toplu ekleyebilir** (`POST /wa/contacts/bulk`) ve **listeleyebilirsiniz** (`GET /wa/contacts`).

> **Not:** Kişi güncelleme/silme, etiket ekleme/çıkarma, opt-out **değiştirme** ve toplu işlem (bulk-action) için API endpoint'i bulunmamaktadır; bu işlemler panel üzerinden yapılır. Opt-out durumunu **okumak** için `GET /wa/contacts/opted-out` ucunu ve `contact.opt_out_changed` webhook olayını kullanın (bkz. aşağıdaki **Mesaj Almak İstemeyenler** bölümü).

## Kişi Ekleme

```bash
curl -X POST https://api.verimerkezi.app/wa/contacts \
 -H "Authorization: Bearer vmk_live_..." \
 -H "Content-Type: application/json" \
 -d '{
 "phone": "905551234567",
 "full_name": "Ayşe Yılmaz",
 "first_name": "Ayşe",
 "last_name": "Yılmaz",
 "email": "ayse@firma.com",
 "company": "Firma A.Ş.",
 "tags": ["vip", "istanbul", "kampanya-mayis"],
 "custom_attrs": {
 "order_count": 12,
 "last_purchase": "2026-05-15",
 "preferred_color": "mavi"
 }
 }'
```

## Toplu Ekleme (Bulk Import)

```bash
curl -X POST https://api.verimerkezi.app/wa/contacts/bulk \
 -H "Authorization: Bearer vmk_live_..." \
 -H "Content-Type: application/json" \
 -d '{
 "contacts": [
 { "phone": "905551112233", "full_name": "Müşteri 1" },
 { "phone": "905552223344", "full_name": "Müşteri 2", "tags": ["yeni"] },
 { "phone": "905553334455", "full_name": "Müşteri 3", "tags": ["yeni", "ankara"] }
 ]
 }'
```

**Yanıt:**
```json
{
 "ok": true,
 "added": 2,
 "updated": 1,
 "skipped": 0,
 "errors": []
}
```

## Kişi Listesi

```bash
curl "https://api.verimerkezi.app/wa/contacts?limit=50&q=ayse" \
 -H "Authorization: Bearer vmk_live_..."
```

### Filtreler

| Parametre | Açıklama |
|---|---|
| `limit` | Sayfa başına kayıt (varsayılan 50, max 200) |
| `cursor` | Bir önceki sayfanın `next_cursor`'ı |
| `q` | İsim/telefon/email içinde arama |
| `opted_out` | `true` / `false` — yalnız mesaj almak istemeyenleri / istemeyenler dışındakileri listeler (opsiyonel) |

> **Not:** Kişi listesinde `q`, `opted_out`, `cursor` ve `limit` parametreleri desteklenir. Etiket / tarih bazlı sunucu tarafı filtre bulunmamaktadır. Her kayıtta `opted_out` ve `opted_out_at` (ISO 8601 veya `null`) alanları döner.

## Mesaj Almak İstemeyenler (Opt-out)

Müşteri WhatsApp'tan "RET" yazdığında (ya da "ONAY" ile geri döndüğünde) veya durum panelden değiştirildiğinde kişinin `opted_out` bayrağı güncellenir. Reddetmiş kişilere pazarlama/otomatik mesaj göndermeden önce bu listeyi kullanın.

### Reddedenler listesi

```bash
curl "https://api.verimerkezi.app/wa/contacts/opted-out?limit=100&since=2026-09-01T00:00:00+03:00" \
 -H "Authorization: Bearer vmk_live_..."
```

| Parametre | Açıklama |
|---|---|
| `limit` | 1–200 (varsayılan 50) |
| `cursor` | Bir önceki sayfanın `next_cursor`'ı (opak; `/contacts` ile aynı biçim) |
| `since` | Opsiyonel, ISO 8601. Yalnız `opted_out_at >= since` olanlar döner — artımlı eşitleme için son çağrı zamanınızı verin |

Sıralama `id desc`. **Gerekli scope:** `contacts:read`.

**Yanıt:**
```json
{
 "ok": true,
 "contacts": [
 { "id": 123, "phone": "+905551234567", "name": "Ayşe Yılmaz", "opted_out": true, "opted_out_at": "2026-09-29T21:05:00+03:00", "reason": null }
 ],
 "next_cursor": null,
 "has_more": false
}
```

| Hata | Durum |
|---|---|
| `401` | Geçersiz/eksik API anahtarı |
| `403 insufficient_scope` | Anahtarda `contacts:read` yok |
| `422 invalid_request` (`field: "since"`) | `since` geçerli bir ISO 8601 zamanı değil |
| `429` | Okuma hız sınırı aşıldı |

### Anlık bildirim

Durum değiştiği anda haber almak için webhook aboneliğinize `contact.opt_out_changed` olayını ekleyin (bkz. [06-webhooks.md](06-webhooks.md)). Önerilen akış: ilk kurulumda listeyi bir kez çekin, sonra olayla güncel tutun; olay kaçırılırsa `since` ile artımlı eşitleyin.

## Veri Modeli

```typescript
interface Contact {
 id: number;
 phone_e164: string; // örn. 905551234567
 wa_id?: string; // WhatsApp profil ID
 full_name?: string;
 first_name?: string;
 last_name?: string;
 email?: string;
 company?: string;
 tags: string[]; // ["vip", "istanbul"]
 custom_attrs: Record<string, any>;
 opted_out: boolean;
 opted_out_at?: string;
 opted_out_reason?: string;
 last_message_at?: string;
 last_seen_at?: string;
 created_at: string;
 updated_at: string;
}
```

## KVKK Uyumu

Veri Merkezi kişi verisini sizin adınıza saklar. KVKK gerekleri:
- Müşterilerin **rıza beyanı** ile rehbere eklenmesi gerekir (örn. site kayıt formunda checkbox)
- Müşteri **silinme talebi** geldiğinde ilgili kaydı panel üzerinden silin
- **Veri yönetim politikanız**'da Veri Merkezi'nin alt-veri işleyen olduğunu belirtin

> Detay: [verimerkezi.app/yasal/kvkk-aydinlatma](https://verimerkezi.app/yasal/kvkk-aydinlatma)
