# 07 · Rate Limit & Idempotency

## Rate Limit

API her uç nokta için **dakikalık fixed-window** limit uygular.

### Varsayılan Limitler

| Endpoint kategorisi | Limit |
|---|---|
| Genel (GET) | 120 / dakika |
| Mesaj gönderim (POST /wa/messages) | 60 / dakika |
| Şablon (POST /wa/templates) | 20 / dakika |
| Webhook yönetimi | 30 / dakika |

> Daha yüksek limitler için bilgi@verimerkezi.app

### Yanıt Header'ları

Her başarılı yanıtla birlikte:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1717068360
```

- `Limit`: Mevcut pencere içindeki üst sınır
- `Remaining`: Bu pencerede kalan hakkınız
- `Reset`: Pencerenin sıfırlanacağı Unix timestamp

### 429 Yanıtı

Limit aşıldığında:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 23
Content-Type: application/json

{
 "error": {
 "code": "rate_limited",
 "message": "Çok fazla istek. Lütfen biraz bekleyin.",
 "retry_after": 23
 }
}
```

`Retry-After` saniyesi kadar bekleyip tekrar deneyin. SDK'lar bunu otomatik yapar (exponential backoff).

## Idempotency-Key

Aynı isteği yanlışlıkla iki kez göndermenizi (örn. network timeout sonrası retry) güvenle yapabilmenizi sağlar.

### Nasıl Kullanılır?

Her **POST/PUT/PATCH/DELETE** isteğinde benzersiz bir UUID gönderin:

```bash
curl -X POST https://api.verimerkezi.app/wa/messages \
 -H "Authorization: Bearer vmk_live_..." \
 -H "Idempotency-Key: 01963a2b-7c1d-7f4e-9b21-...fcbe43" \
 -H "Content-Type: application/json" \
 -d '{ "to": "905551112233", "type": "text", ... }'
```

### Davranış

| Durum | Davranış |
|---|---|
| İlk istek | Normal işlenir, response 24h boyunca cache'lenir |
| Aynı key + aynı body ile retry | İlk yanıt **bire bir** geri döner (mesaj 2 kez gitmez) |
| Aynı key + farklı body | 422 `idempotency_key_conflict` hatası |
| 24h sonra aynı key | Yeni istek olarak işlenir |

### Idempotent Replay Header

Cache'lenen yanıt döndüğünde yanıt header'ında şu görünür:

```
Idempotent-Replay: true
```

Bu sayede gerçekten mesajın gönderilmediğini değil, daha önce gönderildiğini anlayabilirsiniz.

### Önerilen Key Üretimi

```php
// PHP — UUIDv7 (zaman-sıralı)
$key = bin2hex(random_bytes(16));
```

```js
// Node.js
const { randomUUID } = require('crypto');
const key = randomUUID();
```

```python
# Python
import uuid
key = str(uuid.uuid4())
```

### Pratik Senaryo

Müşterinize sipariş onayı gönderiyorsunuz. Network sorunu çıkıp **timeout** alıyorsunuz:

Hayir **Idempotency-Key olmadan:**
```
1. POST /messages -> timeout (mesaj aslında gitti)
2. retry -> POST /messages -> mesaj 2. kez gönderildi -> müşteri 2 mesaj alır
```

Evet **Idempotency-Key ile:**
```
1. POST /messages + Idempotency-Key: abc -> timeout (mesaj aslında gitti)
2. retry -> POST /messages + Idempotency-Key: abc -> cache'den dönülür -> mesaj tek
```

## Best Practices

1. **Her zaman Idempotency-Key gönderin** — bedelsiz, garantili duplicate koruması
2. **Rate limit header'larını izleyin** — proaktif yavaşlama yapın
3. **429 alırsanız `Retry-After` saniyesini bekleyin** — toplam yedek deneme stratejisi (3 deneme + exponential backoff)
4. **Toplu mesaj için throttling yapın** — örn. saniyede 10 istek (limit 60/dk = ortalama 1/sn ama bursty olabilirsiniz)
5. **`X-RateLimit-Remaining` düşükse arka plana atın** — kritik mesajlar için kapasite bırakın

## SDK Otomatiği

Resmî SDK'lar zaten:
- Idempotency-Key otomatik üretir (UUIDv4)
- 429 alınca `Retry-After` saniyesini bekler
- 3 retry'a kadar exponential backoff yapar
- Rate limit header'larını ilgili kayıtlara yansıtır

Manuel sadece **özel akışlar** için gerekir.
