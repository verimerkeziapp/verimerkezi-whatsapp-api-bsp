<?php
/**
 * Veri Merkezi Webhook Receiver — Örnek (PHP)
 *
 * Bu dosyayı public bir HTTPS URL'de yayınlayın ve Veri Merkezi
 * panelinde webhook subscription URL'si olarak girin.
 *
 * Setup:
 *   1) Bu dosyayı web sunucunuza yükleyin (örn. /var/www/wa-webhook.php)
 *   2) Public URL'i not edin (https://api.firmaniz.com/wa-webhook.php)
 *   3) VM_WEBHOOK_SECRET'i .env'e yazın
 *   4) Panel → API → Webhooks → URL'i kaydedin, secret'i .env'e kopyalayın
 */

// .env'den
$secret = getenv('VM_WEBHOOK_SECRET') ?: 'whsec_REPLACE_ME';

// ── Header'ları al ─────────────────────────────────────────────
$signature  = $_SERVER['HTTP_X_VERIMERKEZI_SIGNATURE_256'] ?? '';
$timestamp  = $_SERVER['HTTP_X_VERIMERKEZI_TIMESTAMP']     ?? '';
$eventId    = $_SERVER['HTTP_X_VERIMERKEZI_EVENT_ID']      ?? '';
$eventType  = $_SERVER['HTTP_X_VERIMERKEZI_EVENT_TYPE']    ?? '';
$attempt    = (int)($_SERVER['HTTP_X_VERIMERKEZI_DELIVERY_ATTEMPT'] ?? 1);
$rawBody    = file_get_contents('php://input');

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
//     (event_id'yi DB'ye kaydedip kontrol et)
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
            handleTemplateRejected($event['data']);
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
//   HANDLER'LAR — Buraya kendi iş mantığınızı yazın
// ═══════════════════════════════════════════════════════════════

function handleIncomingMessage(array $data): void
{
    $from = $data['from'] ?? '';
    $text = $data['text']['body'] ?? '';
    $contactName = $data['contact']['profile_name'] ?? 'Müşteri';

    // ÖRNEK: Basit echo bot
    // Production'da burada AI / NLP / iş kuralı işletirsiniz
    echo_log("Mesaj geldi · $contactName ($from): $text");

    // İsterseniz hemen yanıt verin (Veri Merkezi API üzerinden):
    // $vm = new VeriMerkeziClient(getenv('VM_API_KEY'));
    // $vm->sendText($data['phone_number_id'], $from, 'Mesajınızı aldık, en kısa sürede dönüş yapacağız.');
}

function handleStatusUpdate(array $data, string $event): void
{
    $wamid  = $data['wamid'] ?? '';
    $status = str_replace('message.status.', '', $event);
    echo_log("Status update · wamid=$wamid · $status");
}

function handleFailedMessage(array $data): void
{
    $wamid    = $data['wamid'] ?? '';
    $error    = $data['error']['message'] ?? 'bilinmiyor';
    $metaCode = $data['error']['meta_code'] ?? null;
    echo_log("Mesaj başarısız · wamid=$wamid · code=$metaCode · $error");
}

function handleTemplateApproved(array $data): void
{
    $name = $data['template_name'] ?? '';
    echo_log("Şablon onaylandı: $name");
}

function handleTemplateRejected(array $data): void
{
    $name   = $data['template_name'] ?? '';
    $reason = $data['rejected_reason'] ?? '';
    echo_log("Şablon reddedildi: $name · $reason");
}

function handleQualityChange(array $data): void
{
    $phone   = $data['display_phone_number'] ?? '';
    $quality = $data['quality_rating'] ?? '';
    echo_log("Kalite değişti · $phone → $quality");

    if ($quality === 'RED') {
        // Acil aksiyon — e-posta gönder, panel'de uyarı
    }
}

function handleAccountAlert(array $data): void
{
    $msg = $data['message'] ?? '';
    echo_log("HESAP UYARISI: $msg");
}

// ── Idempotency helper (örn. dosya tabanlı; production'da Redis/DB) ──
function isEventAlreadyProcessed(string $eventId): bool
{
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
