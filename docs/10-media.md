# 10 · Gelen Medyayı İndirme

> **Giden gönderim için dosya yüklemek** (Meta `media_id` üretmek) ayrı bir uçtur: [`POST /wa/media`](11-gelismis.md#dosya-yükleme--post-wamedia). Bu bölüm **gelen** medyayı indirmeyi anlatır.

Müşteriniz WhatsApp'tan fotoğraf, belge, video veya ses gönderdiğinde webhook'un
`data.media` alanında iki değer gelir:

```json
{
  "event": "message.received",
  "data": {
    "type": "image",
    "media": {
      "media_id": 13109,
      "path": "wa-media/inbound/2026/09/kgI9iKVlvNw3yFpXrzNVL8w2T023kEaznP3z5NHD.jpeg"
    }
  }
}
```

`path` **depodaki iç yoldur — doğrudan istenemez.** Dosyaya yalnızca aşağıdaki uç
noktadan, kendi API anahtarınızla erişirsiniz.

---

## Dosyayı indirme

```
GET https://api.verimerkezi.app/wa/media/{media_id}
Authorization: Bearer vmk_live_...
```

```bash
curl -L https://api.verimerkezi.app/wa/media/13109 \
  -H "Authorization: Bearer $VM_API_KEY" \
  -o gelen-gorsel.jpeg
```

Yanıt dosyanın kendisidir (ikili akış). Doğru `Content-Type`, `Content-Length` ve
`ETag` başlıklarıyla gelir.

**Gerekli kapsam:** `messages:read` (panelde **Mesaj Okuma**) veya `inbox:read`. **Tam Yetki** (`*`) anahtarları da erişir.

---

## Üstveri — dosyayı indirmeden

Boyut, tür veya karma değerini indirmeden öğrenmek için `?meta=1`:

```bash
curl "https://api.verimerkezi.app/wa/media/13109?meta=1" \
  -H "Authorization: Bearer $VM_API_KEY"
```

```json
{
  "ok": true,
  "media": {
    "media_id": 13109,
    "client_id": 27,
    "kind": "image",
    "source": "inbound",
    "mime": "image/jpeg",
    "size": 54079,
    "sha256": "5d174a5bd79a7c91cc0ce4be0be40fdf61f6ae03…",
    "original_name": null,
    "created_at": "2026-09-19 17:42:10",
    "download_url": "https://api.verimerkezi.app/wa/media/13109"
  }
}
```

`HEAD` isteği de dosyayı aktarmadan `Content-Length` verir:

```bash
curl -I https://api.verimerkezi.app/wa/media/13109 -H "Authorization: Bearer $VM_API_KEY"
```

---

## Medya kayıtlarını listeleme

```
GET https://api.verimerkezi.app/wa/media?source=inbound&kind=image&limit=50
```

| Parametre | Değer | Açıklama |
|---|---|---|
| `limit` | 1–100 | Varsayılan 50 |
| `cursor` | `media_id` | Bu id'den **küçük** kayıtlar (sayfalama) |
| `source` | `inbound` · `outbound` | Yön |
| `kind` | `image` · `video` · `document` · `audio` · `sticker` | Tür |

```json
{
  "ok": true,
  "media": [ { "media_id": 13115, "kind": "image", "source": "inbound",
               "mime": "image/jpeg", "size": 108919,
               "download_url": "https://api.verimerkezi.app/wa/media/13115" } ],
  "paging": { "limit": 50, "has_more": true, "next_cursor": 13115 }
}
```

---

## Büyük dosyalar — Range

Video ve ses için `Range` başlığı desteklenir (`206 Partial Content`). Yarıda kalan
indirmeyi kaldığı yerden sürdürebilirsiniz:

```bash
# ilk 1 MB
curl -r 0-1048575 https://api.verimerkezi.app/wa/media/7815 \
  -H "Authorization: Bearer $VM_API_KEY" -o parca1.mp4
```

## Önbellek

Yanıttaki `ETag` değerini `If-None-Match` ile geri gönderirseniz, dosya
değişmediğinde `304 Not Modified` alırsınız — veri aktarılmaz.

---

## Hatalar

| Kod | HTTP | Anlamı |
|---|---|---|
| `invalid_media_id` | 400 | `media_id` yalnızca rakamlardan oluşmalı |
| `insufficient_scope` | 403 | Anahtarda `inbox:read` / `messages:read` yok |
| `media_not_found` | 404 | Kayıt yok **ya da** sizin hesabınıza ait değil |
| `media_file_missing` | 404 | Kayıt var, dosya depoda yok |
| `range_not_satisfiable` | 416 | İstenen bayt aralığı geçersiz |

---

## Güvenlik

- Yalnızca **kendi hesabınızın** medyasına erişebilirsiniz. Başka bir hesabın
  `media_id`'si `404` döner — kaydın var olup olmadığı bile sızdırılmaz.
- Depodaki dosya yollarına doğrudan HTTP erişimi **kapalıdır**.
- Yanıtlar `X-Content-Type-Options: nosniff` ve `Cache-Control: private` taşır.

## Saklama

Medya dosyaları **süresiz** saklanır; otomatik silme uygulanmaz. Geçmişe dönük
istediğiniz zaman indirebilirsiniz.

## Hız sınırı

Medya indirme **ayrı bir kovadadır: dakikada 60 istek.** Diğer uç noktaların
120/dk kotasından bağımsızdır. Kalan hakkınızı `X-RateLimit-Remaining`
başlığından izleyin.
