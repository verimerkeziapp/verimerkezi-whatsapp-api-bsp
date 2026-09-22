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
| `sendOtp($phoneId, $to, $templateName, $code, $lang = 'tr')` | OTP / doğrulama kodu (AUTHENTICATION şablonu) |
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
| `listTemplates($filters = [])` | Şablon listesi (`status`, `category`, `language`, `q`, `cursor`, `limit`) |
| `createTemplate($data)` | Yeni şablon oluştur (Meta'ya gönderilir) |
| `validateTemplate($data)` | Şablonu Meta'ya göndermeden doğrula |
| `getTemplate($id)` | Tek şablon (bileşenleriyle) |
| `updateTemplate($id, $components, $opts = [])` | Şablonu güncelle (`$opts['category']` opsiyonel) |
| `deleteTemplate($id)` | Şablonu sil |
| `createWebhook($url, $events = ['*'], $description = null)` | Webhook aboneliği oluştur (secret yalnızca burada döner) |
| `listWebhooks()` | Webhook aboneliklerini listele |
| `updateWebhook($id, $fields)` | Webhook aboneliğini güncelle |
| `deleteWebhook($id)` | Webhook aboneliğini sil |
| `testWebhook($id)` | Aboneliğe test.ping teslimatı dene |
| `getProfile($phoneId)` | Numara profili |
| `updateProfile($phoneId, $fields)` | Profil güncelle |
| `reportsSummary($period = '30d')` | Rapor özeti |
| `listMedia($filtre = [])` | Medya kayıtları (`source`, `kind`, `cursor`, `limit`) |
| `mediaInfo($mediaId)` | Medya üstverisi (boyut, tür, sha256) |
| `downloadMedia($mediaId, $hedefYol = null)` | Gelen medyayı indir — yol verilirse diske yazar ve yolu döner, verilmezse içeriği döner |

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

## Gelen Medyayı İndirme

Webhook'taki `data.media.media_id` ile dosyayı indirin (anahtarda `messages:read` ya da Tam Yetki gerekir):

```php
$vm->downloadMedia(13109, __DIR__ . '/gelen.jpeg');   // diske yazar, yolu döner (önerilen)
$icerik = $vm->downloadMedia(13109);                  // ikili içerik döner
$bilgi  = $vm->mediaInfo(13109);                      // boyut, tür, sha256
$liste  = $vm->listMedia(['source' => 'inbound', 'limit' => 50]);
```

Ayrıntılar: [docs/10-media.md](../../docs/10-media.md)

## Şablon Yönetimi

Şablonları programatik olarak oluşturabilir, doğrulayabilir, güncelleyebilir ve
silebilirsiniz. `waba_id` **veya** `phone_number_id` (biri zorunlu) ile birlikte
`name`, `language`, `category` (`UTILITY` · `MARKETING` · `AUTHENTICATION`) ve
`components` gönderilir.

```php
// Yeni şablon oluştur (Meta'ya gönderilir; yanıtta status genelde PENDING)
$sablon = $vm->createTemplate([
    'waba_id'  => '1029384756',
    'name'     => 'police_yenileme',
    'language' => 'tr',
    'category' => 'UTILITY',
    'components' => [
        ['type' => 'BODY', 'text' => 'Sayın {{1}}, poliçeniz {{2}} tarihinde yenilenecek.',
         'example' => ['body_text' => [['Ahmet', '12.10.2026']]]],
        ['type' => 'FOOTER', 'text' => 'Mim Gökmen Sigorta'],
    ],
]);
echo $sablon['id'] . ' → ' . $sablon['status']; // 123 → PENDING

// Göndermeden önce doğrula (Meta'ya gitmez)
$vm->validateTemplate([...]);   // ['ok' => true, 'valid' => true, ...]

// Filtreli liste
$onayli = $vm->listTemplates([
    'status'   => 'APPROVED',
    'category' => 'UTILITY',
    'language' => 'tr',
    'limit'    => 50,
]);

// Tek şablon, güncelle, sil
$tek = $vm->getTemplate(123);
$vm->updateTemplate(123, $yeniComponents, ['category' => 'UTILITY']); // durum PENDING olur
$vm->deleteTemplate(123);
```

## Webhook Aboneliği Yönetimi

Webhook abonelikleri artık panele girmeden koddan yönetilebilir. **`secret`
yalnızca `createWebhook` yanıtında bir kez döner** — güvenli saklayın.

`*` (joker) yalnızca eski olayları kapsar; `credit.low`, `credit.exhausted`,
`message.revoked/edited/history/sent`, `number.status_changed` gibi yeni olayları
almak için bunları `events` listesine açıkça ekleyin.

```php
// Abonelik oluştur (secret yalnızca burada döner)
$wh = $vm->createWebhook(
    'https://ornek.com/wa-webhook',
    ['message.received', 'template.approved', 'credit.low'],
    'Üretim webhook'
);
$secret = $wh['secret']; // whsec_... → güvenli sakla, bir daha dönmez

// Listele / güncelle / test / sil
$vm->listWebhooks();
$vm->updateWebhook($wh['id'], ['active' => false]);
$vm->testWebhook($wh['id']);   // ['ok' => true, 'result' => 'delivered']
$vm->deleteWebhook($wh['id']);
```

Gelen webhook isteklerini doğrulamak için `verifyWebhookSignature()` kullanılır
(bkz. `examples/php/webhook-receiver.php`).

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
