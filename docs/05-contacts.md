# 05 · Kişi Rehberi

Veri Merkezi, müşterilerinizin telefon + isim + etiketlerini saklamak için kişi rehberi sunar. Bu sayede toplu mesaj, segmentasyon, opt-out yönetimi yapabilirsiniz.

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
curl "https://api.verimerkezi.app/wa/contacts?limit=50&tag=vip" \
  -H "Authorization: Bearer vmk_live_..."
```

### Filtreler

| Parametre | Açıklama |
|---|---|
| `limit` | Sayfa başına kayıt (max 100) |
| `cursor` | Bir önceki sayfanın `next_cursor`'ı |
| `tag` | Sadece bu etiketi taşıyanları getir |
| `search` | İsim/telefon/email içinde ara |
| `opted_out` | `0`=aktif, `1`=opt-out olanlar |
| `created_after` | ISO 8601 datetime |

## Kişi Güncelleme

```bash
curl -X PATCH https://api.verimerkezi.app/wa/contacts/42 \
  -H "Authorization: Bearer vmk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["vip", "loyal-customer"],
    "custom_attrs": { "order_count": 15 }
  }'
```

## Kişi Silme

```bash
curl -X DELETE https://api.verimerkezi.app/wa/contacts/42 \
  -H "Authorization: Bearer vmk_live_..."
```

## Etiket Ekleme / Çıkarma

```bash
# Ekle
curl -X POST https://api.verimerkezi.app/wa/contacts/42/tags \
  -d '{ "tag": "kampanya-haziran" }'

# Çıkar
curl -X DELETE https://api.verimerkezi.app/wa/contacts/42/tags/kampanya-haziran
```

## Opt-Out Yönetimi

Müşteri "stop" / "iptal" / "rahatsız etme" gibi anahtar kelimelerle yanıt verdiğinde **otomatik opt-out** olur. Manuel de yapabilirsiniz:

```bash
curl -X POST https://api.verimerkezi.app/wa/contacts/42/opt-out \
  -H "Authorization: Bearer vmk_live_..." \
  -d '{ "reason": "Müşteri talebi" }'
```

> ⚠️ Opt-out olmuş kişilere **şablon mesaj** gönderemezsiniz. SDK'lar otomatik filter uygular.

## Toplu İşlemler

```bash
# Birden fazla kişiye etiket ekle
curl -X POST https://api.verimerkezi.app/wa/contacts/bulk-action \
  -H "Authorization: Bearer vmk_live_..." \
  -d '{
    "action": "add_tag",
    "contact_ids": [42, 43, 44, 45],
    "tag": "mayis-kampanya"
  }'

# Toplu opt-out
curl -X POST https://api.verimerkezi.app/wa/contacts/bulk-action \
  -d '{
    "action": "opt_out",
    "contact_ids": [42, 43]
  }'
```

## Veri Modeli

```typescript
interface Contact {
  id: number;
  phone_e164: string;          // örn. 905551234567
  wa_id?: string;               // WhatsApp profil ID
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  tags: string[];               // ["vip", "istanbul"]
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
- Müşteri **silinme talebi** geldiğinde DELETE endpoint'i ile kaydı silin
- **Veri yönetim politikanız**'da Veri Merkezi'nin alt-veri işleyen olduğunu belirtin

> Detay: [verimerkezi.app/yasal/kvkk-aydinlatma](https://verimerkezi.app/yasal/kvkk-aydinlatma)
