<?php
/**
 * Veri Merkezi Webhook Receiver — Örnek (PHP)
 *
 * Bu dosyayı public bir HTTPS URL'de yayınlayın ve Veri Merkezi
 * panelinde webhook subscription URL'si olarak girin.
 *
 * Setup:
 * 1) Bu dosyayı web sunucunuza yükleyin (örn. /var/www/wa-webhook.php)
 * 2) Public URL'i not edin (https://api.firmaniz.com/wa-webhook.php)
 * 3) VM_WEBHOOK_SECRET'i .env'e yazın
 * 4) Panel -> API -> Webhooks -> URL'i kaydedin, secret'i .env'e kopyalayın
 */

// .env'den
$secret = getenv('VM_WEBHOOK_SECRET') ?: 'whsec_REPLACE_ME';

// ── Header'ları al ─────────────────────────────────────────────
$signature = $_SERVER['HTTP_X_VERIMERKEZI_SIGNATURE_256'] ?? '';
$timestamp = $_SERVER['HTTP_X_VERIMERKEZI_TIMESTAMP'] ?? '';
$eventId = $_SERVER['HTTP_X_VERIMERKEZI_EVENT_ID'] ?? '';
$eventType = $_SERVER['HTTP_X_VERIMERKEZI_EVENT_TYPE'] ?? '';
$attempt = (int)($_SERVER['HTTP_X_VERIMERKEZI_DELIVERY_ATTEMPT'] ?? 1);
$rawBody = file_get_contents('php://input');

// ── 1) Replay koruması (5 dakikadan eski reddet) ──────────────
if (abs(time() - (int)$timestamp) > 300) {
 http_response_code(403);
 error_log("[WaWebhook] Expired timestamp: $timestamp");
 exit('expired');
}

// ── 2) İmza doğrulama ─────────────────────────────────────────
$expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
if (!hash_equals($expected, $signature)) {
 http_response_code(403);
 error_log("[WaWebhook] Invalid signature for event_id=$eventId");
 exit('invalid_signature');
}

// ── 3) Idempotency — aynı event tekrar gelirse atla ───────────
// (event_id'yi DB'ye kaydedip kontrol et)
if (isEventAlreadyProcessed($eventId)) {
 http_response_code(200);
 echo json_encode(['ok' => true, 'note' => 'already_processed']);
 exit;
}

// ── 4) Event'i parse et ───────────────────────────────────────
$event = json_decode($rawBody, true);
if (!$event || !isset($event['event'])) {
 http_response_code(400);
 exit('invalid_json');
}

// ── 5) Event tipine göre işle ─────────────────────────────────
try {
 switch ($event['event']) {
 case 'message.received':
 handleIncomingMessage($event['data']);
 break;

 case 'message.echo':
 // CoExistence: işletme telefondaki WhatsApp uygulamasından müşteriye yazdı
 echo_log('İşletme yanıtladı -> ' . ($event['data']['to'] ?? '') . ': ' . ($event['data']['text'] ?? ''));
 break;

 case 'message.status.sent':
 case 'message.status.delivered':
 case 'message.status.read':
 handleStatusUpdate($event['data'], $event['event']);
 break;

 case 'message.status.failed':
 handleFailedMessage($event['data']);
 break;

 case 'template.approved':
 handleTemplateApproved($event['data']);
 break;

 case 'template.rejected':
 case 'template.flagged':
 case 'template.paused':
 handleTemplateRejected($event['data'], $event['event']);
 break;

 case 'quality.changed':
 handleQualityChange($event['data']);
 break;

 case 'account.alert':
 handleAccountAlert($event['data']);
 break;

 default:
 error_log("[WaWebhook] Unknown event: " . $event['event']);
 }

 markEventProcessed($eventId, $event['event']);

 http_response_code(200);
 echo json_encode(['ok' => true]);

} catch (Throwable $e) {
 // Hata durumunda 500 dönelim — Veri Merkezi otomatik retry yapar
 error_log("[WaWebhook] Handler error: " . $e->getMessage());
 http_response_code(500);
 echo json_encode(['ok' => false, 'error' => 'handler_error']);
}

// ═══════════════════════════════════════════════════════════════
// HANDLER'LAR — Buraya kendi iş mantığınızı yazın
// ═══════════════════════════════════════════════════════════════

