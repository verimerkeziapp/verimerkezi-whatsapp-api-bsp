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
$response = $vm->sendTemplate('1234567890', '905551234567', 'siparis_onayi', 'tr', [
 [
 'type' => 'body',
 'parameters' => [['type' => 'text', 'text' => 'Ahmet']],
 ],
]);

// Yanıt düz bir nesnedir; gönderilen mesaj kimliği:
echo $response['wamid'];
```

## API Referansı

Tüm metotlar:

| Metot | Açıklama |
|---|---|
| `sendText($phoneId, $to, $body)` | Düz metin (24h service window içinde) |
| `sendTemplate($phoneId, $to, $name, $lang, $components = [])` | Şablon mesajı |
| `sendImage($phoneId, $to, $link, $caption = null)` | Resim (link, 24h pencere · ≤5MB jpeg/png · 1 kredi) |
| `sendVideo($phoneId, $to, $link, $caption = null)` | Video (link, 24h pencere · ≤16MB mp4 · 1 kredi) |
| `sendAudio($phoneId, $to, $link)` | Ses (link, 24h pencere · ≤16MB · 1 kredi) |
| `sendDocument($phoneId, $to, $link, $filename = null, $caption = null)` | Belge (link, 24h pencere · ≤100MB pdf/doc · 1 kredi) |
| `markRead($phoneId, $messageId, $typing = false)` | Gelen mesajı okundu işaretle (mavi tik); `typing:true` → ~25sn "yazıyor…" (kredisiz) |
| `me()` | Hesap bilgisi |
| `numbers()` | WhatsApp numaraları |
| `listContacts($cursor = null, $limit = 50, $search = null)` | Kişi listesi |
| `createContact($phone, $name, $extra = [])` | Kişi oluştur |
| `bulkContacts($contacts, $skipDuplicates = true)` | Toplu kişi ekle |
| `listTemplates()` | Şablon listesi |
| `getProfile($phoneId)` | Numara profili |
| `updateProfile($phoneId, $fields)` | Profil güncelle |
| `reportsSummary($period = '30d')` | Rapor özeti |

`POST /messages` yanıtı düz bir nesnedir (`messages[]` dizisi yoktur):

```php
['ok' => true, 'id' => ..., 'wamid' => ..., 'to' => ..., 'type' => ...,
 'status' => ..., 'mode' => ..., 'simulated' => ..., 'credits_used' => ..., 'balance' => ...]
```

## Medya gönderme

Medya, herkese açık bir **https** link ile gönderilir ve yalnızca **24 saatlik
müşteri hizmet penceresi** içinde çalışır (müşteri size son 24 saatte yazmış
olmalı). Pencere dışında Meta `131047` döner — bu durumda şablon kullanın.
Her medya mesajı 1 kredi harcar.

```php
// Video (link + opsiyonel açıklama)
$vm->sendVideo(
    '1234567890',
    '905551234567',
    'https://verimerkezi.app/uploads/tanitim.mp4',
    'Yeni ürün tanıtımımız 🎬'
);

// Resim / ses / belge de aynı şekilde:
$vm->sendImage('1234567890', '905551234567', 'https://.../afis.jpg', 'Kampanya');
$vm->sendAudio('1234567890', '905551234567', 'https://.../sesli-mesaj.mp3');
$vm->sendDocument('1234567890', '905551234567', 'https://.../fatura.pdf', 'fatura.pdf');
```

Limitler: resim ≤5MB (jpeg/png), video ≤16MB (mp4), ses ≤16MB, belge ≤100MB (pdf/doc).

## Okundu + yazıyor

Gelen bir mesajı okundu işaretler (mavi tik). `typing: true` verirseniz, müşteriye
~25 saniye boyunca "yazıyor…" göstergesi gösterilir. Kredi harcamaz.

```php
// Gelen mesajı okundu işaretle + "yazıyor…" göster
$vm->markRead('1234567890', 'wamid.HBgM...', typing: true);
```

## Hata Yönetimi

```php
use VeriMerkezi\VeriMerkeziException;

try {
 $vm->sendText('...', '...', '...');
} catch (VeriMerkeziException $e) {
 echo "Hata: " . $e->getMessage() . "\n";
 echo "Code: " . $e->getCode() . "\n"; // HTTP status
 echo "Error code: " . $e->errorCode . "\n"; // error.code
 // $e->errorData → tüm error nesnesi (code, message, field?)
}
```

## Otomatik Retry

SDK 5xx hatalarda otomatik 3 retry yapar (linear backoff: 1s -> 2s).
429 (rate limit) durumunda yanıttaki `retry_after` saniyesi kadar bekler.

```php
$vm = new VeriMerkezi\VeriMerkeziClient(
 apiKey: 'vmk_live_...',
 timeout: 30,
 maxRetries: 3 // varsayılan
);
```

## Idempotency

SDK her POST/PATCH isteği için otomatik bir `Idempotency-Key` (UUID) başlığı üretir;
böylece retry'larda aynı işlem iki kez gerçekleşmez.

## Gereksinimler

- PHP 8.1+
- `ext-curl`, `ext-json`

## Lisans

MIT
