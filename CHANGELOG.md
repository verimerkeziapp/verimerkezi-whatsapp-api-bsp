# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir. Format [Keep a Changelog](https://keepachangelog.com/) standardını takip eder.

## [2.10.0] — 2026-09-25

> Webhook `*` artık açık listeye genişletilir + aynı adrese ikinci aktif abonelik engeli. **Geriye uyum:** `["*"]` gönderen istemciler 422 almaz (sessizce genişletilir); mevcut `*` abonelikleri tek seferlik göçle açık listeye çevrildi, bugün aldıkları olaylar birebir korundu.

### Değişiklikler — Webhook `"*"` genişletme
- `POST` / `PATCH /wa/webhooks`: `events: ["*"]` artık **saklanmaz**; o anki klasik olay listesine (12 olay = `WILDCARD_EVENTS`) genişletilerek kaydedilir. `["*"]` gönderen istemciler `422` almaz — sessizce genişletilir, yanıtta bilgilendirici `note` döner. İleride eklenen yeni olay türleri eski aboneliklere kendiliğinden gitmez. Var olan `"*"` abonelikleri (4 adet) tek seferlik göçle açık listeye çevrildi; bugünkü teslim davranışı birebir korundu.

### Değişiklikler — Yinelenen adres engeli
- Aynı hesapta aynı URL'ye zaten **aktif** bir abonelik varken yeni oluşturma → `409 webhook_url_exists` (`existing_id` alanıyla). `DELETE`→`POST` ve secret yenileme (sil→yeniden oluştur) akışları etkilenmez (silinen/pasif satır aktif sayılmaz).

## [2.9.0] — 2026-09-25

> Webhook kapsam doğrulama + IPv6 SSRF sertleştirme. Mevcut abonelikler ve `*` anahtarlar **etkilenmez**; doğrulama yalnız create/update anında çalışır.

### Değişiklikler — Webhook kapsam doğrulama (create/update)
- `POST` / `PATCH /wa/webhooks`: `events` boş dizi ya da **bilinmeyen** olay adı içeriyorsa artık `422 invalid_webhook` (geçersiz olaylar yanıtta adlandırılır). Eskiden geçersiz kapsam **sessizce** `["*"]`'a düşüyordu → istemci yazım hatası farkında olmadan TÜM olaylara abone ediyordu. `"*"` hâlâ geçerlidir; `events` hiç gönderilmezse varsayılan `"*"` korunur. Saklı abonelikler yeniden doğrulanmaz (mevcut kayıtlar etkilenmez).

