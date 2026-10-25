# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir. Format [Keep a Changelog](https://keepachangelog.com/) standardını takip eder.

## [2.32.1] — 2026-10-25

- Bağlantı önizlemesi: `POST /wa/messages` metin mesajlarında `text: { "body": "...", "preview_url": true }` gönderildiğinde değer Meta'ya iletilir ve metindeki bağlantının önizlemesi gösterilir. `preview_url` gönderilmezse önizleme eskisi gibi kapalıdır; mevcut entegrasyonlar etkilenmez.

## [2.32.0] — 2026-10-22

- Hata sözlüğü: `GET /meta/error-codes` (Meta mesaj, şablon, hesap ve arama kodları + Veri Merkezi kodları; Türkçe açıklama, adım, önem, `retryable`, kategori). Yalnız Meta'nın belgelediği kodlar.
- `message.status.failed`: `errors[]` öğelerine `message_tr`, `action_tr`, `severity`, `retryable`, `category`, `known`; üst düzeyde ilk hatanın özeti (`error_code`, `error_message_tr`, `error_action_tr`, `error_severity`, `error_retryable`, `error_category`). Meta alanları (`error_data.details` dahil) aynen kalır.
- Hata yanıtları: Meta kaynaklı her hatada `meta_code` (bağlantı hatasında `0`); tüm `error` gövdelerinde `message_tr`, `action_tr`. `error.message` artık Türkçe ve teknik metinsiz; Meta'nın ham metni yalnız `meta_message` / `meta_user_message`da. Arama ve form hatalarında `meta_message_tr`.
- Şablon olayları: `reason_code`, `reason_tr`, `action_tr`, `paused_until`, `meta_description`; `rejected_reason_text` her redde dolu. Yeni olaylar: `template.pending`, `template.in_appeal`, `template.locked`, `template.archived`, `template.unarchived`, `template.deleted`, `template.pending_deletion`, `template.limit_exceeded`.
- `account.alert` yapılandırıldı: `type`, `severity`, `message_tr`, `action_tr`, `link` (+ Meta `alert_info` alanları). `number.name_changed`: `rejection_reason_tr`. `number.status_changed`: `ACCOUNT_VIOLATION` → `restricted` + `violation_type`.
- Yeni olaylar: `number.limit_changed` (Meta mesaj limiti), `account.review_changed` (hesap incelemesi), `message.status.deleted`. Yeni olayların hiçbiri `*` aboneliğine dahil değildir; açıkça seçilmelidir.
- `GET /numbers`: `payment_method_status` (`ok` | `missing` | `unknown`), `payment_method_action_tr`.

## [2.31.1] — 2026-10-22

- Kopma nedeni sonradan gelirse güncellenir: kopmadan sonraki 10 dakika içinde aynı WABA için nedenli bir kopma olayı (ör. `PARTNER_REMOVED` + `disconnection_info.reason`) gelirse `disconnect_reason` ve `disconnect_initiated_by` güncellenir; CRM'e nedenli tek bir `number.status_changed` daha gider (`reason`, `disconnect_message_tr`, `disconnect_action_tr`, `reconnect_url`). Mevcut olay sırası ve alanlar değişmedi.
- Sözlük: `BUSINESS_DOWNGRADE` → "Numara telefonda WhatsApp Business'tan normal WhatsApp'a geçirildi." Adım: (1) numarayı telefonda tekrar WhatsApp Business'a taşıyın, (2) Veri Merkezi panelinde Numaralar sayfasından yeniden bağlayın.

## [2.31.0] — 2026-10-20

- Kopma nedenleri sözlüğü: `GET /meta/disconnect-reasons` (Meta `account_update` değerleri + Veri Merkezi olayları; kod, kaynak, kısa Türkçe açıklama, müşterinin adımı).
- `GET /numbers`: `disconnect_message_tr`, `disconnect_action_tr`, `reconnect_url` (aktif değilse kopma nedeni, aktif ama yetki düşmüşse `REAUTH_REQUIRED`; bilinmiyorsa `null`). 2.30.0 alanları aynen kalır.
- `number.status_changed`: aynı üç alan her olayda. `ACCOUNT_RESTRICTION` artık `status: "restricted"` olarak yayınlanır (`restriction_type`, `restriction_types`, `restricted_until`, `remediation`).
- Düzeltme: `DISABLED_UPDATE` olayında yalnız `waba_ban_state: DISABLE` numarayı kapatır; `SCHEDULE_FOR_DISABLE` kapatmaz, `REINSTATE` kapalı numarayı yeniden açar ve `status: "connected"` yayınlar.

## [2.30.0] — 2026-10-20

- Düzeltme: Meta hesap olaylarında (`PARTNER_REMOVED` vb.) WABA kimliği `waba_info.waba_id` alanından okunur. Önceden bazı kopmalarda numara `active` kalıyor ve `number.status_changed` yayınlanmıyordu.
- `PARTNER_APP_UNINSTALLED` artık kopma sayılır: numara `disconnected` olur. Meta `PARTNER_REMOVED` ile art arda gönderdiğinde numara başına tek `number.status_changed` yayınlanır.
- `GET /numbers` yeni alanlar: `disconnect_reason`, `disconnect_initiated_by` (Meta `disconnection_info`; yalnız numara aktif değilken dolu), `reauth_required` (boolean), `reauth_required_at`.
- Not: coexistence numaralarında Meta, telefondaki WhatsApp Business uygulaması uzun süre kullanılmazsa bağlantıyı `PRIMARY_INACTIVITY` nedeniyle kaldırır. Numara panelden yeniden bağlanmalıdır.

