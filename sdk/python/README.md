# Veri Merkezi WhatsApp SDK — Python

## Kurulum

```bash
pip install verimerkezi
```

veya geliştirme sürümü:

```bash
git clone https://github.com/verimerkeziapp/whatsapp-sdk.git
cd whatsapp-sdk/sdk/python
pip install -e .
```

## Hızlı Başlangıç

```python
from verimerkezi import VeriMerkeziClient

vm = VeriMerkeziClient('vmk_live_xxxxxxxxxxxxxxxx')

# Düz metin
vm.send_text('1234567890', '905551234567', 'Merhaba!')

# Şablon
vm.send_template(
 '1234567890',
 '905551234567',
 'siparis_onayi',
 'tr',
 components=[
 {
 'type': 'body',
 'parameters': [{'type': 'text', 'text': 'Ahmet'}],
 }
 ]
)

# Yanıt düz bir nesnedir; gönderilen mesajın WhatsApp ID'si r['wamid'] içindedir.
r = vm.send_text('1234567890', '905551234567', 'Merhaba!')
print(r['wamid'])

# Video (link tabanlı, isteğe bağlı başlık)
vm.send_video(
 '1234567890',
 '905551234567',
 'https://cdn.example.com/tanitim.mp4',
 caption='Yeni ürün tanıtımı',
)

# Gelen mesajı okundu işaretle (mavi tik) + "yazıyor…" göster (~25 sn, kredisiz)
vm.mark_read('1234567890', 'wamid.HBgM...', typing=True)
```

> **Medya gönderimi:** `send_image / send_video / send_audio / send_document` link tabanlıdır — herkese açık bir `https` bağlantısı verin. Serbest formatlı medya yalnızca 24 saatlik müşteri hizmet penceresi içinde gönderilebilir (aksi halde Meta 131047 — onaylı şablon kullanın). Her gönderim 1 kredi.

## API