### Güvenlik — IPv6 SSRF
- Webhook adresi güvenlik denetimi IPv6 için tamamlandı: ULA (`fc00::/7`), link-local (`fe80::/10`), loopback (`::1`), unspecified (`::`) ve IPv4-mapped (`::ffff:0:0/96`) adresler reddedilir (`filter_var` bayraklarının kaçırabildiği aralıklar `inet_pton` ile kapatıldı). Hem abonelik oluşturma/güncellemede hem teslim anında (v2.8.0 pin'i ile birlikte) geçerlidir.

## [2.8.0] — 2026-09-25

> Güvenlik sertleştirmesi. **Geriye dönük uyumlu**: meşru genel adresli webhook'lar etkilenmez; istemci tarafında değişiklik gerekmez.

### Güvenlik — Giden webhook teslimi (SSRF / DNS-rebinding)
- Webhook teslimlerinde hedef adres artık yalnız abonelik oluşturmada değil **her teslim denemesinde** yeniden doğrulanır: host çözümlenir, çözümlenen **tüm** IP'lerin genel (public) olduğu denetlenir ve bağlantı doğrulanan IP'ye **sabitlenir** (`CURLOPT_RESOLVE`) → doğrulama ile bağlantı arasındaki DNS-rebinding (TOCTOU) boşluğu kapatıldı. Teslim yalnız `https`; iç/özel/loopback/link-local/metadata (ör. `169.254.169.254`) hedefleri reddedilir. TLS/SNI ve sertifika doğrulaması URL host'una göre yapılmaya devam eder.

## [2.7.0] — 2026-09-25

> Tümü **geriye dönük uyumlu**: mevcut webhook aboneleri ve `biz_opaque_callback_data` alanını göndermeyen istekler bakımından hiçbir alan, olay adı, imza ya da durum kodu anlamı değişmedi; idempotency davranışı aynıdır.

### Eklenenler — Callback bağlama (`biz_opaque_callback_data`)
- Gönderim ↔ durum olayı eşleştirmesi. İki şekilde:
  - **Otomatik (önerilen):** `POST /wa/messages` bir `Idempotency-Key` ile çağrıldığında sunucu `biz_opaque_callback_data`'yı Idempotency-Key ile **kendisi doldurur**. Bu değer istek **gövdesine/karmasına girmez** → gövde ve idempotency davranışı değişmez, çakışma riski yok; istemcinin hiçbir ek alan göndermesine gerek kalmadan V13-d uzlaştırması çalışır.
  - **Açık (isteğe bağlı):** gövdede `biz_opaque_callback_data` (metin, ≤512) verilebilir (bu değer istek gövde karmasına **dahildir**). Farklı bir korelasyon anahtarı gerektiğinde kullanın.
- Her iki durumda Meta değeri `message.status.*` olaylarında `data.biz_opaque_callback_data` olarak **aynen** geri yankılar (text / template / medya / reaction hepsinde iletilir).

### Eklenenler — Durum olayı (`message.status.*`) zenginleştirme
- Olay gövdesine `phone_number_id`, `conversation` (Meta konuşma nesnesi; yoksa `null`), `pricing` (ücretlendirme; yoksa `null`) ve `biz_opaque_callback_data` alanları eklendi. Mevcut `wamid` / `recipient` / `timestamp` / `errors` alanları aynen korunur.

### Eklenenler — Belirsiz gönderim uzlaştırması (V13-d)
- Sonucu `meta_outcome_unknown` kalmış bir gönderim, `biz_opaque_callback_data` taşıyan bir durum olayı geldiğinde otomatik olarak "gönderildi" durumuna geçirilir (`unknown → completed`, `wamid` doldurulur; aynı anahtarla sonraki replay artık `200` döner). Yalnız belirsiz kayıtları etkiler; `biz_opaque` yoksa ek sorgu çalışmaz (mevcut trafiğe sıfır yük).

## [2.6.0] — 2026-09-25

> Tümü **geriye dönük uyumlu**: yeni davranışlar varsayılan-kapalı hesap ayarı ya da ek alan; mevcut alan, olay adı, imza ve durum kodu anlamları değişmedi.

### Eklenenler — Çift mesaj koruması (idempotency sağlamlaştırma)
- Aynı `Idempotency-Key` ile **eşzamanlı** istek → `409 idempotency_in_progress` + `Retry-After` (atomik "processing" kilidi).
- Meta çağrısı **sonucu belirsiz** biterse (zaman aşımı / bağlantı yarıda kopması) → `409 meta_outcome_unknown` (`retryable:false`); aynı anahtarla tekrar denenirse Meta'ya **ikinci kez gönderilmez** (yinelenen mesaj önlenir). Süreç ortada çökerse (stale lock) da güvenli tarafa geçilir.
- Kesin başarısızlık (Meta açık reddi / Meta'ya hiç ulaşılamadı) → `retryable:true` (aynı anahtarla güvenle tekrar denenebilir).
- Meta başarılı olduktan sonra yerel DB yazımı başarısız olsa bile yanıt `201` kalır.

### Eklenenler — Hata zarfı alanları
- Tüm gönderim hata yanıtlarına `retryable` (bool), `meta_code`, `meta_subcode` eklendi. Durum kodları değişmedi (kalıcı hatalar `422`).

### Eklenenler — Numara & olaylar
- `GET /wa/numbers?status=all` — aktif olmayan numaralar da listelenir; her numarada `status_reason` ve `disconnected_at` (ISO, UTC `Z`). Parametresiz çağrı yalnız `active` döner (değişmedi).
- `number.status_changed` zenginleşti: `waba_id` + `event` değer kümesi `CONNECTED_VIA_PANEL`, `TRANSFERRED`, `DISCONNECTED_VIA_PANEL`, `REAUTH_REQUIRED`, `FLAGGED`, `UNFLAGGED` (ileride ek değer gelebilir — bilinmeyen değeri tolere edin). Kopma/devir/yeniden-yetki durumlarında ilgili sahibe gider. Opt-in olay (`*` aboneleri almaz).

### Eklenenler — Hesap ayarları & bağlama güvenliği
- `PATCH /wa/account/settings`: `default_automation_enabled` / `default_opt_out_autoreply_enabled` — **yeni bağlanan** numaralara uygulanan hesap varsayılanları; `revoke_edit_clean` ile birlikte `GET /wa/me` → `account_settings` altında.
- Numara bağlama: numara başka bir **aktif** hesaba bağlıysa artık `409 number_owned_by_other_account` (sessiz sahiplik devri kapatıldı). Aynı hesapta yeniden/çift bağlama ve serbest bırakılmış numara devri normal çalışır.

### Düzeltmeler
- `POST /wa/messages` `text` alanı artık hem `"..."` hem `{"body":"..."}` kabul eder (nesnede `body` okunur; eskiden nesnede müşteriye "Array" gidiyordu).

## [2.5.0] — 2026-09-25

> Sürüm hattı birleştirildi: canlı API dokümanı (`api.verimerkezi.app/docs/wa`) ile bu açık kaynak repo bundan sonra **tek semver** kullanır. Tüm değişiklikler **geriye dönük uyumludur**: yeni davranışlar varsayılan-kapalı bayrak veya yeni uç olarak eklendi; mevcut alan, olay ve imza düzeni değişmedi.

### Eklenenler — KVKK / gizlilik
- **`POST /wa/privacy/erasure`** — veri sahibinin silme/unutulma hakkı. Gövde `{ "phone_number_id"?, "wa_id" | "user_id" }` → `202 Accepted` + `privacy.erasure_completed` olayı (`phone_number_id`, `wa_id`/`user_id`, `completed_at`). Kişiye ait mesaj gövdeleri anonimleştirilir; medya dosya ve kayıtları, konuşma kişisel bilgileri, giden webhook teslim gövdeleri (`payload` + `response_body`) ve idempotency yanıtları silinir. Opt-out/onay (suppression) kaydı **kalıcıdır**. İşlem **idempotenttir**. Yetki: `profile:write`.
- **`PATCH /wa/account/retention`** — hesap düzeyinde saklama süreleri: `{ "messages_days", "media_days", "webhook_deliveries_days" }` (gün). Yetki: `profile:write`.

### Eklenenler — Hesap ayarları
- **`PATCH /wa/account/settings`** — hesap geneli ayarlar. `revoke_edit_clean: true` iken silme/düzenleme (`revoke`/`edit`) olayında **yalnızca** `message.revoked` / `message.edited` yayınlanır; `message.received` gönderilmez, 24 saatlik hizmet penceresi uzatılmaz, otomasyon ve opt-out otomatik yanıtı tetiklenmez. **Varsayılan `false` — mevcut davranış birebir korunur.** `automation_enabled` / `opt_out_autoreply_enabled` alanları da hesabın tüm numaralarına toplu uygulanır. Değerler `GET /wa/me` → `account_settings` altında görünür. Yetki: `profile:write`.

### Eklenenler — Sandbox / test
- **`POST /wa/test/inbound`** — yalnızca test anahtarıyla (`vmk_test_`). Sahte bir gelen mesaj enjekte eder (`{ "phone_number_id", "type": "text"|"revoke"|"edit", "from"?, "text"?, "original_message_id"? }`) ve imzalı `message.received` / `message.revoked` / `message.edited` olayını hesabın aktif webhook aboneliklerine gönderir. Meta'ya **hiçbir istek gitmez**; canlı akış etkilenmez. Silme/düzenleme temiz modunu (`revoke_edit_clean`) uçtan uca test etmek içindir.

### Güvenlik / gizlilik
- Giden webhook teslim kuyruğunda alıcının yanıt gövdesi (`response_body`) **artık saklanmaz** (KVKK veri minimizasyonu). Teşhis için `response_status` korunur.
- Web kökündeki hassas dosyalara doğrudan HTTP erişimi kapatıldı (`composer.json`/`composer.lock`, `vendor/`) → `403`.

## [1.9.0] — 2026-09-23

### Eklenenler — Şablon yönetimi API'si
- **`POST /wa/templates`** — şablon oluşturup Meta'ya gönderir (`202 PENDING`). Hedef `waba_id` veya `phone_number_id` ile; header medyası herkese açık `header_media_url` ile geçilir (indirilip Meta'ya `header_handle` olarak yüklenir). Doğrulama **Meta'dan önce** çalışır: kural ihlalleri alan bazında `422 template_invalid` döner, yalnızca Meta reddi `422 template_rejected`.
- **`POST /wa/templates/validate`** — göndermeden ön doğrulama.
- **`GET /wa/templates/{id}`** — ayrıntı (`rejected_reason`, `quality_score`, `status_updated_at`, tam `components`, `waba_id`).
- **`PATCH /wa/templates/{id}`** — düzenle (yeniden `PENDING`).
- **`DELETE /wa/templates/{id}`** — sil.
- **`GET /wa/templates`** artık süzgeçli ve imleç sayfalı: `status`, `category`, `language`, `q`, `cursor`, `limit`; yanıtta `has_more` + `next_cursor`. Her şablonda ve `GET /wa/numbers`'ta `waba_id` (WABA ayrımı için).

### Eklenenler — Webhook aboneliği API'si (yeniden)
- **`POST/GET/PATCH/DELETE /wa/webhooks`** + **`POST /wa/webhooks/{id}/test`** — abonelik oluştur/listele/güncelle/sil ve test bildirimi. Böylece yeni müşteri/kiracı açılışı tek seferde otomatikleşir. `secret` yalnızca oluşturma yanıtında bir kez döner; sonra `secret_prefix`. İmza şeması (`whsec_`, HMAC-SHA256, zaman damgalı) değişmedi. URL için SSRF koruması (özel/iç IP reddi). Yetki: `webhooks:read` / `webhooks:write`.

### Eklenenler — Yeni webhook olayları ve zenginleştirme
- **`credit.low` / `credit.exhausted`** — mesaj kredisi eşik altına düşünce / tükenince (kampanya ortasında sürprizi önlemek için). Eşik hesap ayarından; aynı durum için 24 saatte bir.
- **`template.approved/rejected/flagged/paused`** olay gövdesi zenginleştirildi: artık `template_id`, `meta_template_id`, `name`, `language`, `category`, `waba_id`, `status` ve ret durumunda `reason` içerir (ekstra `GET` gerekmez).
- Yeni olaylar (`credit.*` dahil) `*` joker aboneliğine **dahil değildir**; `POST /wa/webhooks` yanıtındaki `note` alanı `*` seçilince kapsanmayan olayları hatırlatır.

### Notlar
- Tümüyle geriye dönük uyumlu: mevcut olay adları, alanlar ve imza düzeni değişmedi; yalnızca yeni uç, yeni alan ve yeni olay eklendi. Üç SDK (PHP/Node/Python), `docs/04-templates.md`, `docs/06-webhooks.md`, OpenAPI ve Postman güncellendi.

## [1.8.0] — 2026-09-22

### Eklenenler — Coexistence & gelişmiş entegrasyon
- **Yeni webhook olayları:** `message.revoked` / `message.edited` (silme-düzenleme; "SİLİNDİ" etiketi), `message.sent` (API dışı giden mesajlar, `source` alanıyla), `message.history` (geçmiş aktarımı), `number.status_changed` (numara bağlandı/koptu/işaretlendi). **Bu olaylar `*` aboneliğine dahil değildir** — panelden ayrıca seçilir; mevcut `*` aboneleri etkilenmez.
- **Gelen/echo mesaj alanları:** `context` (alıntılanan mesaj), `reaction`, `location`, `contacts`, `original_message_id`; `message.echo` artık personelin telefondan gönderdiği medyayı da indirir.
- **`POST /wa/media`** — dosyayı Meta'ya yükleyip `media_id` üretir (herkese açık URL gerekmeden, KVKK dostu); 30 gün geçerli, medya hız kovasında.
- **Alıntılı cevap:** `POST /wa/messages` `context: { message_id }`.
- **Uzlaştırma:** `GET /wa/messages` (kaçan olayları geri al, okuma — kredi/kota tüketmez) ve `POST /wa/webhooks/redeliver` (dead-letter yeniden teslim).
- **Coexistence geçmiş aktarımı:** bağlantıda otomatik başlar (24 saat, tek sefer); `GET`/`POST /wa/numbers/{id}/history-import` durum/başlatma.
- **Numara ayarları:** `PATCH /wa/numbers/{id}/settings` (`automation_enabled`, `opt_out_autoreply_enabled`). `GET /wa/numbers` yanıtına `messaging_limit_tier`, `throughput`, ayar alanları eklendi.
- **`GET /wa/health`** — webhook teslimat sağlığı (kuyruk, p95 gecikme).
- **Anahtar bazında hız limiti** (plan kapsamında özel `rate_per_min` / `media_rate_per_min`).
- Üç SDK'ya karşılık gelen metotlar; `docs/11-gelismis.md` (yeni); OpenAPI ve Postman güncellendi.

### Güvenlik
- **İstemci IP doğrulaması (P0):** IP artık yalnızca güvenilir kaynaktan alınır; `CF-Connecting-IP` başlığının sahtelenerek IP izin listesinin atlatılması kapatıldı.

### Notlar
- Bu sürümdeki hiçbir değişiklik mevcut olay adlarını, alanlarını veya imza düzenini değiştirmez; yalnızca yeni alan ve yeni olay eklenir. Mevcut entegrasyonların yeniden bağlanmasına gerek yoktur.

## [1.7.0] — 2026-09-22

### Eklenenler — Gelen medyayı indirme
- Webhook'taki `data.media.media_id` değeri artık doğrudan indirilebiliyor (API tarafı 19 Eylül 2026'da canlıya alındı):
  - `GET /wa/media/{media_id}` — dosyanın kendisi (`Range` ve `ETag` destekli)
  - `GET /wa/media/{media_id}?meta=1` — üstveri (boyut, tür, sha256)
  - `HEAD /wa/media/{media_id}` — gövdesiz başlıklar
  - `GET /wa/media` — medya kayıtlarını listeleme (sayfalı, `source` / `kind` filtreli)
