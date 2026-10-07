<?php
/**
 * VeriMerkezi WhatsApp API — PHP SDK (single-file)
 *
 * Kullanım:
 * require 'VeriMerkeziClient.php';
 * $vm = new VeriMerkeziClient('vmk_live_xxxxxxxxxxxxxxxx');
 * $vm->sendTemplate('1234567890', '905551234567', 'hosgeldin_mesaji', 'tr', [
 * ['type' => 'body', 'parameters' => [['type' => 'text', 'text' => 'Ahmet']]]
 * ]);
 *
 * v1.0 — 2026-05-27
 * v1.9.0 — 2026-09-23 — şablon yönetimi + webhook aboneliği + kredi olayları
 * v2.19.1 — 2026-10-08 — API 2.19.1 ile hizalandı: hesap ayarları, KVKK saklama/silme,
 *   sandbox gelen mesaj, webhook secret döndürme
 * https://verimerkezi.app/panel/api/dokuman
 */

namespace VeriMerkezi;

class VeriMerkeziClient
{
 public const VERSION = '2.20.0';

 private string $apiKey;
 private string $baseUrl;
 private int $timeout;
 private int $maxRetries;

 public function __construct(
 string $apiKey,
 string $baseUrl = 'https://api.verimerkezi.app/wa',
 int $timeout = 30,
 int $maxRetries = 3
 ) {
 if (!preg_match('/^vmk_(live|test)_/', $apiKey)) {
 throw new \InvalidArgumentException('API key formatı geçersiz (vmk_live_... veya vmk_test_... olmalı)');
 }
 $this->apiKey = $apiKey;
 $this->baseUrl = rtrim($baseUrl, '/');
 $this->timeout = $timeout;
 $this->maxRetries = $maxRetries;
 }

 public function me(): array { return $this->get('/me'); }
 public function numbers(): array { return $this->get('/numbers'); }

 public function sendTemplate(string $phoneNumberId, string $to, string $templateName, string $language = 'tr', array $components = []): array
 {
 return $this->post('/messages', [
 'phone_number_id' => $phoneNumberId,
 'to' => $to,
 'template' => [
 'name' => $templateName,
 'language' => $language,
 'components' => $components,
 ],
 ]);
 }

 /** AUTHENTICATION (OTP) şablonuyla doğrulama kodu gönderir — gövde+buton otomatik kurulur. */
 public function sendOtp(string $phoneNumberId, string $to, string $templateName, string $code, string $language = 'tr'): array
 {
 return $this->post('/messages', [
 'phone_number_id' => $phoneNumberId,
 'to' => $to,
 'template' => ['name' => $templateName, 'language' => $language, 'otp' => $code],
 ]);
 }

 public function sendText(string $phoneNumberId, string $to, string $text): array
 {
 return $this->post('/messages', [
 'phone_number_id' => $phoneNumberId,
 'to' => $to,
 'text' => $text,
 ]);
 }

 // ── Medya mesajları ────────────────────────────────────────────────────
 // Serbest-format medya yalnızca 24 saatlik müşteri hizmet penceresi içinde
 // çalışır (aksi halde Meta 131047 — bunun yerine şablon kullanın). Medya
 // herkese açık bir https link ile gönderilir. 1 kredi.
 // Limitler: resim ≤5MB jpeg/png, video ≤16MB mp4, ses ≤16MB, belge ≤100MB pdf/doc.

 public function sendImage(string $phoneNumberId, string $to, string $link, ?string $caption = null): array
 {
 return $this->post('/messages', [
 'phone_number_id' => $phoneNumberId,
 'to' => $to,
 'type' => 'image',
 'image' => $caption !== null ? ['link' => $link, 'caption' => $caption] : ['link' => $link],
 ]);
 }

 public function sendVideo(string $phoneNumberId, string $to, string $link, ?string $caption = null): array
 {
 return $this->post('/messages', [
 'phone_number_id' => $phoneNumberId,
 'to' => $to,
 'type' => 'video',
 'video' => $caption !== null ? ['link' => $link, 'caption' => $caption] : ['link' => $link],
 ]);
 }