function handleIncomingMessage(array $data): void
{
 // data.text düz metindir (medyada açıklama; açıklama yoksa boş).
 // Telefonu gizli kullanıcılarda data.from null gelir; kimlik data.user_id (BSUID) olur.
 $from = $data['from'] ?? ($data['user_id'] ?? '');
 $text = (string) ($data['text'] ?? '');
 $type = $data['type'] ?? 'text';
 $contactName = $data['name'] ?? ($data['contact']['profile_name'] ?? 'Müşteri');
 $media = is_array($data['media'] ?? null) ? $data['media'] : [];

 // ÖRNEK: Basit echo bot
 // Production'da burada AI / NLP / iş kuralı işletirsiniz
 if (!empty($media['media_id'])) {
 echo_log("Medya geldi · $contactName ($from) · $type · media_id={$media['media_id']}" . ($text !== '' ? " · $text" : ''));
 // Dosyayı indirmek için (bkz. docs/10-media.md):
 // $vm = new VeriMerkeziClient(getenv('VM_API_KEY'));
 // $vm->downloadMedia((int) $media['media_id'], __DIR__ . '/medya/' . (int) $media['media_id']);
 } elseif (!empty($media['error'])) {
 // Nadiren dosya Meta'dan alınamaz; bu durumda indirilebilir dosya yoktur.
 echo_log("Medya alınamadı · $contactName ($from) · $type · {$media['error']}");
 } else {
 echo_log("Mesaj geldi · $contactName ($from): $text");
 }

 // İsterseniz hemen yanıt verin (Veri Merkezi API üzerinden):
 // $vm = new VeriMerkeziClient(getenv('VM_API_KEY'));
 // $vm->sendText($data['phone_number_id'], $from, 'Mesajınızı aldık, en kısa sürede dönüş yapacağız.');
}

function handleStatusUpdate(array $data, string $event): void
{
 $wamid = $data['wamid'] ?? '';
 $status = str_replace('message.status.', '', $event);
 echo_log("Status update · wamid=$wamid · $status");
}

function handleFailedMessage(array $data): void
{
 $wamid = $data['wamid'] ?? '';
 $recipient = $data['recipient'] ?? '';
 // errors: Meta'nın hata listesi — [{ code, title, message, error_data: { details }, href }]
 $hata = $data['errors'][0] ?? [];
 $metaCode = $hata['code'] ?? '-';
 $error = $hata['message'] ?? ($hata['title'] ?? 'bilinmiyor');
 echo_log("Mesaj başarısız · wamid=$wamid · alıcı=$recipient · code=$metaCode · $error");
}

function handleTemplateApproved(array $data): void
{
 $name = $data['template_name'] ?? '';
 echo_log("Şablon onaylandı: $name");
}

function handleTemplateRejected(array $data, string $event): void
{
 $name = $data['template_name'] ?? '';
 $language = $data['language'] ?? '';
 $reason = $data['reason'] ?? '';
 $durum = ['template.rejected' => 'reddedildi', 'template.flagged' => 'işaretlendi', 'template.paused' => 'durduruldu'][$event] ?? $event;
 echo_log("Şablon $durum: $name ($language)" . ($reason !== '' ? " · $reason" : ''));
}

function handleQualityChange(array $data): void
{
 $phone = $data['phone'] ?? '';
 $quality = $data['quality'] ?? ''; // GREEN | YELLOW | RED
 echo_log("Kalite değişti · $phone -> $quality");

 if ($quality === 'RED') {
 // Acil aksiyon — e-posta gönder, panel'de uyarı
 }
}

function handleAccountAlert(array $data): void
{
 // field: account_update | account_alerts — event: Meta'nın olay adı (örn. DISABLED_UPDATE, PARTNER_REMOVED)
 $field = $data['field'] ?? '';
 $event = $data['event'] ?? '';
 echo_log("HESAP UYARISI: $field · $event");
}

// ── Idempotency helper (örn. dosya tabanlı; production'da Redis/DB) ──
function isEventAlreadyProcessed(string $eventId): bool
{
 if ($eventId === '') return false;
 $cacheFile = sys_get_temp_dir() . '/vm_webhook_events.txt';
 if (!is_file($cacheFile)) return false;
 return strpos(@file_get_contents($cacheFile), $eventId) !== false;
}

function markEventProcessed(string $eventId, string $eventType): void
{
 $cacheFile = sys_get_temp_dir() . '/vm_webhook_events.txt';
 @file_put_contents($cacheFile, $eventId . "\n", FILE_APPEND);
}

function echo_log(string $message): void
{
 error_log('[WaWebhook] ' . $message);
}
