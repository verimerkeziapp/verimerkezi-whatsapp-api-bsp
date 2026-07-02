"""
Veri Merkezi WhatsApp API — Mesaj Gönderim Örneği (Python)

Çalıştırma:
 VM_API_KEY=vmk_live_xxx python examples/python/send_message.py
"""
import os
import sys

# SDK'yi path'e ekle
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../sdk/python'))

from verimerkezi import VeriMerkeziClient

api_key = os.getenv('VM_API_KEY', 'vmk_live_REPLACE')
phone_number_id = os.getenv('VM_PHONE_NUMBER_ID', '1234567890')
recipient = '905551112233'

vm = VeriMerkeziClient(api_key)

# ───── Düz Metin ─────
try:
 r = vm.send_text(phone_number_id, recipient, 'Merhaba! Bu test mesajıdır.')
 print(f"Metin: {r['wamid']}")
except Exception as e:
 print(f"Metin hatası: {e}")

# ───── Şablon ─────
try:
 r = vm.send_template(
 phone_number_id,
 recipient,
 'hosgeldin',
 'tr',
 components=[
 {
 'type': 'body',
 'parameters': [{'type': 'text', 'text': 'Ahmet'}],
 }
 ]
 )
 print(f"Şablon: {r['wamid']}")
except Exception as e:
 print(f"Şablon hatası: {e}")

# ───── Dinamik URL Butonlu Şablon (her alıcıya özel link) ─────
# Şablon panelde, URL butonunun sonu {{1}} olacak şekilde oluşturulur.
try:
 r = vm.send_template(
 phone_number_id,
 recipient,
 'sepet_kurtarma',
 'tr',
 components=[
 {'type': 'body', 'parameters': [{'type': 'text', 'text': 'Ahmet'}]},
 {
 'type': 'button',
 'sub_type': 'url',
 'index': 0,
 'parameters': [{'type': 'text', 'text': 'd32eec6c,5cbd62f6'}],
 },
 ]
 )
 print(f"Dinamik URL butonlu şablon: {r['wamid']}")
except Exception as e:
 print(f"Dinamik URL butonu hatası: {e}")
