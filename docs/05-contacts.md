# 05 · Kişi Rehberi

Veri Merkezi, müşterilerinizin telefon + isim + etiketlerini saklamak için kişi rehberi sunar. API üzerinden kişi **ekleyebilir** (`POST /wa/contacts`), **toplu ekleyebilir** (`POST /wa/contacts/bulk`) ve **listeleyebilirsiniz** (`GET /wa/contacts`).

> **Not:** Kişi güncelleme/silme, etiket ekleme/çıkarma, opt-out ve toplu işlem (bulk-action) için API endpoint'i bulunmamaktadır; bu işlemler panel üzerinden yapılır.

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
| `limit` | Sayfa başına kayıt (max 100) |
| `cursor` | Bir önceki sayfanın `next_cursor`'ı |
| `q` | İsim/telefon/email içinde arama |

> **Not:** Kişi listesinde yalnızca `q` (arama), `cursor` ve `limit` parametreleri desteklenir. Etiket / opt-out / tarih bazlı sunucu tarafı filtre bulunmamaktadır.

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
