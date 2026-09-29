# 08 · Pagination (Cursor-based)

Veri Merkezi listeleme endpoint'lerinde **cursor** pagination kullanır. `offset` veya sayfa numarası yoktur — bunun yerine her yanıt **bir sonraki sayfa için cursor** döner. Cursor biçimi ve yanıt zarfı **uca göre değişir** (bkz. [Uç bazında yanıt zarfı](#uç-bazında-yanıt-zarfı)).

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
 "contacts": [
 { "id": 100, "phone": "+905551234567", "name": "Ayşe Yılmaz" },
 { "id": 99, "phone": "+905552223344", "name": "Mehmet Kaya" }
 ],
 "next_cursor": "eyJpZCI6NTEsImsiOiJpZCIsImQiOiJkZXNjIn0",
 "has_more": true
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
 "contacts": [],
 "next_cursor": null,
 "has_more": false
}
```

## Uç Bazında Yanıt Zarfı

Tüm yanıtlar `"ok": true` ile başlar; liste alanının adı ve cursor'ın yeri uca göre farklıdır:

| Endpoint | Liste alanı | Cursor alanı | Cursor tipi |
|---|---|---|---|
| `GET /wa/contacts` | `contacts` | `next_cursor` (+ `has_more`) | opak string |
| `GET /wa/contacts/opted-out` | `contacts` | `next_cursor` (+ `has_more`) | opak string |
| `GET /wa/credit/transactions` | `transactions` | `next_cursor` (+ `has_more`) | opak string |
| `GET /wa/templates` | `templates` | `next_cursor` (+ `has_more`) | tamsayı |
| `GET /wa/messages` | `data` (+ `phone_number_id`) | `next_cursor` (+ `has_more`) | tamsayı |
| `GET /wa/media` | `media` | **`paging.next_cursor`** (+ `paging.has_more`, `paging.limit`) | tamsayı |

> DIKKAT: `/wa/media` yanıtında cursor **iç içe** `paging` nesnesindedir: `{ "ok": true, "media": [...], "paging": { "limit": 50, "has_more": true, "next_cursor": 812 } }`.

## Tüm Kayıtları Çekme

```php
// PHP — tüm kişileri çek
$allContacts = [];
$cursor = null;
do {
 $response = $vm->listContacts($cursor, 200);
 $allContacts = array_merge($allContacts, $response['contacts']);
 $cursor = $response['next_cursor'] ?? null;
} while ($cursor);

echo count($allContacts) . " kişi yüklendi\n";
```

```js
// Node.js
const all = [];
let cursor = null;
do {
 const r = await vm.listContacts({ limit: 200, cursor });
 all.push(...r.contacts);
 cursor = r.next_cursor;
} while (cursor);
console.log(`${all.length} kişi yüklendi`);
```

```python
# Python
all_contacts = []
cursor = None
while True:
 r = vm.list_contacts(limit=200, cursor=cursor)
 all_contacts.extend(r['contacts'])
 cursor = r.get('next_cursor')
 if not cursor:
 break
print(f"{len(all_contacts)} kişi yüklendi")
```

## Cursor Yapısı

- **Opak cursor** (`/contacts`, `/contacts/opted-out`, `/credit/transactions`): base64 kodlu bir değerdir. İçeriğine güvenmeyin, değiştirmeyin.
- **Tamsayı cursor** (`/templates`, `/messages`, `/media`): önceki sayfanın son kaydının `id`'sidir; sonraki sayfa bu değerden küçük `id`'leri döner.

> DIKKAT: Cursor'ı **manipüle etmeyin**. Her durumda yalnızca API'nin döndürdüğü değeri geri gönderin.

## Sıralama

| Endpoint | Sıralama |
|---|---|
| `GET /wa/contacts` | `id desc` |
| `GET /wa/contacts/opted-out` | `id desc` |
| `GET /wa/credit/transactions` | `id desc` |
| `GET /wa/messages` | `id desc` |
| `GET /wa/media` | `id desc` |

## Limit Sınırları

| Endpoint | Default | Max |
|---|---|---|
| `/wa/contacts` | 50 | 200 |
| `/wa/contacts/opted-out` | 50 | 200 |
| `/wa/credit/transactions` | 50 | 200 |
| `/wa/messages` | 50 | 100 |
| `/wa/media` | 50 | 100 |
| `/wa/templates` | 50 | 100 |

## Cursor + Filter

Cursor ve filtreleri birlikte kullanabilirsiniz:

```bash
curl "https://api.verimerkezi.app/wa/contacts?q=ayse&limit=20&cursor=..."
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
 currentCursor = r.next_cursor;
 return r.contacts;
}

async function previousPage() {
 cursorStack.pop(); // current
 const prev = cursorStack.pop();
 currentCursor = prev;
 const r = await vm.listContacts({ limit: 20, cursor: prev });
 return r.contacts;
}
```
