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
| `send_image(phone_id, to, link, caption=None)` | Görsel gönder (link, ≤5MB jpeg/png) |
| `send_video(phone_id, to, link, caption=None)` | Video gönder (link, ≤16MB mp4) |
| `send_audio(phone_id, to, link)` | Ses gönder (link, ≤16MB, başlıksız) |
| `send_document(phone_id, to, link, filename=None, caption=None)` | Belge gönder (link, ≤100MB) |
| `mark_read(phone_id, message_id, typing=False)` | Okundu işaretle (mavi tik) + `typing=True` "yazıyor…" (kredisiz) |
| `me()` | Hesap bilgisi |
| `numbers()` | Telefon numaraları |
| `list_templates()` | Şablon listesi |
| `get_profile(phone_id)` | Profil bilgisi |
| `update_profile(phone_id, fields)` | Profil güncelle |
| `list_contacts(cursor=None, limit=50, search=None)` | Kişi listesi |
| `create_contact(phone, name, **extra)` | Kişi oluştur |
| `bulk_contacts(contacts, skip_duplicates=True)` | Toplu kişi ekle |
| `reports_summary(period='30d')` | Rapor özeti |

> Gönderim yanıtı düz bir nesnedir: `{ok, id, wamid, to, type, status, mode, simulated, credits_used, balance}`. Gönderilen mesajın WhatsApp ID'si `r['wamid']` içindedir (`messages[]` dizisi YOKTUR).

> Webhook'lar API üzerinden değil, [verimerkezi.app](https://verimerkezi.app) panelinden yapılandırılır. Gelen olayları doğrulamak için `examples/python/webhook_receiver.py` örneğine ve `VeriMerkeziClient.verify_webhook_signature(...)` yardımcısına bakın.

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