 public function sendAudio(string $phoneNumberId, string $to, string $link): array
 {
 return $this->post('/messages', [
 'phone_number_id' => $phoneNumberId,
 'to' => $to,
 'type' => 'audio',
 'audio' => ['link' => $link],
 ]);
 }

 public function sendDocument(string $phoneNumberId, string $to, string $link, ?string $filename = null, ?string $caption = null): array
 {
 $document = ['link' => $link];
 if ($filename !== null) $document['filename'] = $filename;
 if ($caption !== null) $document['caption'] = $caption;
 return $this->post('/messages', [
 'phone_number_id' => $phoneNumberId,
 'to' => $to,
 'type' => 'document',
 'document' => $document,
 ]);
 }

 // ── Okundu bilgisi + yazıyor ───────────────────────────────────────────
 // Gelen bir mesajı okundu işaretler (mavi tik). typing:true ~25sn "yazıyor…"
 // göstergesi gösterir. Kredi harcamaz.

 public function markRead(string $phoneNumberId, string $messageId, bool $typing = false): array
 {
 return $this->post('/messages/read', [
 'phone_number_id' => $phoneNumberId,
 'message_id' => $messageId,
 'typing' => $typing,
 ]);
 }

 public function listContacts(?string $cursor = null, int $limit = 50, ?string $search = null): array
 {
 $query = ['limit' => $limit];
 if ($cursor) $query['cursor'] = $cursor;
 if ($search) $query['q'] = $search;
 return $this->get('/contacts?' . http_build_query($query));
 }

 public function createContact(string $phone, string $name, array $extra = []): array
 {
 return $this->post('/contacts', array_merge(['phone' => $phone, 'name' => $name], $extra));
 }

 public function bulkContacts(array $contacts, bool $skipDuplicates = true): array
 {
 return $this->post('/contacts/bulk', ['contacts' => $contacts, 'skip_duplicates' => $skipDuplicates]);
 }

 /** Şablonları listeler. Filtreler (hepsi opsiyonel): status, category, language, q, cursor, limit. */
 public function listTemplates(array $filters = []): array
 {
 $q = [];
 foreach (['status', 'category', 'language', 'q', 'cursor'] as $k) {
 if (!empty($filters[$k])) { $q[$k] = (string) $filters[$k]; }
 }
 if (isset($filters['limit'])) { $q['limit'] = (int) $filters['limit']; }
 return $q ? $this->get('/templates?' . http_build_query($q)) : $this->get('/templates');
 }
 public function getProfile(string $phoneNumberId): array { return $this->get('/profile/' . urlencode($phoneNumberId)); }
 public function updateProfile(string $phoneNumberId, array $fields): array { return $this->patch('/profile/' . urlencode($phoneNumberId), $fields); }
 public function reportsSummary(string $period = '30d'): array { return $this->get('/reports/summary?period=' . urlencode($period)); }

 // ── Medya ────────────────────────────────────────────────────────
 // Webhook'taki data.media.media_id degerini dogrudan kullanin.
 // Depodaki dosya yollarina dogrudan HTTP erisimi KAPALIDIR.

 /** Medya kayitlarini listeler (yeniden eskiye). */
 public function listMedia(array $filtre = []): array
 {
 $q = ['limit' => (int) ($filtre['limit'] ?? 50)];
 foreach (['source', 'kind'] as $k) {
 if (!empty($filtre[$k])) { $q[$k] = (string) $filtre[$k]; }
 }
 if (!empty($filtre['cursor'])) { $q['cursor'] = (int) $filtre['cursor']; }

 return $this->get('/media?' . http_build_query($q));
 }

 /** Dosyayi indirmeden ustveri doner. */
 public function mediaInfo(int $mediaId): array { return $this->get('/media/' . $mediaId . '?meta=1'); }

