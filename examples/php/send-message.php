<?php
/**
 * Veri Merkezi WhatsApp API — Mesaj Gönderim Örneği (PHP)
 *
 * Çalıştırma:
 * php examples/php/send-message.php
 */

require __DIR__ . '/../../sdk/php/src/VeriMerkeziClient.php';

// ── Konfigürasyon (production'da .env'den okuyun) ─────────────────
$apiKey = getenv('VM_API_KEY') ?: 'vmk_live_XXXXXXXX';
$phoneNumberId = getenv('VM_PHONE_NUMBER_ID') ?: '1234567890';
$recipient = '905551112233'; // E.164 (başında + yok)

$vm = new VeriMerkezi\VeriMerkeziClient($apiKey);

// ────────────────────────────────────────────────────────────────
// ÖRNEK 1 — Düz Metin (yalnızca 24h service window içinde)
// ────────────────────────────────────────────────────────────────
try {
 $response = $vm->sendText($phoneNumberId, $recipient, 'Merhaba! Bu test mesajıdır.');
 echo "Metin mesajı gönderildi: " . $response['wamid'] . "\n";
} catch (Exception $e) {
 echo "Hata: " . $e->getMessage() . "\n";
}

// ────────────────────────────────────────────────────────────────
// ÖRNEK 2 — Şablon (24h dışında zorunlu)
// ────────────────────────────────────────────────────────────────
try {
 $response = $vm->sendTemplate(
 $phoneNumberId,
 $recipient,
 'hosgeldin', // şablonunuzun adı
 'tr',
 [
 [
 'type' => 'body',
 'parameters' => [
 ['type' => 'text', 'text' => 'Ahmet'],
 ],
 ],
 ]
 );
 echo "Şablon gönderildi: " . $response['wamid'] . "\n";
} catch (Exception $e) {
 echo "Hata: " . $e->getMessage() . "\n";
}

// ────────────────────────────────────────────────────────────────
// ÖRNEK 3 — Dinamik URL Butonlu Şablon (her alıcıya özel link)
// Şablon panelde, URL butonunun sonu {{1}} olacak şekilde oluşturulur.
// Gönderimde button bileşeniyle değişken kısım doldurulur.
// ────────────────────────────────────────────────────────────────
try {
 $response = $vm->sendTemplate(
 $phoneNumberId,
 $recipient,
 'sepet_kurtarma',
 'tr',
 [
 [
 'type' => 'body',
 'parameters' => [
 ['type' => 'text', 'text' => 'Ahmet'],
 ],
 ],
 [
 'type' => 'button',
 'sub_type' => 'url',
 'index' => 0,
 'parameters' => [
 ['type' => 'text', 'text' => 'd32eec6c,5cbd62f6'],
 ],
 ],
 ]
 );
 echo "Dinamik URL butonlu şablon gönderildi: " . $response['wamid'] . "\n";
} catch (Exception $e) {
 echo "Hata: " . $e->getMessage() . "\n";
}