- **Yetki:** `messages:read` (panelde "Mesaj Okuma") veya `inbox:read`; "Tam Yetki" (`*`) anahtarları da erişir. 1.3.0'da o gün hiçbir uç nokta kullanmadığı için listeden çıkarılan `messages:read` artık bu uçlar için geçerlidir.
- **SDK:** PHP ve Node.js'e `listMedia` · `mediaInfo` · `downloadMedia`, Python'a `list_media` · `media_info` · `download_media`.
- **Dokümantasyon:** `docs/10-media.md` (yeni); `02-authentication` (scope), `06-webhooks` (medyalı payload), `07-rate-limits` (medya sayacı), `09-errors` (medya hata kodları), README ve SDK README'leri güncellendi; Postman koleksiyonuna "6. Medya" klasörü eklendi.

### Güvenlik
- Depodaki gelen medya yollarına **doğrudan HTTP erişimi kapatıldı.** Dosyalara yalnızca kimlik doğrulamalı uç noktadan erişilir ve yalnızca kendi hesabınızın medyası görünür; başka hesabın `media_id`'si `404` döner.
- Medya indirme için ayrı hız sınırı sayacı: **60 istek/dakika**.

### Düzeltildi — Webhook dokümanı ve örnek alıcılar
- **Örnek alıcılar** (`examples/php`, `examples/nodejs`, `examples/python`): `data.text` artık düz metin olarak okunuyor. Önceden `text.body` okunuyordu; Python örneği her `message.received` olayında hata verip `500` dönüyordu (bu yüzden olay tekrar tekrar deneniyordu), Node örneği metin mesajlarını `[medya]`, PHP örneği boş gösteriyordu. Medyalı mesaj (`media_id`), telefonsuz kullanıcı (`user_id`), `message.echo`, `template.flagged` / `template.paused` ve `account.alert` işleme eklendi; `message.status.failed` için `errors[]`, şablon olaylarında `reason`, `quality.changed` için `phone` / `quality`, `account.alert` için `field` / `event` alanları düzeltildi. Üç örnek de 12 olay tipiyle uçtan uca test edildi.
- **Webhook zarfı:** `event_id` biçimi UUIDv7 olarak düzeltildi (Haziran 2026 sonundan beri canlıda bu biçim üretiliyor; eski `evt_...` biçimi artık kullanılmıyor). `message.received` örneğine `user_id`, `username`, `contact.user_id`, `contact.username` eklendi; zarf alanları ve tüm olayların `data` alanları tablolarla belgelendi.
- **Scope:** `02-authentication.md`, panelde seçilebilen `*` (Tam Yetki) ve `messages:read` ile tamamlandı.
- **README:** webhook olay sayısı **12** olarak düzeltildi (`message.echo` ve `account.alert` dahil); SDK README'lerine eksik `sendOtp` / `send_otp` satırı eklendi.

