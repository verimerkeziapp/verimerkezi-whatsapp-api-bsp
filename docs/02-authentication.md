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
| `vmk_test_*` | Sandbox | Test numarasıyla çalışır, ücretsiz |

## Scope (İzinler)

Anahtar oluştururken hangi endpoint'lere erişim olacağını belirleyebilirsiniz:

| Scope | İzin verir |
|---|---|
| `messages:read` | Konuşma + mesaj geçmişi okuma |
| `messages:write` | Mesaj gönderme (text, media, template) |
| `templates:read` | Şablon listesi |
| `templates:write` | Şablon oluşturma + silme |
| `contacts:read` | Kişi rehberi okuma |
| `contacts:write` | Kişi ekleme/silme/güncelleme |
| `webhooks:write` | Webhook abonelik yönetimi |
| `reports:read` | Raporlar, analitik |
| `admin` | Tüm yetkiler |

> 💡 **En az ayrıcalık ilkesi:** Sadece ihtiyacınız olan scope'ları açın. Mesaj gönderim botu için `messages:write` + `templates:read` yeterlidir.

## Anahtar Yönetimi

### Yeni anahtar oluştur
Panel → API → Anahtarlar → **"Yeni Anahtar Oluştur"**

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

✅ **YAP:**
- Anahtarları `.env` dosyasında saklayın (asla kaynak koda yazmayın)
- HTTPS dışında çağrı yapmayın (zaten HTTP reddedilir)
- Her uygulama / sunucu için ayrı anahtar kullanın
- IP whitelist ekleyin (Panel → API → Anahtar → Detay → IP Kısıtla)

❌ **YAPMA:**
- Anahtarı frontend kodda (JS) kullanmayın → backend proxy yapın
- Public Git repo'ya commit etmeyin → `.gitignore` ile koruyun
- E-posta / Slack'te paylaşmayın → şifreli kanal kullanın
- Tek anahtarı birden fazla projede kullanmayın

## Sızıntı Durumunda

Anahtarınız sızdıysa:
1. **Anında iptal edin** (panel veya `revoke` endpoint'i)
2. Yeni anahtar oluşturun
3. Panel → **API → Kullanım Log'u** üzerinden son 24 saatte yapılan çağrıları inceleyin
4. Şüpheli aktivite varsa bilgi@verimerkezi.app'e bildirin

## Host Kısıtlaması

API yalnızca `https://api.verimerkezi.app/wa/*` üzerinden çağrılabilir.

```bash
# ✅ Doğru
https://api.verimerkezi.app/wa/messages

# ❌ Yanlış (404 + uyarı döner)
https://verimerkezi.app/api/wa/messages
```