 /**
  * Medya dosyasini indirir.
  * $hedefYol verilirse diske yazar ve yolu doner; verilmezse ikili icerik doner.
  */
 public function downloadMedia(int $mediaId, ?string $hedefYol = null)
 {
 $ch = curl_init($this->baseUrl . '/media/' . $mediaId);
 $fp = null;
 if ($hedefYol !== null) {
 $fp = fopen($hedefYol, 'wb');
 if ($fp === false) {
 throw new VeriMerkeziException('Hedef dosya acilamadi: ' . $hedefYol, 0);
 }
 curl_setopt($ch, CURLOPT_FILE, $fp);
 } else {
 curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
 }
 curl_setopt_array($ch, [
 CURLOPT_HTTPHEADER => [
 'Authorization: Bearer ' . $this->apiKey,
 'User-Agent: VeriMerkezi-PHP-SDK/' . self::VERSION,
 ],
 CURLOPT_TIMEOUT => 300,
 ]);
 $govde = curl_exec($ch);
 $kod = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
 curl_close($ch);
 if ($fp !== null) { fclose($fp); }

 if ($kod !== 200) {
 if ($hedefYol !== null) { @unlink($hedefYol); }
 throw new VeriMerkeziException('Medya indirilemedi (HTTP ' . $kod . ')', $kod);
 }

 return $hedefYol ?? $govde;
 }

 // ── Alıntılı cevap + tepki (2026-09-22) ────────────────────────────────
 public function sendReply(string $phoneNumberId, string $to, string $text, string $replyToWamid): array
 {
 return $this->post('/messages', ['phone_number_id' => $phoneNumberId, 'to' => $to, 'text' => $text, 'context' => ['message_id' => $replyToWamid]]);
 }
 /** emoji '' → önceki tepkiyi kaldırır. */
 public function reactToMessage(string $phoneNumberId, string $to, string $messageId, string $emoji): array
 {
 return $this->post('/messages', ['phone_number_id' => $phoneNumberId, 'to' => $to, 'type' => 'reaction', 'reaction' => ['message_id' => $messageId, 'emoji' => $emoji]]);
 }

