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
 * https://verimerkezi.app/panel/api/dokuman
 */

namespace VeriMerkezi;

class VeriMerkeziClient
{
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

 public function sendText(string $phoneNumberId, string $to, string $text): array
 {
 return $this->post('/messages', [
 'phone_number_id' => $phoneNumberId,
 'to' => $to,
 'text' => $text,
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

 public function listTemplates(): array { return $this->get('/templates'); }
 public function getProfile(string $phoneNumberId): array { return $this->get('/profile/' . urlencode($phoneNumberId)); }
 public function updateProfile(string $phoneNumberId, array $fields): array { return $this->patch('/profile/' . urlencode($phoneNumberId), $fields); }
 public function reportsSummary(string $period = '30d'): array { return $this->get('/reports/summary?period=' . urlencode($period)); }

 // ── Webhooks ───────────────────────────────────────────────────────────
 // Webhook'lar panelden yapılandırılır (panel/api/webhooks) — programatik
 // webhook API'si yoktur. SDK yalnızca alıcı + imza doğrulaması sağlar:
 // verifyWebhookSignature() (aşağıda) ve examples/php/webhook-receiver.php.

 private function get(string $path): array { return $this->request('GET', $path); }
 private function post(string $path, array $body): array { return $this->request('POST', $path, $body); }
 private function patch(string $path, array $body): array { return $this->request('PATCH', $path, $body); }
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
 'User-Agent: VeriMerkezi-PHP-SDK/1.0',
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
