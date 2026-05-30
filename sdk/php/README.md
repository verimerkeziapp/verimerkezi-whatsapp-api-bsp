# Veri Merkezi WhatsApp SDK — PHP

[![Packagist](https://img.shields.io/badge/composer-verimerkezi%2Fwhatsapp--sdk-blue)](https://packagist.org/packages/verimerkezi/whatsapp-sdk)

## Kurulum

### Composer ile
```bash
composer require verimerkezi/whatsapp-sdk
```

### Manuel (tek dosya)
```bash
curl -O https://api.verimerkezi.app/sdk/php/VeriMerkeziClient.php
```

## Hızlı Başlangıç

```php
<?php
require 'vendor/autoload.php'; // veya require 'VeriMerkeziClient.php';

$vm = new VeriMerkezi\VeriMerkeziClient('vmk_live_xxxxxxxxxxxxxxxx');

// Düz metin
$vm->sendText('1234567890', '905551234567', 'Merhaba!');

// Şablon
$vm->sendTemplate('1234567890', '905551234567', 'siparis_onayi', 'tr', [
 [
 'type' => 'body',
 'parameters' => [['type' => 'text', 'text' => 'Ahmet']],
 ],
]);

// PDF
$vm->sendDocument('1234567890', '905551234567',
 'https://cdn.firmaniz.com/fatura.pdf',
 'fatura.pdf',
 'Mayıs faturanız'
);
```

## API Referansı

Tüm metotlar:

| Metot | Açıklama |
|---|---|
| `sendText($phoneId, $to, $body)` | Düz metin |
| `sendImage($phoneId, $to, $url, $caption = null)` | Görsel |
| `sendDocument($phoneId, $to, $url, $filename, $caption = null)` | PDF/Doküman |
| `sendVideo($phoneId, $to, $url, $caption = null)` | Video |
| `sendTemplate($phoneId, $to, $name, $lang, $components = [])` | Şablon |
| `sendLocation($phoneId, $to, $lat, $lng, $name = null, $address = null)` | Konum |
| `sendReaction($phoneId, $to, $messageId, $emoji)` | Reaction |
| `getConversation($phone, $cursor = null)` | Sohbet geçmişi |
| `createTemplate($payload)` | Şablon oluştur |
| `listTemplates()` | Şablon listesi |
| `uploadMedia($filePath, $type)` | Medya yükle |
| `me()` | Hesap bilgisi |

## Hata Yönetimi

```php
use VeriMerkezi\VeriMerkeziException;

try {
 $vm->sendText('...', '...', '...');
} catch (VeriMerkeziException $e) {
 echo "Hata: " . $e->getMessage() . "\n";
 echo "Code: " . $e->getCode() . "\n"; // HTTP status
 echo "Meta code: " . $e->metaCode . "\n"; // Meta error code
}
```

## Otomatik Retry

SDK 5xx hatalarda otomatik 3 retry yapar (exponential backoff: 1s -> 2s -> 4s).

```php
$vm = new VeriMerkeziClient(
 apiKey: 'vmk_live_...',
 timeout: 30,
 maxRetries: 3 // varsayılan
);
```

## Idempotency

SDK her POST için otomatik UUID üretir. Manuel kontrol:

```php
$vm->withIdempotencyKey('order-42')->sendTemplate(...);
```

## Gereksinimler

- PHP 8.1+
- `ext-curl`, `ext-json`

## Lisans

MIT
