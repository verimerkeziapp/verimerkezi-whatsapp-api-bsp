"""
VeriMerkezi WhatsApp API — Python SDK (v1.9.0)

Kullanım:
    from verimerkezi import VeriMerkeziClient
    vm = VeriMerkeziClient('vmk_live_xxxxxxxxxxxxxxxx')
    vm.send_template('1234567890', '905551234567', 'hosgeldin_mesaji', 'tr', [
        {'type': 'body', 'parameters': [{'type': 'text', 'text': 'Ahmet'}]}
    ])

Bağımlılık: pip install requests
"""

import os, re, time, uuid, hmac, hashlib
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

    def send_otp(self, phone_number_id, to, template_name, code, language='tr') -> dict:
        """AUTHENTICATION (OTP) şablonuyla doğrulama kodu gönderir — gövde+buton otomatik kurulur."""
        return self._post('/messages', {
            'phone_number_id': phone_number_id, 'to': to,
            'template': {'name': template_name, 'language': language, 'otp': code},
        })

    def send_text(self, phone_number_id, to, text) -> dict:
        return self._post('/messages', {'phone_number_id': phone_number_id, 'to': to, 'text': text})

    def send_image(self, phone_number_id, to, link, caption=None) -> dict:
        image = {'link': link}
        if caption is not None: image['caption'] = caption
        return self._post('/messages', {
            'phone_number_id': phone_number_id, 'to': to, 'type': 'image', 'image': image,
        })

    def send_video(self, phone_number_id, to, link, caption=None) -> dict:
        video = {'link': link}
        if caption is not None: video['caption'] = caption
        return self._post('/messages', {
            'phone_number_id': phone_number_id, 'to': to, 'type': 'video', 'video': video,
        })

    def send_audio(self, phone_number_id, to, link) -> dict:
        return self._post('/messages', {
            'phone_number_id': phone_number_id, 'to': to, 'type': 'audio', 'audio': {'link': link},
        })

    def send_document(self, phone_number_id, to, link, filename=None, caption=None) -> dict:
        document = {'link': link}
        if filename is not None: document['filename'] = filename
        if caption is not None: document['caption'] = caption
        return self._post('/messages', {
            'phone_number_id': phone_number_id, 'to': to, 'type': 'document', 'document': document,
        })

    def mark_read(self, phone_number_id, message_id, typing=False) -> dict:
        return self._post('/messages/read', {
            'phone_number_id': phone_number_id, 'message_id': message_id, 'typing': typing,
        })

    def list_contacts(self, cursor=None, limit=50, search=None) -> dict:
        params = {'limit': limit}
        if cursor: params['cursor'] = cursor
        if search: params['q'] = search
        return self._get('/contacts?' + urlencode(params))

    def create_contact(self, phone, name, **extra) -> dict:
        return self._post('/contacts', {'phone': phone, 'name': name, **extra})

    def bulk_contacts(self, contacts, skip_duplicates=True) -> dict:
        return self._post('/contacts/bulk', {'contacts': contacts, 'skip_duplicates': skip_duplicates})

    # ── Şablon yönetimi (2026-09-23) ─────────────────────────────────
    def list_templates(self, status=None, category=None, language=None, q=None, cursor=None, limit=None) -> dict:
        """Şablonları listeler; tüm filtreler opsiyonel (status/category/language/q/cursor/limit).

        Argümansız çağrılabilir. Yanıt: {'templates': [...], 'has_more': ..., 'next_cursor': ...}.
        """
        params = {}
        if status:   params['status'] = status
        if category: params['category'] = category
        if language: params['language'] = language
        if q:        params['q'] = q
        if cursor:   params['cursor'] = cursor
        if limit:    params['limit'] = limit
        path = '/templates'
        if params:
            path += '?' + urlencode(params)
        return self._get(path)

    def create_template(self, data) -> dict:
        """Yeni şablon oluşturur (Meta'ya gönderilir; durum PENDING döner).

        data: waba_id VEYA phone_number_id (biri zorunlu), name, language, category,
        components (zorunlu); allow_category_change / header_media_url opsiyonel.
        """
        return self._post('/templates', data)

    def validate_template(self, data) -> dict:
        """Şablonu Meta'ya GÖNDERMEDEN doğrular. {'ok': True, 'valid': True, ...} döner."""
        return self._post('/templates/validate', data)

    def get_template(self, template_id) -> dict:
        """Tek şablonun tüm ayrıntısını (components dahil) döner. Yoksa template_not_found."""
        return self._get('/templates/' + str(int(template_id)))

    def update_template(self, template_id, components, category=None) -> dict:
        """Onaylı/reddedilmiş şablonu düzenler; durum yeniden PENDING olur (components zorunlu)."""
        body = {'components': components}
        if category is not None:
            body['category'] = category
        return self._patch('/templates/' + str(int(template_id)), body)

    def delete_template(self, template_id) -> dict:
        """Şablonu siler. {'ok': True, 'deleted': True, 'id': ...} döner."""
        return self._delete('/templates/' + str(int(template_id)))

    def get_profile(self, phone_number_id) -> dict: return self._get('/profile/' + quote(phone_number_id))
    def update_profile(self, phone_number_id, fields) -> dict: return self._patch('/profile/' + quote(phone_number_id), fields)
    def reports_summary(self, period='30d') -> dict: return self._get('/reports/summary?period=' + quote(period))

    # ── Medya ─────────────────────────────────────────────────────────
    # Webhook'taki data.media.media_id degerini dogrudan kullanin.
    # Depodaki dosya yollarina dogrudan HTTP erisimi KAPALIDIR.

    def list_media(self, source=None, kind=None, cursor=None, limit=50) -> dict:
        """Medya kayitlarini listeler (yeniden eskiye)."""
        q = ['limit=' + str(int(limit))]
        if source: q.append('source=' + quote(str(source)))
        if kind:   q.append('kind=' + quote(str(kind)))
        if cursor: q.append('cursor=' + str(int(cursor)))
        return self._get('/media?' + '&'.join(q))

    def media_info(self, media_id) -> dict:
        """Dosyayi indirmeden ustveri (boyut, tur, sha256) doner."""
        return self._get('/media/' + str(int(media_id)) + '?meta=1')

    def download_media(self, media_id, dest_path=None, chunk_size=262144):
        """
        Medya dosyasini indirir.
        dest_path verilirse diske yazar ve yolu doner; verilmezse bytes doner.
        Buyuk dosyalar parca parca akitilir — bellege tamami yuklenmez.
        """
        url = self.base_url + '/media/' + str(int(media_id))
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'User-Agent': 'VeriMerkezi-Python-SDK/1.9.0',
        }
        resp = requests.get(url, headers=headers, timeout=self.timeout, stream=True)
        if resp.status_code != 200:
            kod, mesaj = 'http_error', f'HTTP {resp.status_code}'
            try:
                hata = resp.json().get('error', {})
                kod, mesaj = hata.get('code', kod), hata.get('message', mesaj)
            except Exception:
                pass
            raise VeriMerkeziException(mesaj, resp.status_code, kod)

        if dest_path is None:
            return resp.content

        with open(dest_path, 'wb') as f:
            for parca in resp.iter_content(chunk_size=chunk_size):
                if parca:
                    f.write(parca)
        return dest_path

    # ── Alıntılı cevap + tepki (2026-09-22) ──────────────────────────
    def send_reply(self, phone_id, to, text, reply_to_wamid) -> dict:
        return self._post('/messages', {'phone_number_id': phone_id, 'to': to, 'text': text, 'context': {'message_id': reply_to_wamid}})

    def react_to_message(self, phone_id, to, message_id, emoji) -> dict:
        """emoji '' -> önceki tepkiyi kaldırır."""
        return self._post('/messages', {'phone_number_id': phone_id, 'to': to, 'type': 'reaction', 'reaction': {'message_id': message_id, 'emoji': emoji}})

    # ── Dosya yükleme -> Meta media_id ───────────────────────────────
    def upload_media(self, phone_id, file_path, mime_type=None) -> dict:
        """Dosyayı Meta'ya yükler; {'media_id': ...} döner (30 gün geçerli)."""
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, mime_type) if mime_type else (os.path.basename(file_path), f)}
            resp = requests.post(self.base_url + '/media', headers={'Authorization': f'Bearer {self.api_key}',
                                 'User-Agent': 'VeriMerkezi-Python-SDK/1.9.0'},
                                 data={'phone_number_id': str(phone_id)}, files=files, timeout=self.timeout)
        j = resp.json() if resp.content else {}
        if resp.status_code // 100 != 2:
            err = j.get('error', {}) if isinstance(j, dict) else {}
            raise VeriMerkeziException(err.get('message', f'HTTP {resp.status_code}'), resp.status_code, err.get('code'))
        return j

    # ── Uzlaştırma, geçmiş, ayarlar, sağlık ──────────────────────────
    def list_messages(self, phone_id, since=None, cursor=None, limit=50) -> dict:
        q = ['phone_number_id=' + quote(str(phone_id)), 'limit=' + str(int(limit))]
        if since:  q.append('since=' + quote(str(since)))
        if cursor: q.append('cursor=' + str(int(cursor)))
        return self._get('/messages?' + '&'.join(q))

    def redeliver_webhooks(self, since) -> dict: return self._post('/webhooks/redeliver', {'since': since})
    def history_import_status(self, phone_id) -> dict: return self._get('/numbers/' + quote(str(phone_id)) + '/history-import')
    def start_history_import(self, phone_id) -> dict: return self._post('/numbers/' + quote(str(phone_id)) + '/history-import', {})
    def number_settings(self, phone_id, settings) -> dict: return self._patch('/numbers/' + quote(str(phone_id)) + '/settings', settings)
    def health(self) -> dict: return self._get('/health')

    # ── Webhook aboneliği yönetimi (2026-09-23) ──────────────────────
    # Webhook'lar artık API üzerinden yönetilebilir (panelden de yapılabilir).
    # Gelen olayları doğrulamak için statik verify_webhook_signature yardımcısını kullanın.
    def create_webhook(self, url, events=None, description=None) -> dict:
        """Webhook aboneliği oluşturur (events boşsa ['*']).

        secret YALNIZCA burada bir kez döner — saklayın. events joker ['*'] joker-DIŞI yeni
        olayları (message.revoked, credit.low, ...) kapsamaz; onları listeye açıkça ekleyin.
        """
        body = {'url': url, 'events': events or ['*']}
        if description is not None:
            body['description'] = description
        return self._post('/webhooks', body)

    def list_webhooks(self) -> dict:
        """Webhook aboneliklerini listeler (secret DÖNMEZ)."""
        return self._get('/webhooks')

    def update_webhook(self, webhook_id, fields) -> dict:
        """Webhook aboneliğini günceller (url/events/active/description — en az bir alan)."""
        return self._patch('/webhooks/' + str(int(webhook_id)), fields)

    def delete_webhook(self, webhook_id) -> dict:
        """Webhook aboneliğini siler. {'ok': True, 'deleted': True, 'id': ...} döner."""
        return self._delete('/webhooks/' + str(int(webhook_id)))

    def test_webhook(self, webhook_id) -> dict:
        """Aboneliğe anında test.ping teslimatı dener. {'ok': True, 'result': 'delivered'} döner."""
        return self._post('/webhooks/' + str(int(webhook_id)) + '/test', {})

    def _get(self, path): return self._request('GET', path)
    def _post(self, path, body): return self._request('POST', path, body)
    def _patch(self, path, body): return self._request('PATCH', path, body)
    def _delete(self, path): return self._request('DELETE', path)

    def _request(self, method, path, body=None):
        url = self.base_url + path
        idempotency_key = str(uuid.uuid4())

        for attempt in range(1, self.max_retries + 1):
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'VeriMerkezi-Python-SDK/1.9.0',
            }
            if method in ('POST', 'PUT', 'PATCH', 'DELETE'):
                headers['Idempotency-Key'] = idempotency_key

            try:
                resp = requests.request(method, url, headers=headers, json=body, timeout=self.timeout)
            except requests.RequestException as e:
                if attempt < self.max_retries:
                    time.sleep(attempt * 0.5); continue
                raise VeriMerkeziException(f'Bağlantı hatası: {e}', 0)

            # 5xx ve 429 yeniden denemeleri JSON parse'tan ÖNCE — gövde JSON olmayabilir
            if resp.status_code >= 500 and attempt < self.max_retries:
                time.sleep(attempt * 1.0); continue
            if resp.status_code == 429 and attempt < self.max_retries:
                retry_after = 5
                try:
                    body_json = resp.json()
                    retry_after = int(body_json.get('error', {}).get('retry_after')
                                      or resp.headers.get('Retry-After', 5))
                except (ValueError, TypeError):
                    retry_after = int(resp.headers.get('Retry-After', '5'))
                time.sleep(min(30, retry_after)); continue

            try:
                data = resp.json()
            except ValueError:
                raise VeriMerkeziException('Geçersiz JSON yanıt', resp.status_code)

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
        try:
            ts = int(timestamp)
        except (ValueError, TypeError):
            return False
        if abs(time.time() - ts) > tolerance_sec: return False
        expected = 'sha256=' + hmac.new(
            secret.encode('utf-8'),
            f'{timestamp}.{body}'.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
