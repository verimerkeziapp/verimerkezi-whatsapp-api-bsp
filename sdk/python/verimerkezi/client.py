"""
VeriMerkezi WhatsApp API — Python SDK (v1.0)

INDIRMEDEN SONRA: dosyayı verimerkezi.py olarak yeniden adlandırın.

Kullanım:
 from verimerkezi import VeriMerkeziClient
 vm = VeriMerkeziClient('vmk_live_xxxxxxxxxxxxxxxx')
 vm.send_template('1234567890', '905551234567', 'hosgeldin_mesaji', 'tr', [
 {'type': 'body', 'parameters': [{'type': 'text', 'text': 'Ahmet'}]}
 ])

Bağımlılık: pip install requests
"""

import re, time, uuid, hmac, hashlib
import requests
from urllib.parse import urlencode, quote

class VeriMerkeziException(Exception):
 def __init__(self, message: str, status_code: int = 0, error_code: str = None, error_data: dict = None):
 super().__init__(message)
 self.status_code = status_code
 self.error_code = error_code
 self.error_data = error_data or {}

class VeriMerkeziClient:
 def __init__(self, api_key: str, base_url: str = 'https://api.verimerkezi.app/wa', timeout: int = 30, max_retries: int = 3):
 if not re.match(r'^vmk_(live|test)_', api_key):
 raise ValueError('API key formatı geçersiz (vmk_live_... veya vmk_test_... olmalı)')
 self.api_key = api_key
 self.base_url = base_url.rstrip('/')
 self.timeout = timeout
 self.max_retries = max_retries

 def me(self) -> dict: return self._get('/me')
 def numbers(self) -> dict: return self._get('/numbers')

 def send_template(self, phone_number_id, to, template_name, language='tr', components=None) -> dict:
 return self._post('/messages', {
 'phone_number_id': phone_number_id, 'to': to,
 'template': {'name': template_name, 'language': language, 'components': components or []},
 })

 def send_text(self, phone_number_id, to, text) -> dict:
 return self._post('/messages', {'phone_number_id': phone_number_id, 'to': to, 'text': text})

 def list_contacts(self, cursor=None, limit=50, search=None) -> dict:
 params = {'limit': limit}
 if cursor: params['cursor'] = cursor
 if search: params['q'] = search
 return self._get('/contacts?' + urlencode(params))

 def create_contact(self, phone, name, **extra) -> dict:
 return self._post('/contacts', {'phone': phone, 'name': name, **extra})

 def bulk_contacts(self, contacts, skip_duplicates=True) -> dict:
 return self._post('/contacts/bulk', {'contacts': contacts, 'skip_duplicates': skip_duplicates})

 def list_templates(self) -> dict: return self._get('/templates')
 def get_profile(self, phone_number_id) -> dict: return self._get('/profile/' + quote(phone_number_id))
 def update_profile(self, phone_number_id, fields) -> dict: return self._patch('/profile/' + quote(phone_number_id), fields)
 def reports_summary(self, period='30d') -> dict: return self._get('/reports/summary?period=' + quote(period))

 def _get(self, path): return self._request('GET', path)
 def _post(self, path, body): return self._request('POST', path, body)
 def _patch(self, path, body): return self._request('PATCH', path, body)

 def _request(self, method, path, body=None):
 url = self.base_url + path
 idempotency_key = str(uuid.uuid4())

 for attempt in range(1, self.max_retries + 1):
 headers = {
 'Authorization': f'Bearer {self.api_key}',
 'Content-Type': 'application/json',
 'Accept': 'application/json',
 'User-Agent': 'VeriMerkezi-Python-SDK/1.0',
 }
 if method in ('POST', 'PUT', 'PATCH', 'DELETE'):
 headers['Idempotency-Key'] = idempotency_key

 try:
 resp = requests.request(method, url, headers=headers, json=body, timeout=self.timeout)
 except requests.RequestException as e:
 if attempt < self.max_retries:
 time.sleep(attempt * 0.5); continue
 raise VeriMerkeziException(f'Bağlantı hatası: {e}', 0)

 try:
 data = resp.json()
 except ValueError:
 raise VeriMerkeziException('Geçersiz JSON yanıt', resp.status_code)

 if resp.status_code >= 500 and attempt < self.max_retries:
 time.sleep(attempt * 1.0); continue
 if resp.status_code == 429 and attempt < self.max_retries:
 retry_after = int(resp.headers.get('Retry-After', '5'))
 time.sleep(min(30, retry_after)); continue

 if resp.status_code >= 400:
 err = data.get('error', {})
 raise VeriMerkeziException(
 err.get('message', 'API hatası'),
 resp.status_code, err.get('code'), err
 )
 return data

 raise VeriMerkeziException('Max retry aşıldı', 0)

 @staticmethod
 def verify_webhook_signature(secret, body, signature, timestamp, tolerance_sec=300):
 if abs(time.time() - timestamp) > tolerance_sec: return False
 expected = 'sha256=' + hmac.new(
 secret.encode('utf-8'),
 f'{timestamp}.{body}'.encode('utf-8'),
 hashlib.sha256
 ).hexdigest()
 return hmac.compare_digest(expected, signature)