### Notlar
- Medya dosyaları **süresiz** saklanır; otomatik silme yoktur.

## [1.6.0] — 2026-09

### Eklenenler — OTP / Kimlik Doğrulama (AUTHENTICATION) şablonları
- **OTP / doğrulama kodu** desteği: panelden `AUTHENTICATION` kategorisinde şablon oluşturma. Meta gövdeyi ve "Kodu Kopyala" butonunu **standart/otomatik** üretir (gövde metni düzenlenemez); kullanıcı yalnızca güvenlik önerisi, kod geçerlilik süresi ve buton tipini (`COPY_CODE` / `ONE_TAP`) belirler. **ONE_TAP** (Android otomatik doldurma) `autofill_text` + `package_name` + `signature_hash` ile desteklenir.
- **Gönderim:** `POST /wa/messages` — `template.otp` alanına kodu verin; gövde + OTP buton bileşenleri otomatik kurulur. Alternatif olarak `components` ile `body` ve `sub_type:"url"` buton parametresi (aynı kod) açıkça verilebilir.
- **Dokümantasyon:** `docs/03-messages.md` (OTP gönderme) ve `docs/04-templates.md` (OTP oluşturma + ONE_TAP) güncellendi; OpenAPI `template.otp` alanıyla zenginleştirildi; PHP/Node/Python SDK'lara `sendOtp()` yardımcısı eklendi.

