# 08 · Pagination (Cursor-based)

Veri Merkezi tüm listeleme endpoint'lerinde **opaque cursor** pagination kullanır. `offset` veya sayfa numarası yoktur — bunun yerine her yanıt **bir sonraki sayfa için cursor** döner.

## Niye Cursor?

- Evet Yüksek hacimli liste için **O(1)** performans
- Evet Sayfa kayması yok (yeni kayıt eklense de aynı pencereyi görürsünüz)
- Evet Stateless — cursor sunucuda saklanmaz

## Kullanım

### İlk sayfa

```bash
curl "https://api.verimerkezi.app/wa/contacts?limit=50" \
 -H "Authorization: Bearer vmk_live_..."
```

### Yanıt

```json
{
 "ok": true,
 "data": [
 { "id": 100, "phone_e164": "..." },
 { "id": 99, "phone_e164": "..." },
 ...
 ],
 "pagination": {
 "next_cursor": "eyJpZCI6NTEsImsiOiJpZCIsImQiOiJkZXNjIn0",
 "has_more": true
 }
}
```

### Sonraki sayfa

`next_cursor`'ı parametreye geçirin:

```bash
curl "https://api.verimerkezi.app/wa/contacts?limit=50&cursor=eyJpZCI6NTEsImsiOiJpZCIsImQiOiJkZXNjIn0" \
 -H "Authorization: Bearer vmk_live_..."
```

### Son sayfa

`has_more: false` ve `next_cursor: null` olduğunda durulur:

```json
{
 "ok": true,
 "data": [...],
 "pagination": {
 "next_cursor": null,
 "has_more": false
 }
}
```

## Tüm Kayıtları Çekme

```php
// PHP — tüm kişileri çek
$allContacts = [];
$cursor = null;
do {
 $params = ['limit' => 100];
 if ($cursor) $params['cursor'] = $cursor;
 $response = $vm->listContacts($params);
 $allContacts = array_merge($allContacts, $response['data']);
 $cursor = $response['pagination']['next_cursor'] ?? null;
} while ($cursor);

echo count($allContacts) . " kişi yüklendi\n";
```

```js
// Node.js
const all = [];
let cursor = null;
do {
 const r = await vm.listContacts({ limit: 100, cursor });
 all.push(...r.data);
 cursor = r.pagination.next_cursor;
} while (cursor);
console.log(`${all.length} kişi yüklendi`);
```

```python
# Python
all_contacts = []
cursor = None
while True:
 r = vm.list_contacts(limit=100, cursor=cursor)
 all_contacts.extend(r['data'])
 cursor = r['pagination']['next_cursor']
 if not cursor:
 break
print(f"{len(all_contacts)} kişi yüklendi")
```

## Cursor Yapısı

Cursor base64-encoded JSON'dır (opaque — değiştirmeyin):

```
eyJpZCI6NTEsImsiOiJpZCIsImQiOiJkZXNjIn0
v base64 decode v
{"id":51,"k":"id","d":"desc"}
```

- `id`: son kaydın ID'si
- `k`: sıralama alanı (`id`, `created_at`, vs.)
- `d`: sıra yönü (`asc` / `desc`)

> DIKKAT: Cursor'ı **manipüle etmeyin**. Sadece API'nin döndürdüğü değeri geri gönderin.

## Cursor Destekleyen Endpoint'ler

| Endpoint | Sıralama |
|---|---|
| `GET /wa/contacts` | `id desc` |
| `GET /wa/messages` | `id desc` |
| `GET /wa/conversations/{phone}` | `id desc` |
| `GET /wa/templates` | `id desc` |
| `GET /wa/campaigns` | `id desc` |
| `GET /wa/webhooks/deliveries` | `id desc` |

## Limit Sınırları

| Endpoint | Default | Max |
|---|---|---|
| Genel | 20 | 100 |
| `/wa/messages` | 20 | 100 |
| `/wa/conversations` | 50 | 200 |
| `/wa/contacts` | 50 | 500 |

## Cursor + Filter

Cursor ve filtreleri birlikte kullanabilirsiniz:

```bash
curl "https://api.verimerkezi.app/wa/contacts?tag=vip&limit=20&cursor=..."
```

Filtre değişmeden cursor takip ettiğiniz sürece tutarlı sayfalama elde edersiniz.

## Önceki Sayfa?

**Cursor-based pagination geri gitmez.** Eğer "Önceki" butonu lazımsa frontend tarafında önceki cursor'ları stack'te saklayın:

```js
const cursorStack = [];
let currentCursor = null;

async function nextPage() {
 cursorStack.push(currentCursor);
 const r = await vm.listContacts({ limit: 20, cursor: currentCursor });
 currentCursor = r.pagination.next_cursor;
 return r.data;
}

async function previousPage() {
 cursorStack.pop(); // current
 const prev = cursorStack.pop();
 currentCursor = prev;
 return await vm.listContacts({ limit: 20, cursor: prev });
}
```