| Metot | Açıklama |
|---|---|
| `send_text(phone_id, to, body)` | Düz metin gönder |
| `send_template(phone_id, to, name, language, components=None)` | Şablon gönder |
| `send_otp(phone_id, to, template_name, code, language='tr')` | OTP / doğrulama kodu gönder (AUTHENTICATION şablonu) |
| `send_image(phone_id, to, link, caption=None)` | Görsel gönder (link, ≤5MB jpeg/png) |
| `send_video(phone_id, to, link, caption=None)` | Video gönder (link, ≤16MB mp4) |
| `send_audio(phone_id, to, link)` | Ses gönder (link, ≤16MB, başlıksız) |
| `send_document(phone_id, to, link, filename=None, caption=None)` | Belge gönder (link, ≤100MB) |
| `mark_read(phone_id, message_id, typing=False)` | Okundu işaretle (mavi tik) + `typing=True` "yazıyor…" (kredisiz) |
| `me()` | Hesap bilgisi |
| `numbers()` | Telefon numaraları |
| `list_templates(status=None, category=None, language=None, q=None, cursor=None, limit=None)` | Şablon listesi (tüm filtreler opsiyonel) |
| `create_template(data)` | Şablon oluştur (Meta'ya gönderilir, durum PENDING) |
| `validate_template(data)` | Şablonu Meta'ya göndermeden doğrula |
| `get_template(template_id)` | Tek şablon ayrıntısı (components dahil) |
| `update_template(template_id, components, category=None)` | Şablonu düzenle (durum yeniden PENDING) |
| `delete_template(template_id)` | Şablonu sil |
| `create_webhook(url, events=None, description=None)` | Webhook aboneliği oluştur (events boşsa `["*"]`) |
| `list_webhooks()` | Webhook aboneliklerini listele |
| `update_webhook(webhook_id, fields)` | Webhook aboneliğini güncelle |
| `delete_webhook(webhook_id)` | Webhook aboneliğini sil |
| `test_webhook(webhook_id)` | Aboneliğe `test.ping` gönder |
| `get_profile(phone_id)` | Profil bilgisi |
| `update_profile(phone_id, fields)` | Profil güncelle |
| `list_contacts(cursor=None, limit=50, search=None)` | Kişi listesi |
| `create_contact(phone, name, **extra)` | Kişi oluştur |
| `bulk_contacts(contacts, skip_duplicates=True)` | Toplu kişi ekle |
| `reports_summary(period='30d')` | Rapor özeti |
| `list_media(source=None, kind=None, cursor=None, limit=50)` | Medya kayıtları |
| `media_info(media_id)` | Medya üstverisi (boyut, tür, sha256) |
| `download_media(media_id, dest_path=None)` | Gelen medyayı indir — yol verilirse diske parça parça yazar ve yolu döner, verilmezse `bytes` döner |

> Gönderim yanıtı düz bir nesnedir: `{ok, id, wamid, to, type, status, mode, simulated, credits_used, balance}`. Gönderilen mesajın WhatsApp ID'si `r['wamid']` içindedir (`messages[]` dizisi YOKTUR).

> Webhook abonelikleri artık API üzerinden yönetilebilir (bkz. aşağıdaki "Webhook Yönetimi"); [verimerkezi.app](https://verimerkezi.app) panelinden de yapılandırılabilir. Gelen olayları doğrulamak için `examples/python/webhook_receiver.py` örneğine ve `VeriMerkeziClient.verify_webhook_signature(...)` yardımcısına bakın.

## Şablon Yönetimi

Şablon oluşturma, doğrulama, listeleme, düzenleme ve silme:

```python
# Meta'ya göndermeden önce doğrula
vm.validate_template({
 'phone_number_id': '1275179085670729',
 'name': 'police_yenileme',
 'language': 'tr',
 'category': 'UTILITY',
 'components': [
 {'type': 'BODY', 'text': 'Sayın {{1}}, poliçeniz {{2}} tarihinde yenilenecek.',
 'example': {'body_text': [['Ahmet', '12.10.2026']]}},
 {'type': 'FOOTER', 'text': 'Mim Gökmen Sigorta'},
 ],
})

# Oluştur (durum PENDING döner)
t = vm.create_template({
 'waba_id': '1029384756',
 'name': 'police_yenileme',
 'language': 'tr',
 'category': 'UTILITY',
 'components': [
 {'type': 'BODY', 'text': 'Sayın {{1}}, poliçeniz {{2}} tarihinde yenilenecek.',
 'example': {'body_text': [['Ahmet', '12.10.2026']]}},
 ],
})
print(t['id'], t['status'])

# Filtreli liste (tüm filtreler opsiyonel)
vm.list_templates(status='APPROVED', category='UTILITY', language='tr', limit=20)

# Tek şablon, düzenleme, silme
detay = vm.get_template(t['id'])
vm.update_template(t['id'], components=detay['components'], category='UTILITY')
vm.delete_template(t['id'])
```

## Webhook Yönetimi

Webhook aboneliklerini API üzerinden yönetin. Oluştururken `events` boş bırakılırsa
`["*"]` (joker) kullanılır; joker, `message.revoked` / `credit.low` gibi joker-DIŞI yeni
olayları KAPSAMAZ — bunları açıkça listeye ekleyin.

```python
# Oluştur — secret YALNIZCA burada bir kez döner, saklayın
w = vm.create_webhook(
 'https://ornek.com/wa/webhook',
 events=['message.received', 'template.approved', 'credit.low'],
 description='Üretim aboneliği',
)
secret = w['secret'] # whsec_...

# Listele (secret dönmez), güncelle, test et, sil
vm.list_webhooks()
vm.update_webhook(w['id'], {'active': False})
vm.test_webhook(w['id']) # {'ok': True, 'result': 'delivered'}
vm.delete_webhook(w['id'])
```

## Gelen Medyayı İndirme

Webhook'taki `data.media.media_id` ile dosyayı indirin (anahtarda `messages:read` ya da Tam Yetki gerekir):

```python
vm.download_media(13109, 'gelen.jpeg')          # diske yazar, yolu döner (önerilen)
icerik = vm.download_media(13109)               # bytes
bilgi = vm.media_info(13109)                    # boyut, tür, sha256
liste = vm.list_media(source='inbound', limit=50)
```

Ayrıntılar: [docs/10-media.md](../../docs/10-media.md)

## Hata Yönetimi

```python
from verimerkezi import VeriMerkeziClient, VeriMerkeziException

vm = VeriMerkeziClient('vmk_live_...')

try:
 vm.send_text('...', '...', '...')
except VeriMerkeziException as e:
 print(f"Hata: {e}")
 print(f"HTTP: {e.status_code}")
 print(f"Hata kodu: {e.error_code}")
```

## Gereksinimler

- Python 3.9+
- `requests`

## Lisans

MIT