## [1.5.0] — 2026-07-02

### Eklenenler — Dinamik (değişken) URL butonu
- Şablon **URL butonları artık dinamik** olabilir: buton adresinin sonuna `{{1}}` koyarak her gönderimde **kişiye özel link** üretebilirsiniz (sepet kurtarma, kişisel takip sayfası, kupon linki vb.). Şablon **panelden** oluşturulur (URL sonunda tek `{{1}}` + zorunlu örnek adres), Meta onayından sonra API ile gönderilir.
- **Gönderim:** `POST /wa/messages` template `components` dizisine `{ "type": "button", "sub_type": "url", "index": 0, "parameters": [{ "type": "text", "text": "..." }] }` bileşeni eklenir — değişken kısım her alıcı için ayrı geçirilir.
- **Kısıt:** Meta gereği URL butonunda tek değişken olur ve adresin sonunda yer alır. Dinamik URL butonlu şablonlar **yalnızca API** ile gönderilir (panel toplu kampanya / otomasyon değil).
- **Dokümantasyon:** `docs/03-messages.md` ("Dinamik URL Butonu" gönderim bölümü) ve `docs/04-templates.md` (oluşturma) güncellendi; OpenAPI `components` şeması `button` bileşeni açıklamasıyla zenginleştirildi; README özellik tablosuna satır eklendi; PHP/Node/Python örneklerine 3. örnek eklendi.

