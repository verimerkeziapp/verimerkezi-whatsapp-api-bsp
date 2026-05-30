"""
Veri Merkezi Webhook Receiver — Python / Flask

Setup:
 pip install flask
 export VM_WEBHOOK_SECRET=whsec_xxx
 python webhook_receiver.py
"""
import os
import hmac
import json
import time
import hashlib
import logging
from flask import Flask, request, abort, jsonify

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

SECRET = os.getenv('VM_WEBHOOK_SECRET', 'whsec_REPLACE_ME').encode()
processed_events = set() # Production'da Redis/DB

@app.route('/wa-webhook', methods=['POST'])
def webhook():
 signature = request.headers.get('X-VeriMerkezi-Signature-256', '')
 timestamp = request.headers.get('X-VeriMerkezi-Timestamp', '')
 event_id = request.headers.get('X-VeriMerkezi-Event-Id', '')
 raw_body = request.get_data(as_text=True)

 # 1) Replay koruması
 try:
 if abs(time.time() - int(timestamp)) > 300:
 app.logger.warning(f'expired timestamp: {timestamp}')
 abort(403, 'expired')
 except ValueError:
 abort(403, 'invalid_timestamp')

 # 2) İmza doğrulama
 expected = 'sha256=' + hmac.new(
 SECRET,
 f'{timestamp}.{raw_body}'.encode(),
 hashlib.sha256
 ).hexdigest()

 if not hmac.compare_digest(expected, signature):
 app.logger.warning(f'invalid signature for event_id={event_id}')
 abort(403, 'invalid_signature')

 # 3) Idempotency
 if event_id in processed_events:
 return jsonify({'ok': True, 'note': 'already_processed'})

 # 4) Parse + dispatch
 try:
 event = json.loads(raw_body)
 except json.JSONDecodeError:
 abort(400, 'invalid_json')

 try:
 event_type = event.get('event', '')
 data = event.get('data', {})

 if event_type == 'message.received':
 handle_incoming_message(data)
 elif event_type in ('message.status.sent', 'message.status.delivered', 'message.status.read'):
 handle_status_update(data, event_type)
 elif event_type == 'message.status.failed':
 handle_failed_message(data)
 elif event_type == 'template.approved':
 app.logger.info(f'Şablon onaylandı: {data.get("template_name")}')
 elif event_type == 'template.rejected':
 app.logger.warning(f'Şablon reddedildi: {data.get("template_name")} · {data.get("rejected_reason")}')
 elif event_type == 'quality.changed':
 app.logger.info(f'Kalite: {data.get("display_phone_number")} -> {data.get("quality_rating")}')
 else:
 app.logger.info(f'Bilinmeyen event: {event_type}')

 processed_events.add(event_id)
 return jsonify({'ok': True})

 except Exception as e:
 app.logger.error(f'handler error: {e}')
 return jsonify({'ok': False, 'error': 'handler_error'}), 500

# ═══════════════════════════════════════════════════════════════
# HANDLER'LAR — Kendi iş mantığınızı buraya yazın
# ═══════════════════════════════════════════════════════════════

def handle_incoming_message(data: dict) -> None:
 from_ = data.get('from', '')
 text = data.get('text', {}).get('body', '[medya]')
 contact_name = data.get('contact', {}).get('profile_name', 'Müşteri')
 app.logger.info(f' {contact_name} ({from_}): {text}')

 # Otomatik yanıt göndermek için:
 # from verimerkezi import VeriMerkeziClient
 # vm = VeriMerkeziClient(os.getenv('VM_API_KEY'))
 # vm.send_text(data['phone_number_id'], from_, 'Mesajınızı aldık!')

def handle_status_update(data: dict, event: str) -> None:
 status = event.replace('message.status.', '')
 app.logger.info(f' {data.get("wamid")} -> {status}')

def handle_failed_message(data: dict) -> None:
 error = data.get('error', {}).get('message', 'unknown')
 app.logger.error(f'HATA: {data.get("wamid")} · {error}')

@app.route('/health')
def health():
 return jsonify({'status': 'ok'})

if __name__ == '__main__':
 port = int(os.getenv('PORT', 3000))
 app.logger.info(f'Veri Merkezi webhook receiver: http://localhost:{port}/wa-webhook')
 app.run(host='0.0.0.0', port=port, debug=False)