 /** Dosyayı Meta'ya yükler → media_id (30 gün geçerli). */
 public function uploadMedia(string $phoneNumberId, string $filePath, ?string $mimeType = null): array
 {
 if (!is_file($filePath)) { throw new VeriMerkeziException('Dosya bulunamadı: ' . $filePath, 0); }
 $mime = $mimeType ?: ((new \finfo(FILEINFO_MIME_TYPE))->file($filePath) ?: 'application/octet-stream');
 $ch = curl_init($this->baseUrl . '/media');
 curl_setopt_array($ch, [
 CURLOPT_RETURNTRANSFER => true,
 CURLOPT_POST => true,
 CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $this->apiKey, 'User-Agent: VeriMerkezi-PHP-SDK/' . self::VERSION],
 CURLOPT_POSTFIELDS => ['phone_number_id' => $phoneNumberId, 'file' => new \CURLFile($filePath, $mime, basename($filePath))],
 CURLOPT_TIMEOUT => 300,
 ]);
 $raw = curl_exec($ch); $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
 $j = json_decode((string) $raw, true) ?: [];
 if ($status < 200 || $status >= 300) { throw new VeriMerkeziException($j['error']['message'] ?? ('HTTP ' . $status), $status, $j['error']['code'] ?? null); }
 return $j;
 }

 /** Uzlaştırma: mesaj kayıtları (okuma — kredi düşmez). */
 public function listMessages(array $filtre): array
 {
 $q = ['phone_number_id' => (string) ($filtre['phone_number_id'] ?? ''), 'limit' => (int) ($filtre['limit'] ?? 50)];
 foreach (['since', 'cursor'] as $k) { if (!empty($filtre[$k])) { $q[$k] = (string) $filtre[$k]; } }
 return $this->get('/messages?' . http_build_query($q));
 }
 public function redeliverWebhooks(string $since): array { return $this->post('/webhooks/redeliver', ['since' => $since]); }
 public function historyImportStatus(string $phoneNumberId): array { return $this->get('/numbers/' . rawurlencode($phoneNumberId) . '/history-import'); }
 public function startHistoryImport(string $phoneNumberId): array { return $this->post('/numbers/' . rawurlencode($phoneNumberId) . '/history-import', []); }
 public function numberSettings(string $phoneNumberId, array $settings): array { return $this->patch('/numbers/' . rawurlencode($phoneNumberId) . '/settings', $settings); }
 public function health(): array { return $this->get('/health'); }

 // ── Hesap ayarları + KVKK (2026-09-25) ───────────────────────────────
 /** $settings: revoke_edit_clean, automation_enabled, opt_out_autoreply_enabled (tüm numaralar), default_automation_enabled, default_opt_out_autoreply_enabled (yeni numaralar) — bool, en az bir alan. */
 public function accountSettings(array $settings): array { return $this->patch('/account/settings', $settings); }

 /** $retention: messages_days (1-3650), media_days (1-3650), webhook_deliveries_days (1-365) — en az bir alan. */
 public function updateRetention(array $retention): array { return $this->patch('/account/retention', $retention); }

 /** KVKK silme/unutulma — waId (telefon) veya userId (BSUID) zorunlu. 202 + privacy.erasure_completed olayı. */
 public function privacyErasure(?string $waId = null, ?string $userId = null, ?string $phoneNumberId = null): array
 {
 $body = array_filter(['wa_id' => $waId, 'user_id' => $userId, 'phone_number_id' => $phoneNumberId], fn ($v) => $v !== null);
 return $this->post('/privacy/erasure', $body);
 }

 // ── Sandbox (yalnız vmk_test_ anahtarı) ────────────────────────────────
 /** Sahte gelen mesaj enjekte eder (type: text|revoke|edit) → imzalı olaylar aboneliklere gider. $opts: from, text, original_message_id. */
 public function testInbound(string $phoneNumberId, string $type = 'text', array $opts = []): array
 {
 return $this->post('/test/inbound', ['phone_number_id' => $phoneNumberId, 'type' => $type] + $opts);
 }

 // ── Şablon yönetimi (2026-09-23) ───────────────────────────────────────
 // Şablonların oluşturulması, doğrulanması, güncellenmesi ve silinmesi.
 // $data gövdesi: waba_id VEYA phone_number_id + name + language + category
 // + components (sözleşme: docs/SDK-CONTRACT). Kategoriler: UTILITY | MARKETING
 // | AUTHENTICATION.

 /** Yeni şablon oluşturur (Meta'ya gönderilir; yanıtta status genelde PENDING). */
 public function createTemplate(array $data): array { return $this->post('/templates', $data); }

 /** Şablonu Meta'ya GÖNDERMEDEN doğrular (components + waba_id/phone_number_id zorunlu). */
 public function validateTemplate(array $data): array { return $this->post('/templates/validate', $data); }

 /** Tek bir şablonu bileşenleriyle birlikte döner. */
 public function getTemplate(int $id): array { return $this->get('/templates/' . $id); }

 /** Şablonu günceller (durum PENDING olur). $opts['category'] ile kategori değiştirilebilir. */
 public function updateTemplate(int $id, array $components, array $opts = []): array
 {
 $body = ['components' => $components];
 if (isset($opts['category'])) { $body['category'] = $opts['category']; }
 return $this->patch('/templates/' . $id, $body);
 }

 /** Şablonu siler. */
 public function deleteTemplate(int $id): array { return $this->delete('/templates/' . $id); }

 // ── Webhooks ───────────────────────────────────────────────────────────
 // Webhook abonelikleri artık programatik olarak yönetilebilir:
 // createWebhook / listWebhooks / updateWebhook / deleteWebhook / testWebhook.
 // secret YALNIZCA createWebhook yanıtında bir kez döner — güvenli saklayın.
 // Gelen istekleri doğrulamak için SDK hâlâ verifyWebhookSignature() (aşağıda)
 // ve examples/php/webhook-receiver.php sağlar.
 // Not: '*' (joker), joker-dışı yeni olayları (credit.low/exhausted,
 // message.revoked/edited/history/sent, number.status_changed) KAPSAMAZ;
 // bunları almak için events listesine açıkça ekleyin.

 /** Webhook aboneliği oluşturur. events boşsa ['*'] gönderilir. secret yalnızca burada döner. */
 public function createWebhook(string $url, array $events = ['*'], ?string $description = null): array
 {
 $body = ['url' => $url, 'events' => $events];
 if ($description !== null) { $body['description'] = $description; }
 return $this->post('/webhooks', $body);
 }

 /** Webhook aboneliklerini listeler (secret dönmez). */
 public function listWebhooks(): array { return $this->get('/webhooks'); }

 /** Webhook aboneliğini günceller. $fields: url?, events?, active?, description? (en az bir alan). */
 public function updateWebhook(int $id, array $fields): array { return $this->patch('/webhooks/' . $id, $fields); }

 /** Webhook aboneliğini siler. */
 public function deleteWebhook(int $id): array { return $this->delete('/webhooks/' . $id); }

 /** Aboneliğe anında bir test.ping teslimatı dener. */
 public function testWebhook(int $id): array { return $this->post('/webhooks/' . $id . '/test', []); }

 /** Secret'ı yerinde döndürür; yeni secret YALNIZCA bu yanıtta döner. $graceSeconds (0-604800, vars. 86400) boyunca eski secret ikinci imza olarak gönderilir. */
 public function rotateWebhookSecret(int $id, ?int $graceSeconds = null): array
 {
 return $this->post('/webhooks/' . $id . '/rotate-secret', $graceSeconds !== null ? ['grace_seconds' => $graceSeconds] : []);
 }

 // ── Arama (Calling) — 2026-10-08 ─────────────────────────────────────
 // Ses WebRTC ile Meta <-> sizin uç arasında akar; API yalnız SDP iletir. Kredi düşmez.
 // Olaylar: call.connect / call.status / call.terminate / call.permission_reply ('*' kapsamaz — açıkça ekleyin).
 // Yanıtta 'eligibility': eligible_inbound / eligible_outbound / checks[] (key, ok, title_tr, detail_tr, how_to_fix_tr).
 public function getCallingSettings(string $phoneNumberId, bool $raw = false): array
 {
 return $this->get('/numbers/' . rawurlencode($phoneNumberId) . '/calling' . ($raw ? '?raw=1' : ''));
 }

 /** $settings: enabled, callback_permission, call_icon_visibility, call_hours — yalnız verilenler değişir. */
 public function updateCallingSettings(string $phoneNumberId, array $settings): array
 {
 return $this->patch('/numbers/' . rawurlencode($phoneNumberId) . '/calling', $settings);
 }

 /** İşletme başlatmalı arama (kullanıcının arama izni gerekir). ['call_id' => ...] döner. */
 public function startCall(string $phoneNumberId, string $to, string $sdpOffer, ?string $bizOpaque = null): array
 {
 $body = ['phone_number_id' => $phoneNumberId, 'to' => $to, 'sdp_offer' => $sdpOffer];
 if ($bizOpaque !== null) $body['biz_opaque'] = $bizOpaque;
 return $this->post('/calls', $body);
 }

 public function preAcceptCall(string $callId, string $sdpAnswer): array { return $this->callAction($callId, 'pre_accept', ['sdp_answer' => $sdpAnswer]); }
 public function acceptCall(string $callId, string $sdpAnswer): array { return $this->callAction($callId, 'accept', ['sdp_answer' => $sdpAnswer]); }
 public function rejectCall(string $callId): array { return $this->callAction($callId, 'reject', []); }
 public function terminateCall(string $callId): array { return $this->callAction($callId, 'terminate', []); }

 public function requestCallPermission(string $phoneNumberId, string $to, ?string $body = null): array
 {
 $payload = ['phone_number_id' => $phoneNumberId, 'to' => $to];
 if ($body !== null) $payload['body'] = $body;
 return $this->post('/calls/permission-request', $payload);
 }

 public function getCallPermission(string $phoneNumberId, string $to): array
 {
 return $this->get('/calls/permission?' . http_build_query(['phone_number_id' => $phoneNumberId, 'to' => $to]));
 }

 /** $filtre: phone_number_id, from, to (ISO 8601), peer, cursor, limit */
 public function listCalls(array $filtre = []): array
 {
 $q = http_build_query(array_filter($filtre, fn ($v) => $v !== null && $v !== ''));
 return $this->get('/calls' . ($q !== '' ? '?' . $q : ''));
 }

 /** call_id '/' içerirse yol yerine '_' + gövdede call_id gönderilir. */
 private function callAction(string $callId, string $action, array $body): array
 {
 if (str_contains($callId, '/')) {
 return $this->post('/calls/_/' . $action, $body + ['call_id' => $callId]);
 }
 return $this->post('/calls/' . rawurlencode($callId) . '/' . $action, $body);
 }

 // ── Formlar (WhatsApp Flows) — 2026-10-08 ─────────────────────────────
 // Formlar WABA düzeyindedir. Yönetim kredisiz; form mesajı (sendFlow) normal mesaj gibi 1 kredi.
 // Olaylar: flow.completed / flow.status_changed ('*' kapsamaz — açıkça ekleyin).
 // $phoneNumberId (isteğe bağlı) Meta arayüzünde oluşturulmuş formu hesabınıza bağlamak içindir.
 public function listFlows(string $phoneNumberId, ?int $limit = null, ?string $after = null): array
 {
 $q = ['phone_number_id' => $phoneNumberId];
 if ($limit !== null) $q['limit'] = $limit;
 if ($after !== null && $after !== '') $q['after'] = $after;
 return $this->get('/flows?' . http_build_query($q));
 }

 /** @param array|string $flowJson nesne (dizi) ya da JSON metni (≤ 10 MB) */
 public function createFlow(string $phoneNumberId, string $name, array $categories, $flowJson, ?string $endpointUri = null): array
 {
 $body = ['phone_number_id' => $phoneNumberId, 'name' => $name, 'categories' => array_values($categories), 'flow_json' => $flowJson];
 if ($endpointUri !== null && $endpointUri !== '') $body['endpoint_uri'] = $endpointUri;
 return $this->post('/flows', $body);
 }

 public function getFlow(string $flowId, ?string $phoneNumberId = null): array { return $this->get($this->flowPath($flowId, '', $phoneNumberId)); }
 /** Yalnız DRAFT form. */
 public function updateFlowJson(string $flowId, $flowJson, ?string $phoneNumberId = null): array { return $this->put($this->flowPath($flowId, '/json', $phoneNumberId), ['flow_json' => $flowJson]); }
 public function publishFlow(string $flowId, ?string $phoneNumberId = null): array { return $this->post($this->flowPath($flowId, '/publish', $phoneNumberId), []); }
 public function deprecateFlow(string $flowId, ?string $phoneNumberId = null): array { return $this->post($this->flowPath($flowId, '/deprecate', $phoneNumberId), []); }
 /** Yalnız DRAFT form. */
 public function deleteFlow(string $flowId, ?string $phoneNumberId = null): array { return $this->delete($this->flowPath($flowId, '', $phoneNumberId)); }

 public function getFlowPreview(string $flowId, bool $invalidate = false, ?string $phoneNumberId = null): array
 {
 $p = $this->flowPath($flowId, '/preview', $phoneNumberId);
 return $this->get($p . ($invalidate ? (str_contains($p, '?') ? '&' : '?') . 'invalidate=true' : ''));
 }

 /** $filtre: from, to (YYYY-MM-DD), metric (ENDPOINT_REQUEST_COUNT ...), granularity (DAY|HOUR|LIFETIME), phone_number_id */
 public function getFlowMetrics(string $flowId, array $filtre = []): array
 {
 $q = http_build_query(array_filter([
 'from' => $filtre['from'] ?? null, 'to' => $filtre['to'] ?? null, 'metric' => $filtre['metric'] ?? null,
 'granularity' => $filtre['granularity'] ?? null, 'phone_number_id' => $filtre['phone_number_id'] ?? null,
 ], fn ($v) => $v !== null && $v !== ''));
 return $this->get('/flows/' . rawurlencode($flowId) . '/metrics' . ($q !== '' ? '?' . $q : ''));
 }

 /**
 * Form mesajı. $flow: flow_id | flow_name, flow_token?, cta (≤20), body, header?, footer?, mode (published|draft), action?, screen, data?
 * Yanıttaki flow.flow_token, flow.completed olayında aynen döner.
 */
 public function sendFlow(string $phoneNumberId, string $to, array $flow): array
 {
 return $this->post('/messages', ['phone_number_id' => $phoneNumberId, 'to' => $to, 'type' => 'flow', 'flow' => $flow]);
 }

 private function flowPath(string $flowId, string $suffix, ?string $phoneNumberId): string
 {
 return '/flows/' . rawurlencode($flowId) . $suffix . ($phoneNumberId ? '?phone_number_id=' . rawurlencode($phoneNumberId) : '');
 }

 private function get(string $path): array { return $this->request('GET', $path); }
 private function post(string $path, array $body): array { return $this->request('POST', $path, $body); }
 private function patch(string $path, array $body): array { return $this->request('PATCH', $path, $body); }
 private function put(string $path, array $body): array { return $this->request('PUT', $path, $body); }
 private function delete(string $path): array { return $this->request('DELETE', $path); }

 private function request(string $method, string $path, ?array $body = null): array
 {
 $url = $this->baseUrl . $path;
 $idempotencyKey = $this->generateUuid();
 $attempt = 0;

 while ($attempt < $this->maxRetries) {
 $attempt++;
 $ch = curl_init($url);
 $headers = [
 'Authorization: Bearer ' . $this->apiKey,
 'Content-Type: application/json',
 'Accept: application/json',
 'User-Agent: VeriMerkezi-PHP-SDK/' . self::VERSION,
 ];
 if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
 $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
 }
 curl_setopt_array($ch, [
 CURLOPT_RETURNTRANSFER => true,
 CURLOPT_CUSTOMREQUEST => $method,
 CURLOPT_HTTPHEADER => $headers,
 CURLOPT_TIMEOUT => $this->timeout,
 CURLOPT_CONNECTTIMEOUT => 10,
 ]);
 if ($body !== null) {
 curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
 }
 $raw = curl_exec($ch);
 $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
 $err = curl_error($ch);
 curl_close($ch);

 if ($err && $attempt < $this->maxRetries) { usleep($attempt * 500000); continue; }
 if ($err) throw new VeriMerkeziException('Bağlantı hatası: ' . $err, 0);

 $data = json_decode((string)$raw, true);
 if (!is_array($data)) throw new VeriMerkeziException('Geçersiz JSON yanıt', $status);

 if ($status >= 500 && $attempt < $this->maxRetries) { usleep($attempt * 1000000); continue; }
 if ($status === 429 && $attempt < $this->maxRetries) {
 $retryAfter = (int) ($data['error']['retry_after'] ?? 5);
 sleep(min(30, $retryAfter));
 continue;
 }

 if ($status >= 400) {
 $errData = $data['error'] ?? [];
 throw new VeriMerkeziException(
 $errData['message'] ?? 'API hatası',
 $status,
 $errData['code'] ?? null,
 $errData
 );
 }
 return $data;
 }
 throw new VeriMerkeziException('Max retry aşıldı', 0);
 }

 private function generateUuid(): string
 {
 $data = random_bytes(16);
 $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
 $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
 return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
 }

 public static function verifyWebhookSignature(string $secret, string $body, string $signature, int $timestamp, int $toleranceSec = 300): bool
 {
 if (abs(time() - $timestamp) > $toleranceSec) return false;
 $expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, $secret);
 return hash_equals($expected, $signature);
 }
}

class VeriMerkeziException extends \RuntimeException
{
 public ?string $errorCode;
 public ?array $errorData;
 public function __construct(string $message, int $statusCode = 0, ?string $errorCode = null, ?array $errorData = null)
 {
 parent::__construct($message, $statusCode);
 $this->errorCode = $errorCode;
 $this->errorData = $errorData;
 }
}