## [1.4.0] — 2026-06-25

### Eklenenler — Free-form medya + okundu/yazıyor göstergesi
- **`POST /messages`** artık 24 saatlik müşteri hizmet penceresi içinde **şablonsuz (free-form) medya** gönderir: `image` / `video` / `audio` / `document` — kaynak `link` (herkese açık `https://` URL) **veya** `id` (Meta media id). `caption` image/video/document için, `filename` document için geçerli; audio ikisini de almaz. Her gönderim 1 kredi tüketir. Pencere kapalıyken Meta **131047** döner (bunun yerine şablon kullanın). Meta limitleri: image ≤5MB, video ≤16MB, audio ≤16MB, document ≤100MB.
- **`POST /messages/read`** (yeni) — gelen mesajı okundu işaretler (mavi tik) ve `typing: true` ile ~25 sn "yazıyor…" göstergesi yayar; kredi tüketmez. Yanıt: `{ "ok": true, "marked_read": true, "typing": true }`.
- **Dokümantasyon:** `docs/03-messages.md`'e "Medya Mesajları" ve "Okundu + Yazıyor (typing)" bölümleri eklendi; README özellik tablosu güncellendi.

## [1.3.0] — 2026-06-24

### Değişti — Dokümantasyon ve SDK canlı API ile hizalandı
Bu sürüm, doküman ve SDK'yı **gerçekte uygulanan** uç noktalarla birebir eşitler. Canlı API'de bulunmayan uç noktalara dair anlatımlar kaldırıldı.