## [2.29.0] — 2026-10-19

- `POST /privacy/erasure`: isteğe bağlı `reference` (1–64 karakter) gövde alanı; 202 yanıtında ve `privacy.erasure_completed` olayında aynen döner (verilmediyse `null`).
- `POST /privacy/erasure`: `Idempotency-Key` desteği. Aynı anahtar ve gövdeyle yeniden denemede aynı `erasure_id` ve yanıt `Idempotent-Replay: true` ile döner; silme ikinci kez çalışmaz. İşlem sürerken `409 idempotency_in_progress`, farklı gövdede `422 idempotency_key_conflict`.
- Geriye uyumlu: alanlar isteğe bağlı; mevcut istemciler değişiklik gerektirmez.

## [2.28.0] — 2026-10-19

- Eşzamanlı medya indirme sınırı: hesap başına aynı anda en fazla 6 indirme; birinci taraf anahtar 6 yuvanın tamamını, diğer anahtarlar birlikte 2 yuvayı kullanır. Dolunca `429 rate_limited` + `error.scope: concurrency`, `X-Concurrency-Limit`, `Retry-After: 2`. `HEAD` ve `?meta=1` sayılmaz.
- Dayanıklılık: doğrulanmış anahtar bilgisi 15 sn, medya üstverisi 10 dk sunucu önbelleğinde tutulur (istek başına daha az veritabanı sorgusu). İptal ve IP listesi değişikliği önbelleği hemen temizler.
- Veritabanı devre kesicisi: kısa sürede art arda bağlantı reddinde API birkaç saniye bağlantı denemeden `503 temporarily_unavailable` döner; önbellekteki bilgilerle medya indirmeleri sürer.
- SDK'lar 2.28.0: davranış aynı (429/503 Retry-After ile yeniden deneme eşzamanlılık sınırını da kapsar).

## [2.27.0] — 2026-10-19

- Hesap düzeyi hız sınırı: anahtar sınırına ek olarak hesabın tüm anahtarları kova başına ortak bir bütçe paylaşır (JSON kovaları 300/dk, medya 150/dk). Ayrıntı: Hız sınırları rehberi.
- Birinci taraf önceliği: bağlı hizmetin kurulum anahtarı (ör. Sigorta CRM) hesap bütçesinin tamamını kullanabilir; anahtar sınırı da hesap bütçesine eşittir. Hesapta böyle bir anahtar varken diğer anahtarlar bütçenin %40'ını birlikte paylaşır. Diğer anahtarların kendi sınırları (120/dk, medya 60/dk) değişmedi.
- Yeni başlıklar: `X-RateLimit-Bucket`, `X-RateLimit-Account-Limit`, `X-RateLimit-Account-Remaining`, `X-RateLimit-Account-Reset`; 429 yanıtında `X-RateLimit-Scope` (`key`, `account`, `account_share`) ve gövdede `error.scope`, `error.bucket`. Tümü `Access-Control-Expose-Headers` ile okunabilir.
- Geçici altyapı hataları (veritabanı bağlantı reddi vb.) artık `500` yerine `503 temporarily_unavailable` + `Retry-After: 5` döner; bu durumda anahtar doğrulanamazsa da `401 invalid_api_key` yerine `503` döner. API uçlarında beklenmeyen hata yanıtı HTML yerine JSON (`server_error`).
- Giden webhook teslimi abonelikler arasında adil paylaştırılır; abonelik içinde canlı olaylar `message.history` olaylarından önce teslim edilir.
- SDK'lar: 429 ve 503 yanıtlarında `Retry-After` kadar bekleyip otomatik yeniden dener (en fazla 3).

## [2.26.1] — 2026-10-15

- Belge düzeltmesi (davranış değişmedi): `opt_out_autoreply_enabled` ve `default_opt_out_autoreply_enabled` 11.10.2026'dan beri her zaman `true`; RET onay mesajı zorunludur, `false` gönderilirse yok sayılır ve yanıtta `true` döner. Ayar eşitleyen istemciler bu alanı göndermemeli ya da beklenen değeri `true` kabul etmelidir.

## [2.26.0] — 2026-10-14

- `GET /flows`: her formda `id` (= `flow_id`), `waba_id`, `phone_number_id`, `updated_at` (Veri Merkezi kaydında son gözlenen değişiklik, ISO 8601); yanıtta `next_cursor` ve `has_more`. `limit` üst sınırı 100'den 200'e çıktı; imleç `cursor` adıyla da gönderilebilir. Eski `flow_id` ve `paging.after` alanları aynen korunur.
- Formlar: Meta Flow JSON'u `Type mismatch in an equality operation` ile reddederse (`POST /flows`, `PUT /flows/{flow_id}/json` → `validation_errors`; `POST /flows/{flow_id}/publish` ve diğer yazma uçları → `422 meta_flow_failed`) yanıta `hint` + `hint_message` eklenir: `flow_chained_equality` ya da (Sigorta CRM hizmetine bağlı anahtarlarda) `crm_update_required`. Flow JSON değiştirilmez.
- Belgeler: Meta koşul kuralları — ifade başına tek eşitlik, iç içe If en fazla 3 seviye, Switch uyarısı (canlı Meta testleri, 14.10.2026).
- SDK'lar: `listFlows` / `list_flows` 200'e kadar `limit` ve `next_cursor` ile çalışır (imza değişmedi). OpenAPI ve Postman güncellendi.

