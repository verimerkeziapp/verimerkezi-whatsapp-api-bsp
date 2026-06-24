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
```

## API

| Metot | Açıklama |
|---|---|
| `send_text(phone_id, to, body)` | Düz metin gönder |
| `send_template(phone_id, to, name, language, components=None)` | Şablon gönder |
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