- **Webhook:** Programatik webhook abonelik API'si (POST/PATCH/DELETE `/webhooks`, `/webhooks/{id}/test`, `plain_secret` oluşturma yanıtı) **kaldırıldı** — webhook'lar artık yalnızca **panelden** yapılandırılır (`panel/api/webhooks`). HMAC alıcı (receiver) örnekleri, event payload şekilleri ve retry politikası korundu.
- **Scope adları düzeltildi:** `messages:write` → **`messages:send`**. Gerçek scope listesi: `messages:send`, `contacts:read`, `contacts:write`, `templates:read`, `profile:read`, `profile:write`, `reports:read`. Var olmayan `webhooks:write`, `admin`, `templates:write`, `messages:read` scope'ları kaldırıldı.
- **Kaldırılan uygulanmamış uç noktalar:** şablon oluştur/sil + medya yükleme (panelden yönetilir; yalnızca `GET /templates` listeleme kaldı), kişi güncelle/sil + etiket + opt-out + bulk-action (yalnızca `GET /contacts`, `POST /contacts`, `POST /contacts/bulk` kaldı), `/messages` `/conversations` `/campaigns` `/webhooks/deliveries` listeleme uç noktaları.
- **Belgelendi:** `GET /numbers`, `GET /reports/summary`, `GET /credit/balance|packages|usage|transactions`, `GET`/`PATCH /profile/{phone_number_id}` uç noktaları dokümana eklendi.
- **Düzeltmeler:** rate limit her yerde **120/dk** olarak tutarlı hâle getirildi; `Idempotency-Key` yalnızca `POST /wa/messages` (24h TTL) için belgelendi; hata zarfı standardı `{"ok":false,"error":{"code","message","field"?}}` olarak netleştirildi (standart dışı `meta_code`/`meta_subcode`/`details` alanları kaldırıldı); kişi listesi filtreleri yalnızca `q` / `cursor` / `limit` (max 100).

## [1.2.3] — 2026-06-13

### Düzeltildi — `language` alanı her iki formatı kabul ediyor (#132001)
- `POST /wa/messages` template gönderiminde `language` alanı artık HEM `"tr"` (string) HEM `{"code":"tr"}` (Meta nesne formatı) kabul ediyor. Önceden yalnız string bekleniyor, nesne gönderildiğinde içeride `"Array"`'e dönüşüp Meta **132001 "template language not available"** veriyordu.
- Etki: Meta'nın native formatını (`{"code":"tr"}`) gönderen entegrasyonlar artık sorunsuz çalışır. Müşteri kodunda değişiklik gerekmez.

### Düzeltildi — Dokümantasyon
- `docs/03-messages.md`: `language` alanının iki formatı da kabul ettiği netleştirildi.
- `docs/07-rate-limits.md`: rate limit değerleri gerçek uygulamayla eşitlendi — her API anahtarı için **120/dakika** (mesaj gönderimi ayrı sayaçta, yine 120/dakika). Önceki tablo yanlış olarak 60/20/30 gösteriyordu.

## [1.2.2] — 2026-06-13

### İyileştirildi — Olay-anında (event-driven) webhook teslimatı
- Webhook teslimatı artık **olay-anında**: mesaj Meta'dan ulaştığı anda müşteri endpoint'ine POST edilir — uçtan uca tipik gecikme **~1 saniye** (önceden kuyruk periyodik işlendiği için 60 saniyeye kadar çıkabiliyordu)
- Dakikalık kuyruk işleyici yalnızca **retry/yedek** olarak çalışmaya devam eder; retry takvimi değişmedi
- Eşzamanlı teslimata karşı satır bazlı kilit eklendi — aynı event'in çift teslim edilmesi mimari olarak engellendi

### Eklendi — Doküman uyumu (geriye dönük uyumlu)
- Payload gövdesine `event` ve `occurred_at` alanları eklendi (dokümandaki sözleşme); mevcut `event_type` ve `created_at` alanları aynen korunur — **mevcut entegrasyonlarda değişiklik gerekmez**
- Yeni header'lar: `X-VeriMerkezi-Delivery-Attempt` ve `User-Agent: VeriMerkezi-Webhook/1.0`
- `message.echo` payload'ına `from`, `source: "coexistence_app"`, `phone_number_id` alanları eklendi
- `message.received` payload'ına `phone_number_id` ve `contact` nesnesi eklendi

