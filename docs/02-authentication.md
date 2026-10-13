# 02 · Kimlik Doğrulama

Veri Merkezi API'si **Bearer token** ile çalışır. Her isteğin `Authorization` header'ında API anahtarınız olmalıdır.

## Format

```
Authorization: Bearer vmk_live_<32-char>
```

### Anahtar Tipleri

| Prefix | Ortam | Açıklama |
|---|---|---|
| `vmk_live_*` | Production | Gerçek WhatsApp mesajları gönderilir, faturalandırılır |
| `vmk_test_*` | Test | Mesaj **Meta'ya gönderilmez** (gerçek alıcıya gitmez), ücretsizdir; yanıttaki `wamid` sahtedir (`test.<hex>` biçiminde) |

### Test anahtarı davranışı

Hiçbir yazma ucu test anahtarıyla gerçek veriye ya da Meta'ya dokunmaz. İstek normal doğrulanır (aynı `4xx` hataları döner), sonra ya gerçekçi bir başarı yanıtı simüle edilir (`simulated: true`, `mode: "test"`) ya da `403 test_mode_unsupported` döner. İki durumda da yanıtta **`X-Test-Mode: 1`** başlığı bulunur.

| Uç | Test anahtarıyla |
|---|---|
| `POST /messages`, `POST /media`, `POST /messages/read`, arama eylemleri, `POST /calls/permission-request`, `PATCH /numbers/{id}/calling` | Simüle edilir |
| `POST /templates` (`202`, `PENDING`, `id: 0`), `PATCH /templates/{id}`, `DELETE /templates/{id}` | Simüle edilir; kayıt ve Meta'ya gönderim yok |
| `PATCH /profile/{id}`, `PATCH /numbers/{id}/settings`, `PATCH /account/settings`, `PATCH /account/retention` | Simüle edilir; istenen değerler mevcutlarla birleştirilip döner, kaydedilmez |
| `POST /contacts` (`id: 0`), `POST /contacts/bulk` | Simüle edilir; mükerrer kontrolü gerçek rehbere göre yapılır |
| `POST /webhooks/redeliver` | Simüle edilir; teslimatlar sayılır, kuyruğa alınmaz |
| `POST` / `PATCH` / `DELETE /webhooks`, `POST /webhooks/{id}/rotate-secret` | `403 test_mode_unsupported` — abonelikleri canlı anahtarla yönetin. `POST /webhooks/{id}/test` çalışır |
| `POST /privacy/erasure` | `403 test_mode_unsupported` (doğrulama hataları yine döner) |
| `POST /numbers/{id}/history-import`, `POST /numbers/{id}/detach`, form yazma uçları | `403 test_mode_unsupported` |

## Scope (İzinler)

Anahtar oluştururken hangi endpoint'lere erişim olacağını belirleyebilirsiniz:

| Scope | İzin verir |
|---|---|
| `*` | Tam yetki — tüm scope'ları kapsar (panelde **Tam Yetki (Admin)**, varsayılan seçili) |
| `messages:send` | Mesaj gönderme (text, media, template) + okundu / yazıyor göstergesi |
| `messages:read` | Gelen medyayı indirme ve listeleme (`/media`) — panelde **Mesaj Okuma** |
| `inbox:read` | `/media` için `messages:read` ile eşdeğer kabul edilir |
| `templates:read` | Şablon listesi |
| `contacts:read` | Kişi rehberi okuma |
| `contacts:write` | Kişi ekleme (tekil + toplu) |
| `profile:read` | İşletme profili okuma |
| `profile:write` | İşletme profili güncelleme |
| `reports:read` | Raporlar, analitik |
| `calls:read` | Arama ayarları, arama izni durumu ve arama geçmişi okuma ([12-arama.md](12-arama.md)) |
| `calls:write` | Arama ayarlarını değiştirme, arama başlatma / kabul / ret / sonlandırma, arama izni isteme |
| `flows:read` | Formları (WhatsApp Flows) listeleme, ayrıntı, önizleme, metrik ([13-formlar.md](13-formlar.md)) |
| `flows:write` | Form oluşturma, JSON güncelleme, yayınlama, kullanımdan kaldırma, silme |

Yukarıdakilere ek olarak geçerli scope adları: `templates:write`, `webhooks:read`, `webhooks:write`, `campaigns:read`, `campaigns:write`, `automation:read`, `automation:write`, `inbox:write`.

> **Öneri:** Anahtar oluştururken ihtiyacınız olan scope'ları her zaman **açıkça seçin**. Yalnız geçersiz scope adlarıyla yapılan anahtar oluşturma isteği reddedilir; geçerli ve geçersiz adlar karışık verilirse geçersiz olanlar yok sayılır.

> **En az ayrıcalık ilkesi:** Sadece ihtiyacınız olan scope'ları açın. Mesaj gönderim botu için `messages:send` + `templates:read`, gelen medyayı indiren bir entegrasyon için `messages:read` yeterlidir.

## Anahtar Yönetimi

### Yeni anahtar oluştur
Panel -> API -> Anahtarlar -> **"Yeni Anahtar Oluştur"**

### Anahtar iptal et (revoke)
```bash
curl -X POST https://verimerkezi.app/panel/api/anahtarlar/iptal \
 -H "Cookie: ..." \
 -d "key_id=42"
```
Veya panel üzerinden tek tıkla.

### Anahtar rotation
Production'da düzenli olarak (örn. 90 günde bir) anahtar değiştirin:

1. Yeni anahtar oluşturun
2. Sisteminize yeni anahtarı ekleyin
3. Test edin
4. Eski anahtarı iptal edin

## Güvenlik Önerileri

Evet **YAP:**
- Anahtarları `.env` dosyasında saklayın (asla kaynak koda yazmayın)
- HTTPS dışında çağrı yapmayın (zaten HTTP reddedilir)
- Her uygulama / sunucu için ayrı anahtar kullanın
- IP whitelist ekleyin (Panel -> API -> Anahtar -> Detay -> IP Kısıtla)

Hayir **YAPMA:**
- Anahtarı frontend kodda (JS) kullanmayın -> backend proxy yapın
- Public Git repo'ya commit etmeyin -> `.gitignore` ile koruyun
- E-posta / Slack'te paylaşmayın -> şifreli kanal kullanın
- Tek anahtarı birden fazla projede kullanmayın

## Sızıntı Durumunda

Anahtarınız sızdıysa:
1. **Anında iptal edin** (panel veya `revoke` endpoint'i)
2. Yeni anahtar oluşturun
3. Panel -> **API -> Kullanım Log'u** üzerinden son 24 saatte yapılan çağrıları inceleyin
4. Şüpheli aktivite varsa bilgi@verimerkezi.app'e bildirin

## Host Kısıtlaması

API yalnızca `https://api.verimerkezi.app/wa/*` üzerinden çağrılabilir.

```bash
# Evet Doğru
https://api.verimerkezi.app/wa/messages

# Hayir Yanlış (404 + uyarı döner)
https://verimerkezi.app/api/wa/messages
```