## [2.25.0] — 2026-10-14

- Yeni: `POST /templates/media` — medya başlıklı şablon için örnek dosyayı yükler ve `header_handle` + `header_media_ref` döndürür. Giriş: `multipart/form-data` `file`, JSON `url` ya da JSON `media_id`. Kabul: JPEG/PNG (`IMAGE`, en çok 5 MB), MP4 (`VIDEO`, 16 MB), PDF (`DOCUMENT`, 100 MB). Yanıt `201`: `header_handle`, `header_media_ref`, `format`, `mime_type`, `file_size`, `waba_id`.
- Yeni: `POST /templates/{id}` (`PATCH /templates/{id}` eşdeğeri), `POST /templates/{id}/copy` (yeni ad / dil / kategori ile kopya, `components` verilirse çeviri) ve `DELETE /templates?name=…` (adın tüm dilleri; `ids`, `languages`).
- Düzeltme: `DELETE /templates/{id}` artık yalnız o dili siler (Meta'ya ad + `hsm_id`). Önceden Meta'da adın tüm dilleri siliniyordu, yerelde tek satır. Meta'da zaten yoksa yanıtta `meta_missing: true`.
- `POST /templates`: yeni alanlar `parameter_format` (`POSITIONAL` | `NAMED`), `allow_category_change`, `message_send_ttl_seconds`, `cta_url_link_tracking_opted_out`, `header_media_ref`. Tam bileşen desteği: `NAMED` değişkenler, metin başlıkta 1 değişken + örnek, `LOCATION` başlık, `COPY_CODE` düğmesi. Aynı WABA'da aynı ad + dil için `409 template_exists`; Meta reddederse yerelde `DRAFT` artığı kalmaz.
- Düzenleme kuralları: yalnız `APPROVED` / `REJECTED` / `PAUSED` (aksi `409 template_not_editable`); onaylıda kategori değişmez (`422 category_not_editable`), 24 saatte 1 ve 30 günde 10 düzenleme sınırı (`429 template_edit_limit`, `next_edit_at`, `retry_after`). `name`, `language`, `parameter_format` düzenlenemez.
- Hatalar: doğrulama hataları (`422 invalid_request` / `template_invalid`) `error.field` ile alan yolunu verir (ör. `components[0].text`; `POST /templates/validate` dahil). Meta kaynaklı hatalarda `meta_code`, `meta_subcode` (metin), `meta_message`, `meta_user_title`, `meta_user_message`, `fbtrace_id` döner. Yeni kodlar: `template_exists`, `template_not_editable`, `category_not_editable`, `template_edit_limit`, `meta_unavailable` (502); `template_edit_failed`, `template_delete_failed`, `meta_upload_failed`, `media_invalid_format`, `header_media_fetch_failed` şablon uçlarında da kullanılır.
- Şablon nesnesi: `previous_category`, `parameter_format`, `rejected_reason_text` ve listede `quality_score`; ayrıntıda ayrıca `header_media_ref` ve `edit_limit` (`editable`, `edits_last_30d`, `max_edits_30d`, `next_edit_at`).
- Yeni olaylar: `template.disabled` ve `template.reinstated`. `*` aboneliğine dahil değildir; açıkça seçilmelidir. Durum olaylarının (`approved`, `rejected`, `paused`, `flagged`, `disabled`, `reinstated`) yüküne `previous_status`, `rejected_reason`, `rejected_reason_text`, `quality_score`, `occurred_at` ve `source` (`webhook` | `sync`) eklendi; `reason` korunur. Meta webhook'u gelmediyse geçiş senkronda yakalanır, aynı geçiş iki kez yayınlanmaz.
- Test anahtarı: yeni yazma uçları dahil tümü simüle edilir (Meta'ya gitmez, veri değişmez; `simulated: true`, `X-Test-Mode: 1`): `POST /templates/media` `201` (`header_handle: "4::test…"`, `header_media_ref: null`), `POST` / `PATCH /templates/{id}` `200`, `POST /templates/{id}/copy` `202` (`id: 0`), silme uçları `200`.
- Şablon nesnesi: `GET /templates` ve `GET /templates/{id}` her şablonda `header_media` döner. Medya başlıklı ve Veri Merkezi'nde dosya kopyası olan şablonda `{ url, mime_type, file_size, sha256, filename, format, temporary: false }` (`url` kalıcı herkese açık bağlantı); kopya yoksa Meta onay örneği `{ url, format, temporary: true }`; medya başlığı yoksa `null`.
- `POST /messages` `type: "template"`: kayıtlı şablon medya başlıklıysa ve `header` bileşeni gönderilmezse kayıtlı medya kalıcı bağlantıyla otomatik eklenir; `header` gönderirseniz aynen kalır.
- Dinamik URL butonu gönderimi netleştirildi: `{ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "<adres sonu>" }] }`; sabit adresli URL butonuna bileşen gönderilmez. Yeni hata `422 invalid_template_parameters` (`field`: `template.components[0].parameters` | `template.components[0].index` | `template.components`): sabit URL'ye parametre, `index`'teki düğme URL değil, değişkenli URL için parametre yok. Denetim yalnız şablon Veri Merkezi'nde kayıtlıysa yapılır (`AUTHENTICATION` hariç); kayıtlı değilse istek aynen gider.
- SDK'lar: `uploadTemplateMedia`, `updateTemplate`, `copyTemplate`, `deleteTemplate`, `deleteTemplatesByName` (PHP, Node.js) ve Python'da `upload_template_media`, `update_template`, `copy_template`, `delete_template`, `delete_templates_by_name`. OpenAPI ve Postman güncellendi.

## [2.24.0] — 2026-10-14

- Yeni alan: `type: "unsupported"` olan `message.received` olaylarında `data.unsupported` = `{ type, raw_type, error_code, error_title }` gelir. Meta mesajın içeriğini iletmediğinde nedeni (ör. `131060` "This message is unavailable.") burada. Diğer türlerde `null`; mevcut alanlar değişmedi.

## [2.23.0] — 2026-10-13

> WhatsApp Business uygulaması rehberi (coexistence). Tamamen additive; panel kişi rehberi (`GET /contacts`) değişmedi. Ayrıntı: [docs/14-uygulama-rehberi.md](docs/14-uygulama-rehberi.md).

### Eklenenler
- **`GET /app-contacts`** (süzgeçler: `phone_number_id`, `updated_since`, `include_removed`; imleçle sayfalama, en çok 200) ve **`GET /numbers/{phone_number_id}/app-contacts/sync`** (senkron durumu). Kapsam `contacts:read`, kredi düşmez.
- **Yeni olay `contact.synced`:** rehberde ekleme, düzenleme ve silme; numara başına en fazla 100 değişiklikle toplu (`batch.index` / `batch.count`, `sync_type: initial | incremental`). **`*` aboneliğine dahil değildir** (toplam 33 olay).
- 2.23.0 öncesinde saklanmış rehber olayları geriye dönük işlendi; bu kayıtlar `source: "app_backfill"` ile döner (olay yayınlanmaz).
- Meta ilk aktarımı yalnız bağlantıdan sonraki 24 saat içinde ve bir kez verir; tekrar isteme ucu yoktur (durum: `initial_sync.status: "expired"`).
- `POST /test/inbound` `type: "app_contact_sync"` örnek `contact.synced` gönderir; test anahtarında `GET /app-contacts` 3 örnek kayıt döner.
- Silme: `number.purged` olayında `counts.app_contacts`, `POST /privacy/erasure` yanıtında ve `privacy.erasure_completed` olayında `erased.app_contacts`.
- **SDK'lar** 2.23.0: `listAppContacts` / `getAppContactsSyncStatus` (PHP, Node.js), Python'da `list_app_contacts` / `get_app_contacts_sync_status`. OpenAPI ve Postman güncellendi.

## [2.22.0] — 2026-10-10

> Etkileşimli mesajlar + test anahtarı düzeltmesi. Geriye dönük uyumlu. (Canlıya 10.10'da çıktı; public repoya 13.10'da işlendi.)

### Eklenenler — Etkileşimli mesajlar
- **`POST /messages` `type: "interactive"`:** `button` (en çok 3 yanıt düğmesi), `list` (en çok 10 satır), `cta_url` (bağlantı düğmesi), `location_request_message` (konum isteği). Meta sınırları gönderimden önce doğrulanır: `422 invalid_interactive` + `field`. Serbest mesaj kuralları aynen geçerli. Ayrıntı: [docs/03-messages.md](docs/03-messages.md).
- **Gelen seçimler:** `message.received` ve `message.echo` olaylarındaki `data.interactive` nesnesine `reply_id`, `reply_title`, `reply_description` eklendi. Geriye uyumlu; `type`, `name` ve `data.button` değişmedi.
- **SDK'lar** 2.22.0: `sendButtons`, `sendList`, `sendCtaUrl`, `requestLocation`, `sendInteractive` (PHP, Node.js); Python'da snake_case karşılıkları. OpenAPI ve Postman'e dört örnek eklendi.

### Düzeltmeler — Test anahtarı
- Şablon, profil, numara/hesap ayarı, saklama süresi, kişi ve `POST /messages/read` uçları artık **simüle edilir**. Webhook aboneliği yazma uçları, `POST /privacy/erasure` ve geçmiş aktarımı başlatma `403 test_mode_unsupported` döner. Simüle edilen ya da engellenen yanıtlarda `X-Test-Mode: 1` başlığı bulunur. Tablo: [docs/02-authentication.md](docs/02-authentication.md#test-anahtarı-davranışı).

## [2.21.0] — 2026-10-10

> Konum ve kişi kartı gönderimi. Tamamen additive; mevcut mesaj türleri etkilenmez.

### Eklenenler
- **`POST /messages` `type: "location"`:** `{ "location": { latitude, longitude, name?, address? } }`. Hatalı değer → `422 invalid_location`.
- **`POST /messages` `type: "contacts"`:** `{ "contacts": [ { name: { formatted_name, … }, phones?, emails?, org?, urls?, addresses?, birthday? } ] }`, en çok 20 kişi. Hatalı değer → `422 invalid_contacts` (alan yolu `field`'da).
- Diğer serbest mesaj türleriyle aynı kurallar: 1 kredi, 24 saat penceresi (`131047` → `meta_send_failed` + kredi iadesi), `Idempotency-Key`, test anahtarı simülasyonu, `recipient` (BSUID), `context`, `biz_opaque_callback_data`. Ayrıntı: [docs/03-messages.md](docs/03-messages.md).
- **SDK'lar** 2.21.0: `sendLocation`, `sendContacts` (Python'da `send_location`, `send_contacts`). **OpenAPI** 2.21.0, **Postman** iki yeni örnek istek.

### Belgeleme
- "2.21.0 ile geliyor" notları kaldırıldı. Etkileşimli düğme/liste (`button` / `list`) hâlâ **desteklenmiyor**.

## [2.20.0] — 2026-10-08

> Formlar (WhatsApp Flows). Tamamen additive; mevcut uçlar, olaylar ve `*` abonelikleri etkilenmez. Ayrıntı: [docs/13-formlar.md](docs/13-formlar.md).

### Eklenenler — Formlar (WhatsApp Flows)
- **9 yeni uç:** `POST`/`GET /flows`, `GET`/`DELETE /flows/{flow_id}`, `PUT /flows/{flow_id}/json`, `POST /flows/{flow_id}/publish` · `/deprecate`, `GET /flows/{flow_id}/preview` · `/metrics`.
- **Gönderim:** `POST /messages` `type: "flow"` (1 kredi; `mode: draft` ile taslak denemesi) ve FLOW butonlu şablon parametresi.
- **Yeni scope'lar:** `flows:read`, `flows:write`.
- **2 yeni webhook olayı:** `flow.completed` (form yanıtı; formdaki dosyalar `GET /media/{media_id}` ile alınır), `flow.status_changed` — **`*` joker aboneliğine dahil değildir**; açıkça ekleyin (toplam 30 olay).
- **Hazır örnek:** [examples/flows/teklif-formu.flow.json](examples/flows/teklif-formu.flow.json) — canlıda denenmiş tek ekranlı statik teklif formu.
- **SDK'lar** 2.20.0: `listFlows`, `createFlow`, `getFlow`, `updateFlowJson`, `publishFlow`, `deprecateFlow`, `deleteFlow`, `getFlowPreview`, `getFlowMetrics`, `sendFlow` (Python'da snake_case). **OpenAPI** 2.20.0 (59 uç), **Postman** "10. Formlar" klasörü.

### Eklenenler — Arama uygunluk kontrolü
- `GET`/`PATCH /numbers/{phone_number_id}/calling` yanıtında yeni `eligibility` alanı (`eligible_inbound`, `eligible_outbound`, `checks[]` — Türkçe açıklamalı). OpenAPI `CallingEligibility` şeması. Belgeye "Aramayı açmak için şartlar" listesi eklendi ([docs/12-arama.md](docs/12-arama.md)).
- 5 yeni hata kodu: `calling_not_supported_for_number` (Meta 141000), `calling_messaging_limit_too_low` (138015), `calling_prerequisites_unmet` (138018), `calling_outbound_unavailable` (138013), `calling_disabled_quality` (138014, yeniden denenebilir). Meta kaynaklı arama hatalarında `error.meta_message` da döner.

### Belgeleme — Hata zarfı
- `docs/09`: çekirdek zarf (`ok`, `error.code`, `error.message`, `error.field?`) ve isteğe bağlı `meta_code`, `meta_subcode`, `meta_message`, `retryable`, `eligibility` / `checked_locally` alanları belgelendi. Önceki "meta_* gönderilmez" notu kaldırıldı.

### Eklenenler — Numara ayırma ve şablon senkronu
- **`POST /numbers/{phone_number_id}/detach`** (`profile:write`, `Idempotency-Key` destekli, yalnız canlı anahtar): numarayı hesabınızdan ayırır; numara Meta/WABA'da kalır. `purge_messages` zorunlu — `true` ise kayıtlar en geç 24 saatte silinir, **geri alınamaz**. Hatalar: `409 number_detached`, `422 deregister_not_supported`, `422 invalid_request`. Ayrıntı: [docs/11-gelismis.md](docs/11-gelismis.md).
- **2 yeni webhook olayı:** `number.detached`, `number.purged` — `*` aboneliğine dahil değildir (toplam 32 olay).
- **`POST /templates/sync`** ve **`GET /templates?refresh=1`**: Meta'dan anlık şablon senkronu (WABA başına dakikada 1; sınırda `429 sync_rate_limited`). Otomatik senkron 15 dakikada bir. Ayrıntı: [docs/04-templates.md](docs/04-templates.md).
- **Olay alanları:** `message.status.*` olaylarına `user_id` ve `direction` (`inbound`/`outbound`); `message.received`'a `interactive` (`{type, name}`; form yanıtında `nfm_reply` / `flow`).
- Uç sayısı: **61** (+ `HEAD /media/{media_id}`).

### Kapsam notu
- **Statik** formlar desteklenir. Meta'nın Endpoint (`data_exchange`) özelliğini kullanan formlarda şifreli Endpoint trafiğini Veri Merkezi karşılamaz.

## [2.19.2] — 2026-10-08

> Yalnız doküman düzeltmesi. **API davranışı değişmedi.**

### Düzeltmeler
- **`PATCH /account/retention`:** saklama süreleri hesap bazında saklanır; **şu an yalnız arama kayıtlarına uygulanır** (mesaj ve medya silme henüz etkin değil). OpenAPI özeti ve `docs/11` buna göre düzeltildi.
- Örneklerdeki `phone_number_id` değerleri yer tutucuyla (`1234567890`) değiştirildi (`docs/04`, SDK README'leri).

## [2.19.1] — 2026-10-08

> Belgeler, OpenAPI, SDK ve Postman tek sürümde hizalandı. **API davranışı değişmedi.**

### Belgeleme
- Eksik 5 uç belgelendi: `PATCH /account/settings`, `PATCH /account/retention`, `POST /privacy/erasure`, `POST /test/inbound`, `POST /webhooks/{id}/rotate-secret` (bkz. [docs/11-gelismis.md](docs/11-gelismis.md)).
- `privacy.erasure_completed` olayı olay listesine eklendi (28 olay).
- OpenAPI `info.version` 2.19.1: 50 uç, olay şeması 28 olayın tamamını listeler.

### Eklenenler
- **Postman koleksiyonu** güncellendi (57 istek, Arama klasörü dahil): `postman/VeriMerkezi.postman_collection.json`.
- **SDK'lar:** `VERSION` sabiti (2.19.1) ve 5 yeni metot; paket sürümleri (`package.json`, `setup.py`, `__init__.py`) 2.19.1.

## [2.19.0] — 2026-10-08

> WhatsApp Arama (Calling). Tamamen additive; mevcut uçlar, olaylar ve `*` abonelikleri etkilenmez. Ayrıntı: [docs/12-arama.md](docs/12-arama.md).

### Eklenenler — Arama (Calling)
- **10 yeni uç:** `GET`/`PATCH /numbers/{phone_number_id}/calling` (ayarlar), `POST /calls` (işletme başlatmalı arama, `Idempotency-Key` destekli), `POST /calls/{call_id}/pre_accept` · `/accept` · `/reject` · `/terminate`, `POST /calls/permission-request` (1 mesaj kredisi), `GET /calls/permission`, `GET /calls` (geçmiş; `peer` süzgeci).
- **Yeni scope'lar:** `calls:read`, `calls:write`.
- **4 yeni webhook olayı:** `call.connect`, `call.status`, `call.terminate`, `call.permission_reply` — **`*` joker aboneliğine dahil değildir**; açıkça ekleyin.
- **SDK'lar** (Node.js / PHP / Python): `getCallingSettings`, `updateCallingSettings`, `startCall`, `preAcceptCall`, `acceptCall`, `rejectCall`, `terminateCall`, `requestCallPermission`, `getCallPermission`, `listCalls` (Python'da snake_case).
- **OpenAPI** 2.2.0: `CallingSettings`, `Call`, `CallAnswer` şemaları ve arama uçları.

### Ücret ve gizlilik
- Kullanıcının başlattığı arama ücretsiz. İşletme başlatmalı aramayı Meta doğrudan faturalar (6 sn dilim); Veri Merkezi arama için kredi düşmez. `billable_pulses` yalnız bilgi amaçlı.
- Ses tarayıcı/uygulama ile Meta arasında doğrudan akar (WebRTC); Veri Merkezi yalnız SDP taşır. SDP kayıtlarda maskelenir (yalnız ilk teslimatta tam).

## [2.18.0] — 2026-10-02

> Sesli not desteği + OGG/Opus düzeltmesi. Geriye dönük uyumlu; mp3/m4a/aac/amr gönderimleri eskisi gibi çalışır.

### Eklenenler — `audio.voice`
- `POST /wa/messages` (`type: "audio"`): opsiyonel `audio.voice` (boolean). `true` → WhatsApp **sesli not** olarak gönderilir (Meta kuralı: yalnız OGG/Opus, tercihen mono). Boolean dışı değer → `422 invalid_media` (`field: "audio.voice"`).
- `voice` verilmezse: medya Meta'da `audio/ogg` kayıtlıysa veya `link` `.ogg`/`.opus` ile bitiyorsa otomatik `voice: true` eklenir.

### Düzeltmeler
- **fix:** OGG/Opus sesli notlar alıcıda "artık mevcut değil" görünüyordu.
- `POST /wa/media`: dosya Meta'ya türe uygun uzantılı adla yüklenir (ör. `.ogg`). Yanıt biçimi değişmedi.

## [2.17.0] — 2026-09-30

> Üç yeni webhook olayı + kullanıcı adı alanının açıklaması. Tamamen additive; mevcut alanlar, olaylar ve `*` abonelikleri etkilenmez.

### Eklenenler — Şablon ve numara olayları (V33, V26)
- **`template.category_changed`** (V33): Meta şablon kategorisini değiştirdiğinde gönderilir (`previous_category`, `new_category`, `correct_category`). Şablonun `category` alanı kendiliğinden güncellenir.
- **`template.quality_changed`** (V26): şablon kalite puanı gerçekten değiştiğinde (`previous_quality_score` → `new_quality_score`: `GREEN`/`YELLOW`/`RED`/`UNKNOWN`).
- **`number.name_changed`** (V26): numara görünen adı için Meta kararı geldiğinde (`decision`: `APPROVED`/`REJECTED`/`DEFERRED`, `requested_name`, `rejection_reason`).
- Üçü de **`*` joker aboneliğine dahil değildir** — almak için olay listesine açıkça ekleyin.

### Belgeleme — Kullanıcı adı (V32)
- `message.received` üst düzey `username` ve `contact.username` alanları (Meta `profile.username`) belgelendi: kullanıcı adı olmayan göndericide `null`; Meta kademeli açtığı için şu an çoğunlukla `null`.

## [2.16.0] — 2026-09-29

> Opt-out (mesaj almak istemeyenler) için anlık olay + liste ucu. Tamamen additive; mevcut alanlar, olaylar ve `*` abonelikleri etkilenmez.

### Eklenenler — Opt-out olayı ve listesi (V25)
- **Yeni webhook olayı `contact.opt_out_changed`:** kişinin `opted_out` bayrağı gerçekten değiştiğinde gönderilir. `data`: `contact_id`, `phone` (E.164), `opted_out`, `previous_opted_out`, `source` (`whatsapp_ret`/`whatsapp_onay`/`admin_override`/`automation`/`panel`/`panel_bulk`), `phone_number_id` (yalnız WhatsApp RET/ONAY'da), `changed_at`. Zarf diğer olaylarla aynı. **`*` joker aboneliğine dahil değildir** — almak için olay listesine açıkça ekleyin.
- **Yeni uç `GET /wa/contacts/opted-out`** (scope `contacts:read`): reddedenler listesi; `limit` 1–200 (vars. 50), opak `cursor`, `since` (ISO 8601, `opted_out_at >= since`), sıralama `id desc`. Geçersiz `since` → `422 invalid_request` (`field: "since"`).
- **`GET /wa/contacts`:** yanıtta `opted_out_at` alanı ve opsiyonel `?opted_out=true|false` süzgeci (geriye dönük uyumlu).

### Güvenlik — API anahtarı scope doğrulaması (V18)
- Anahtar oluşturma isteğinde verilen scope'ların **hiçbiri geçerli değilse istek reddedilir**. Geçerli ve geçersiz adlar karışık verilirse geçersizler yok sayılır.

### Düzeltmeler — Sayfalama dokümanı
- `docs/08`: genel `data` + `pagination` zarfı örneği yanlıştı. Liste uçlarının gerçek zarfları uç bazında belgelendi (`contacts` / `transactions` / `templates` / `data` / `media` + `paging`). `/templates` cursor'ının tamsayı olduğu eklendi. "Tüm kayıtları çekme" SDK örnekleri doğru alanları (`contacts`, `next_cursor`) okuyacak ve PHP imzasına uyacak şekilde düzeltildi. API davranışı değişmedi.

## [2.15.2] — 2026-09-29

> Yalnız doküman düzeltmesi. **API davranışı değişmedi.**

### Düzeltmeler
- **Şablon durumları:** `FLAGGED` bir şablon durumu değildir; dokümandan ve OpenAPI enum'undan çıkarıldı. Geçerli küme: `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `PAUSED`, `DISABLED`. (`flagged`, numara durumu olarak `number.status_changed`'da geçerlidir; `template.flagged` **olayı** değişmeden yayınlanmaya devam eder.)
- **Şablon olayları:** yalnız `template.approved`, `.rejected`, `.flagged`, `.paused` yayınlanır; Meta'nın diğer şablon olayları (`DISABLED`, `PENDING_DELETION`, `REINSTATED`, `IN_APPEAL` vb.) şu an iletilmez — notu eklendi.
- **Zaman damgaları:** ISO 8601, saat dilimi ofsetli (şu an `+03:00`). İstemciler ofseti dikkate almalı, sabit `Z` (UTC) varsaymamalı.

## [2.15.1] — 2026-09-29

> Yalnız doküman düzeltmesi: belgeler canlı kodla karşılaştırılıp eşitlendi. **API davranışı değişmedi.**

### Düzeltmeler — Doküman ↔ kod tutarlılığı
- **Test anahtarı (`vmk_test_*`):** "sandbox / test numarasıyla çalışır" ifadesi düzeltildi — mesaj Meta'ya gönderilmez, yanıttaki `wamid` sahtedir (`test.<hex>`).
- **`text` biçimi:** `POST /messages`'ta `text` hem düz metin hem `{ "body": "..." }` nesnesi olarak kabul edilir; `body` metin değilse `422 invalid_request` (`field: "text"`). OpenAPI şeması buna göre güncellendi.
- **Hız sınırı:** `POST /messages/read` kendi sayacındadır (120/dk) ve gönderim kotasını tüketmez (2.11.0) — tabloya eklendi.
- **Scope'lar:** geçerli scope listesi tamamlandı (`templates:write`, `webhooks:*`, `campaigns:*`, `automation:*`, `inbox:write`).- **Sayfalama:** `/contacts` ve `/credit/transactions` en fazla 200, `/messages` `/media` `/templates` en fazla 100 (varsayılan hepsinde 50). `/messages` ve `/media` cursor'ı tamsayıdır; `/contacts` ve `/credit/transactions` cursor'ı opaktır.
- **Şablon durumları:** `DRAFT` (dokümana) ve `DISABLED` (OpenAPI enum'una) eklendi.
- **`GET /numbers`:** varsayılan yalnız `active`; `?status=all` ve tek durum süzgeci belgelendi.
- **Hata zarfı:** `429` ve `503 rate_limit_unavailable` gövdelerinde şu an `ok` alanı bulunmadığı notu eklendi.
- **Webhook retry:** toplam deneme süresi "36 saat" → ≈ 38,6 saat (SSS).

## [2.15.0] — 2026-09-26

> Webhook `button` alanı (hızlı yanıt / etkileşimli buton yanıtı). Tamamen additive; mevcut alanlar ve eşleştirme değişmedi.

### Eklenenler — Buton yanıtı (V31)
- `message.received` (+ `message.echo` / `message.history`) olaylarına `button` alanı: `{ "payload": "...", "text": "..." }`. Kaynaklar: şablon hızlı-yanıt butonu (`type: button` → `button.payload`/`text`), etkileşimli `button_reply` (id/title) ve `list_reply` (id/title). Buton olmayan mesajlarda `null`. Eşleştirme artık `context.message_id` yanında `data.button.payload` ile de yapılabilir.

## [2.14.0] — 2026-09-26

> Şablonlar işletme hesabı (WABA) düzeyinde: şablon oluştururken telefon gerekmez. **Geriye dönük uyumlu** — `phone_number_id`/`waba_id` eskisi gibi çalışır; mevcut entegrasyonlar etkilenmez.

### Değişiklikler — Şablon = WABA düzeyi
- `POST /wa/templates`: `phone_number_id` artık **zorunlu değil**. Verilmezse hesabın tek WABA'sı otomatik kullanılır; birden çok WABA varsa `422 waba_required` (`waba_id` istenir). `phone_number_id`/`waba_id` verilirse eskisi gibi WABA ondan türetilir. Panelde tek işletme hesaplı kullanıcıya numara sorulmaz (çok WABA'da işletme hesabına göre gruplanır).
- `GET /wa/templates`: her kayıtta `waba_id` + **yeni** `phone_number_ids` (o WABA'daki aktif numaralar). Liste WABA'ya göre süzülür (numara koparsa şablon kaybolmaz), kullanıcı-kapsamı korunur (sızıntı yok). `phone_number_id`/`display_phone_number` korunur ama **eski** (WABA'nın ilk aktif numarası; yoksa null) — `phone_number_ids` kullanın.

### Eklenenler — Hata kodu
- `template_not_in_waba` (`422`, `retryable:false`): şablonlu gönderimde şablon gönderen numaranın WABA'sında yoksa/onaylı değilse. Meta `132001` bu koda eşlenir; gövde biçimi diğer 422'lerle aynı.

### Politika
- "Şablonlar işletme hesabı (WABA) düzeyindedir; bir işletmenin bütün numaraları aynı işletme hesabına bağlanır ve aynı şablonları kullanır."

## [2.13.0] — 2026-09-25

> Dayanıklılık: webhook kapanış (deferred) işleri için kalıcı kuyruk + arka plan worker. Dahili sağlamlaştırma; istemci tarafında değişiklik yok, API sözleşmesi değişmedi.

### Güvenilirlik — Deferred iş kalıcı kuyruğu (V20)
- Webhook kapanışında çalışan işler (özellikle coexistence/echo medya indirme) `register_shutdown_function` ile inline çalışır; süreç sert ölürse (OOM/timeout) kaybolabiliyordu. Artık kalıcı `v2_wa_deferred_jobs` kuyruğuna yazılır: inline tamamlanınca kapatılır (`done`), tamamlanamazsa `wa-resume` 5dk cron'una eklenen worker (`cron/wa-deferred.php` → `DeferredJobs::dispatch`) devralıp medyayı indirir ve mesaj kaydına iliştirir. **Yeniden webhook olayı yayınlanmaz** (çift bildirim yok) — yalnız arşiv/`GET /wa/messages` bütünlüğü güçlenir. Idempotent (dedup_key=wamid; _media varsa kısa devre), kilitli, denemeler sınırlı (6). Inline hızlı-yol aynen korunur; kuyruk yazımı ingest'i asla bozmaz (tam try/catch).

## [2.12.0] — 2026-09-25

> Başarısız kimlik doğrulama için IP başına hız sınırı. **Geçerli anahtarla çalışan istemciler etkilenmez** (yalnız 401 yolu sayılır); kalıcı yasak yoktur.

### Güvenlik — Başarısız auth hız sınırı (V29)
- Geçersiz/eksik API anahtarıyla gelen istekler IP başına 60/dk ile sınırlandı; aşılırsa `429` + `Retry-After`. Kaba kuvvet / anahtar deneme trafiğini frenler. Kalıcı ban yok — 60 sn pencere dolunca sıfırlanır. `failClosed=false`: hız-limit servisinde DB hatası olsa da istek `401`'e düşer (auth gevşemez).

## [2.11.0] — 2026-09-25

> Webhook secret rotasyonu (yerinde, kesintisiz) + `/messages/read` kendi hız kovasında. İkisi de **geriye dönük uyumlu**; rotasyon yapmayan aboneler ve mevcut istemciler etkilenmez.

### Eklenenler — Webhook secret rotasyonu (V9-f)
- `POST /wa/webhooks/{id}/rotate-secret` (yetki `webhooks:write`): aboneliği silip yeniden oluşturmadan (id/istatistik/geçmiş korunur) secret'ı döndürür. Yeni secret **yalnızca bu yanıtta** döner. Gövdede opsiyonel `grace_seconds` (0–604800, vars. 86400): bu süre boyunca VM her teslimde **ek** `X-VeriMerkezi-Signature-256-Previous` başlığını eski secret'la imzalar → alıcı geçiş sırasında hiçbir doğrulama kaybetmez. Yanıt `previous_valid_until` taşır. Birincil `X-VeriMerkezi-Signature-256` her zaman güncel secret'la; `grace_seconds=0` → previous imza yok. Yeni nullable kolonlar: `previous_secret_encrypted/_iv/_tag`, `previous_valid_until`.

### Değişiklikler — Hız sınırı (V15)
- `POST /wa/messages/read` (okundu/typing) artık **gönderim (send) hız kovasını tüketmez**; kendi kovasında. Kredi harcamayan okundu-işaretleri, mesaj gönderme kotanızı yemez. (Send kotası artar, azalmaz.)

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
