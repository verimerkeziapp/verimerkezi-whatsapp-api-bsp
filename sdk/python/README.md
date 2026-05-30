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

# PDF
vm.send_document(
    '1234567890',
    '905551234567',
    url='https://cdn.firmaniz.com/fatura.pdf',
    filename='fatura.pdf',
    caption='Mayıs faturanız'
)
```

## API

| Metot | Açıklama |
|---|---|
| `send_text(phone_id, to, body)` | Düz metin |
| `send_image(phone_id, to, url, caption=None)` | Görsel |
| `send_document(phone_id, to, url, filename, caption=None)` | Doküman |
| `send_video(phone_id, to, url, caption=None)` | Video |
| `send_template(phone_id, to, name, language, components=None)` | Şablon |
| `send_location(phone_id, to, lat, lng, name=None, address=None)` | Konum |
| `send_reaction(phone_id, to, message_id, emoji)` | Reaction |
| `get_conversation(phone, cursor=None)` | Sohbet geçmişi |
| `create_template(payload)` | Şablon oluştur |
| `list_templates()` | Şablon listesi |
| `me()` | Hesap bilgisi |

## Hata Yönetimi

```python
from verimerkezi import VeriMerkeziClient, VeriMerkeziError

vm = VeriMerkeziClient('vmk_live_...')

try:
    vm.send_text('...', '...', '...')
except VeriMerkeziError as e:
    print(f"Hata: {e.message}")
    print(f"HTTP: {e.status_code}")
    print(f"Meta code: {e.meta_code}")
```

## Async Sürüm

```bash
pip install verimerkezi[async]
```

```python
import asyncio
from verimerkezi import AsyncVeriMerkeziClient

async def main():
    async with AsyncVeriMerkeziClient('vmk_live_...') as vm:
        await vm.send_text('1234567890', '905551234567', 'Merhaba!')

asyncio.run(main())
```

## Gereksinimler

- Python 3.9+
- `requests` (sync) veya `httpx` (async)

## Lisans

MIT