### Düzeltildi — Dokümantasyon
- `docs/06-webhooks.md`: payload örnekleri canlı formatla birebir eşitlendi (`data.text` düz string'dir, `event_id` formatı `evt_...`), timeout değeri düzeltildi (10sn), olay-anında teslimat notu eklendi

### Doğrulama
- Canlı uçtan uca test: imzalı event → teslimat **0.11 sn**, HMAC imza doğrulandı, tüm yeni alan ve header'lar teyit edildi

## [1.2.1] — 2026-06-11

### Düzeltildi — `message.echo` payload parse bug'ı
- **Bug:** `smb_message_echoes` field'ında Meta mesajları `value.message_echoes` array'inde gönderir; biz `value.messages` arıyorduk → echo'lar webhook_log'a alınıyor ama outgoing webhook'a publish edilmiyordu
- **Düzeltme:** `MetaWhatsAppController::handleCoexistenceEcho()` her iki alanı da kabul ediyor (`message_echoes` öncelikli, `messages` fallback)
- Etki: CoExistence Mode kullanan müşteriler `message.echo` event'ini artık almaya başlar
- Müşteri kodunda değişiklik gerekmez — abonelik `events: ["*"]` veya `message.echo` içeriyorsa otomatik akar

### Doğrulama
- Bug fix sonrası mevcut bir Tech Provider hesabında son 1 saatteki 20 echo replay edildi → tümü ilk denemede HTTP 200 ile teslim edildi

## [1.2.0] — 2026-06-11

### Eklenenler — CoExistence Echo Webhook
- Yeni event tipi: **`message.echo`** — işletme WhatsApp uygulamasından telefon üzerinden müşteriye doğrudan yazdığında Meta'nın gönderdiği `smb_message_echoes` event'i artık müşteri webhook'una iletilir
- `data.from` = işletme numarası, `data.to` = müşteri numarası, `data.source = "coexistence_app"`
- Mesaj `v2_wa_messages`'a `direction='outbound'` + kaynak `coexistence_app` olarak yazılır; konuşma `last_message_at` güncellenir
- OpenAPI events enum + docs/06-webhooks.md güncellendi

## [1.1.0] — 2026-06-11

### Eklenenler — Webhook Subscription CRUD
- **PHP SDK**: `listWebhooks()`, `createWebhook(name, url, events)`, `setWebhookActive(id, bool)`, `deleteWebhook(id)`, `testWebhook(id)`, `webhookDeliveries(id)` metodları
- **Node.js SDK**: `listWebhooks()`, `createWebhook(name, url, events)`, `setWebhookActive(id, isActive)`, `deleteWebhook(id)`, `testWebhook(id)`, `webhookDeliveries(id)` metodları
- **Python SDK**: `list_webhooks()`, `create_webhook(name, url, events)`, `set_webhook_active(id, is_active)`, `delete_webhook(id)`, `test_webhook(id)`, `webhook_deliveries(id)` metodları
- **OpenAPI 3.1 şeması**: `/webhooks` (GET, POST), `/webhooks/{id}` (PATCH, DELETE), `/webhooks/{id}/test` (POST), `/webhooks/{id}/deliveries` (GET) endpoint'leri
- **Postman koleksiyonu**: 6 yeni request (CRUD + test + deliveries)
- HTTP DELETE method desteği SDK request helper'larında

### Sunucu Tarafı — Backend İyileştirmeleri (üretim ortamı)
- `OutgoingWebhookService::dispatch()` `WaDispatcher` cron'a entegre edildi — her dakika kuyruk işlenir
- `MetaWhatsAppController::saveIncomingMessage` publish sonrası anında `dispatch(5)` çağrısı — yeni mesajlar 1-2 sn içinde müşteri sunucusuna ulaşır (cron beklemez)
- Webhook delivery teslimat geçmişi GET endpoint'i ile sorgulanabilir

### Notlar
- Bu sürüm geriye dönük uyumlu — mevcut webhook entegrasyonları aynen çalışmaya devam eder
- `plain_secret` hâlâ yalnızca `createWebhook` yanıtında 1 kez döner; HMAC imza akışı değişmedi (`sha256=hmac_sha256(ts + '.' + body, secret)`)

## [1.0.0] — 2026-05-30

### Eklenenler
- İlk sürüm: Veri Merkezi WhatsApp Business API SDK + dokümantasyon
- PHP SDK (PSR-4, tek dosya destekli)
- Node.js SDK (CommonJS + ESM)
- Python SDK (sync + async)
- OpenAPI 3.1 şeması
- Postman koleksiyonu
- Detaylı dokümantasyon (9 bölüm)
- Webhook receiver örnekleri (PHP / Node.js / Python)
- MIT lisansı

### API Özellikleri
- Embedded Signup v4 ile WABA bağlama
- 27+ REST endpoint
- Outgoing webhook (HMAC SHA-256, 11 event tipi)
- Idempotency-Key (24h TTL)
- Cursor pagination
- Per-user rate limit (`X-RateLimit-*` header'ları)
- Tier auto-sync (TIER_50 -> UNLIMITED)
- Resumable upload (PDF/Image/Video header)
- Multi-tenant izolasyon

---

Yeni sürümler için: https://github.com/verimerkeziapp/whatsapp-sdk/releases
