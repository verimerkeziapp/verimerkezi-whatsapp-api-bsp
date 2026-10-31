/**
 * VeriMerkezi WhatsApp API — Node.js SDK
 *
 * Kullanım:
 * const { VeriMerkeziClient } = require('./verimerkezi-client');
 * const vm = new VeriMerkeziClient('vmk_live_xxxxxxxxxxxxxxxx');
 * await vm.sendTemplate('1234567890', '905551234567', 'hosgeldin_mesaji', 'tr', [
 * { type: 'body', parameters: [{ type: 'text', text: 'Ahmet' }] }
 * ]);
 *
 * v2.19.1 — 2026-10-08 — API 2.19.1 ile hizalandı (hesap ayarları, KVKK saklama/silme,
 * sandbox gelen mesaj, webhook secret döndürme)
 * v2.33.0 — 2026-10-31 — Webhook: message.received ve GET /messages yanıtına data.referral (Click-to-WhatsApp reklam referralı: source_url/source_id/source_type/headline/body/media_type/image_url/video_url/thumbnail_url/ctwa_clid/welcome_message). Webhook gövdesi olduğu gibi geçirildiğinden yeni metot gerekmez; alanı doğrudan event.data.referral ile okuyun.
 * v2.32.1 — 2026-10-25 — sendText: isteğe bağlı bağlantı önizlemesi (text.preview_url); varsayılan kapalı, eski çağrılar değişmeden çalışır
 * v2.32.0 — 2026-10-22 — getErrorCodes() (GET /meta/error-codes, hata sözlüğü); hata yanıtlarında message_tr/action_tr; message.status.failed ve şablon olaylarında Türkçe alanlar; yeni olaylar: number.limit_changed, account.review_changed, message.status.deleted, 8 şablon durumu; GET /numbers: payment_method_status
 * v2.31.1 — 2026-10-22 — kopma nedeni sonradan gelirse güncellenir (number.status_changed tekrar, nedenli); SDK imzası değişmedi
 * v2.31.0 — 2026-10-20 — getDisconnectReasons() (GET /meta/disconnect-reasons); GET /numbers ve number.status_changed: disconnect_message_tr, disconnect_action_tr, reconnect_url
 * v2.30.0 — 2026-10-20 — GET /numbers: disconnect_reason, disconnect_initiated_by, reauth_required, reauth_required_at (SDK imzası değişmedi)
 * v2.29.0 — 2026-10-19 — privacyErasure: isteğe bağlı reference; SDK'nın otomatik Idempotency-Key'i artık KVKK silmede de yeniden denemeyi güvenli kılar (aynı erasure_id)
 * v2.28.0 — 2026-10-19 — eşzamanlı medya sınırı (429 scope=concurrency, Retry-After ile otomatik yeniden deneme); sunucu tarafı önbellek ve devre kesici
 * v2.27.0 — 2026-10-19 — 429 ve 503'te Retry-After ile otomatik yeniden deneme; hesap düzeyi hız sınırı başlıkları (X-RateLimit-Account-*, X-RateLimit-Scope)
 * v2.26.1 — 2026-10-15 — Belge düzeltmesi: opt_out_autoreply_enabled her zaman true (false yok sayılır); kod değişmedi
 * v2.26.0 — 2026-10-14 — listFlows: limit ≤ 200, yanıtta next_cursor + has_more (after parametresine next_cursor verin); form yazma yanıtlarında hint ve hint_message
 * v2.25.0 — 2026-10-14 — şablon yönetimi: uploadTemplateMedia, copyTemplate, deleteTemplatesByName; updateTemplate ek alanlar; deleteTemplate artık yalnız o dili siler
 * v2.24.0 — 2026-10-14 — message.received: data.unsupported (type, raw_type, error_code, error_title)
 * v2.23.0 — 2026-10-13 — WhatsApp Business uygulaması rehberi: listAppContacts, getAppContactsSyncStatus (+ contact.synced olayı)
 * Belgeler: https://api.verimerkezi.app/referans/
 */

const crypto = require('crypto');

const VERSION = '2.33.0';

class VeriMerkeziException extends Error {
 constructor(message, statusCode = 0, errorCode = null, errorData = null) {
 super(message);
 this.name = 'VeriMerkeziException';
 this.statusCode = statusCode;
 this.errorCode = errorCode;
 this.errorData = errorData;
 }
}

class VeriMerkeziClient {
 constructor(apiKey, options = {}) {
 if (!/^vmk_(live|test)_/.test(apiKey)) {
 throw new Error('API key formatı geçersiz (vmk_live_... veya vmk_test_... olmalı)');
 }
 this.apiKey = apiKey;
 this.baseUrl = (options.baseUrl || 'https://api.verimerkezi.app/wa').replace(/\/$/, '');
 this.timeout = options.timeout || 30000;
 this.maxRetries = options.maxRetries || 3;
 }

 me() { return this._get('/me'); }
 numbers() { return this._get('/numbers'); }

 sendTemplate(phoneNumberId, to, templateName, language = 'tr', components = []) {
 return this._post('/messages', {
 phone_number_id: phoneNumberId,
 to,
 template: { name: templateName, language, components },
 });
 }

 // AUTHENTICATION (OTP) şablonuyla doğrulama kodu gönderir — gövde+buton otomatik kurulur.
 sendOtp(phoneNumberId, to, templateName, code, language = 'tr') {
 return this._post('/messages', {
 phone_number_id: phoneNumberId,
 to,
 template: { name: templateName, language, otp: code },
 });
 }

 // previewUrl: true → metindeki bağlantının önizlemesi gösterilir (2.32.1)
 sendText(phoneNumberId, to, text, previewUrl = false) {
 return this._post('/messages', { phone_number_id: phoneNumberId, to, text: previewUrl ? { body: text, preview_url: true } : text });
 }

 // ── Medya (link tabanlı) ───────────────────────────────────────────────
 // Serbest medya yalnızca 24 saatlik müşteri hizmet penceresi içinde gönderilebilir
 // (aksi halde Meta 131047 — şablon kullanın). Public https link gerekir. 1 kredi.
 // Limitler: image ≤5MB jpeg/png · video ≤16MB mp4 · audio ≤16MB · document ≤100MB.
 sendImage(phoneNumberId, to, link, caption = null) {
 const image = { link };
 if (caption != null) image.caption = caption;
 return this._post('/messages', { phone_number_id: phoneNumberId, to, type: 'image', image });
 }

 sendVideo(phoneNumberId, to, link, caption = null) {
 const video = { link };
 if (caption != null) video.caption = caption;
 return this._post('/messages', { phone_number_id: phoneNumberId, to, type: 'video', video });
 }

 sendAudio(phoneNumberId, to, link) {
 return this._post('/messages', { phone_number_id: phoneNumberId, to, type: 'audio', audio: { link } });
 }

 sendDocument(phoneNumberId, to, link, filename = null, caption = null) {
 const document = { link };
 if (filename != null) document.filename = filename;
 if (caption != null) document.caption = caption;
 return this._post('/messages', { phone_number_id: phoneNumberId, to, type: 'document', document });
 }

 // ── Okundu bilgisi + yazıyor göstergesi ────────────────────────────────
 // Gelen bir mesajı okundu işaretler (mavi tik). typing:true ~25sn "yazıyor…"
 // göstergesi gösterir. Kredi harcamaz.
 markRead(phoneNumberId, messageId, typing = false) {
 return this._post('/messages/read', { phone_number_id: phoneNumberId, message_id: messageId, typing });
 }

 listContacts({ cursor = null, limit = 50, search = null } = {}) {
 const params = new URLSearchParams();
 params.set('limit', limit);
 if (cursor) params.set('cursor', cursor);
 if (search) params.set('q', search);
 return this._get('/contacts?' + params.toString());
 }

 createContact(phone, name, extra = {}) {
 return this._post('/contacts', { phone, name, ...extra });
 }

 bulkContacts(contacts, skipDuplicates = true) {
 return this._post('/contacts/bulk', { contacts, skip_duplicates: skipDuplicates });
 }

 // Uygulama rehberi (v2.23.0, contacts:read) — coexistence numaralarında telefondaki WhatsApp Business uygulaması rehberi.
 // Panel kişi rehberinden (listContacts) ayrıdır. Değişiklikler contact.synced olayıyla gelir ('*' kapsamaz).
 listAppContacts({ phoneNumberId = null, updatedSince = null, includeRemoved = false, limit = 50, cursor = null } = {}) {
 const params = new URLSearchParams();
 params.set('limit', limit);
 if (phoneNumberId) params.set('phone_number_id', phoneNumberId);
 if (updatedSince) params.set('updated_since', updatedSince instanceof Date ? updatedSince.toISOString() : updatedSince);
 if (includeRemoved) params.set('include_removed', 'true');
 if (cursor) params.set('cursor', cursor);
 return this._get('/app-contacts?' + params.toString());
 }

 // Senkron durumu: coexistence, sync_supported, reason, initial_sync { status, requested_at, completed_at }, sayılar.
 getAppContactsSyncStatus(phoneNumberId) { return this._get('/numbers/' + encodeURIComponent(phoneNumberId) + '/app-contacts/sync'); }

 // ── Şablon yönetimi (templates) ────────────────────────────────────────
 // listTemplates artık opsiyonel filtre alır (status/category/language/q/cursor/limit);
 // argümansız çağrı önceki gibi tüm şablonları döner.
 listTemplates({ status, category, language, q, cursor, limit } = {}) {
 const params = new URLSearchParams();
 if (status) params.set('status', status);
 if (category) params.set('category', category);
 if (language) params.set('language', language);
 if (q) params.set('q', q);
 if (cursor) params.set('cursor', String(cursor));
 if (limit != null) params.set('limit', String(limit));
 const qs = params.toString();
 return this._get('/templates' + (qs ? '?' + qs : ''));
 }

 // Yeni şablon oluşturur — Meta'ya gönderilir, durum PENDING olur.
 // data: { waba_id | phone_number_id, name, language, category, components, ... }
 createTemplate(data) { return this._post('/templates', data); }

 // Şablonu Meta'ya GÖNDERMEDEN doğrular (aynı gövde şeması; components + waba_id/phone_number_id zorunlu).
 validateTemplate(data) { return this._post('/templates/validate', data); }

 // Şablonları Meta'dan ŞİMDİ senkronlar (WABA başına dakikada 1; sınırda 429 sync_rate_limited). phoneNumberId opsiyonel.
 syncTemplates(phoneNumberId) { return this._post('/templates/sync', phoneNumberId ? { phone_number_id: phoneNumberId } : {}); }

 getTemplate(id) { return this._get('/templates/' + encodeURIComponent(id)); }

 // Onaylı/reddedilmiş/duraklatılmış şablonu düzenler (durum PENDING olur; components TAM liste). opts: category (yalnız reddedilen/duraklatılan),
 // message_send_ttl_seconds, header_media_ref, header_media_url, allow_category_change, cta_url_link_tracking_opted_out, optout_footer.
 // Onaylı şablon 24 saatte 1, 30 günde 10 düzenlenebilir (429 template_edit_limit: next_edit_at, retry_after).
 updateTemplate(id, components, opts = {}) {
 const body = { components };
 for (const [k, v] of Object.entries(opts || {})) { if (v != null) body[k] = v; }
 return this._patch('/templates/' + encodeURIComponent(id), body);
 }

 // 2.25.0'dan beri YALNIZ bu dili siler (Meta: name + hsm_id). Adın tüm dilleri için deleteTemplatesByName().
 deleteTemplate(id) { return this._delete('/templates/' + encodeURIComponent(id)); }

 // Adın TÜM dillerini siler: DELETE /templates?name=… Yanıt: deleted, name, waba_id, ids, languages. Birden çok WABA'da wabaId (ya da phoneNumberId) verin.
 deleteTemplatesByName(name, wabaId, phoneNumberId) {
 const q = new URLSearchParams({ name });
 if (wabaId) q.set('waba_id', wabaId);
 if (phoneNumberId) q.set('phone_number_id', phoneNumberId);
 return this._delete('/templates?' + q.toString());
 }

 // Şablonu yeni ad/dil ile kopyalar (POST /templates/{id}/copy). data: name (zorunlu), language, category, components, waba_id, header_media_ref …
 copyTemplate(id, data) { return this._post('/templates/' + encodeURIComponent(id) + '/copy', data); }

 // Medya başlıklı şablon için örnek dosyayı yükler (POST /templates/media) → { header_handle, header_media_ref, format, mime_type, file_size, waba_id }.
 // source: dosya yolu | Buffer (multipart; JPEG/PNG ≤5 MB, MP4 ≤16 MB, PDF ≤100 MB) ya da { url } / { media_id, phone_number_id } (JSON).
 // opts: format (IMAGE|VIDEO|DOCUMENT), waba_id, phone_number_id, filename, contentType.
 // header_handle'ı HEADER example.header_handle[0]'a, header_media_ref'i createTemplate gövdesine koyun.
 async uploadTemplateMedia(source, opts = {}) {
 if (source && typeof source === 'object' && !Buffer.isBuffer(source)) {
 const { filename, contentType, ...rest } = opts || {};
 return this._post('/templates/media', { ...source, ...rest });
 }
 const fs = require('fs');
 const buf = Buffer.isBuffer(source) ? source : fs.readFileSync(source);
 const name = opts.filename || (typeof source === 'string' ? require('path').basename(source) : 'file');
 const fd = new FormData();
 fd.set('file', new Blob([buf], opts.contentType ? { type: opts.contentType } : undefined), name);
 for (const k of ['format', 'waba_id', 'phone_number_id']) { if (opts[k]) fd.set(k, String(opts[k])); }
 const res = await fetch(this.baseUrl + '/templates/media', {
 method: 'POST',
 headers: { 'Authorization': 'Bearer ' + this.apiKey, 'User-Agent': 'VeriMerkezi-NodeJS-SDK/' + VERSION },
 body: fd,
 });
 const txt = await res.text();
 let j; try { j = txt ? JSON.parse(txt) : {}; } catch { j = {}; }
 if (!res.ok) throw new VeriMerkeziException(j?.error?.message || ('HTTP ' + res.status), res.status, j?.error?.code || null, j?.error || null);
 return j;
 }

 getProfile(phoneNumberId) { return this._get('/profile/' + encodeURIComponent(phoneNumberId)); }
 updateProfile(phoneNumberId, fields) { return this._patch('/profile/' + encodeURIComponent(phoneNumberId), fields); }
 reportsSummary(period = '30d') { return this._get('/reports/summary?period=' + encodeURIComponent(period)); }

 // ── Medya ───────────────────────────────────────────────────────────
 // Webhook'taki data.media.media_id degerini dogrudan kullanin.
 // Depodaki dosya yollarina dogrudan HTTP erisimi KAPALIDIR.

 async listMedia({ source, kind, cursor, limit = 50 } = {}) {
 const q = new URLSearchParams({ limit: String(limit) });
 if (source) q.set('source', source);
 if (kind) q.set('kind', kind);
 if (cursor) q.set('cursor', String(cursor));
 return this._get('/media?' + q.toString());
 }

 async mediaInfo(mediaId) { return this._get('/media/' + parseInt(mediaId, 10) + '?meta=1'); }

 /**
  * Medya dosyasini indirir. Buffer doner.
  * Buyuk dosyalarda bellek yerine akis icin ikinci parametreye
  * yazilabilir bir stream verin (or. fs.createWriteStream('dosya.mp4')).
  */
 async downloadMedia(mediaId, writableStream = null) {
 const url = this.baseUrl + '/media/' + parseInt(mediaId, 10);
 const res = await fetch(url, {
 headers: {
 'Authorization': 'Bearer ' + this.apiKey,
 'User-Agent': 'VeriMerkezi-NodeJS-SDK/' + VERSION,
 },
 });
 if (!res.ok) {
 let kod = 'http_error';
 let mesaj = 'HTTP ' + res.status;
 try {
 const j = await res.json();
 if (j && j.error) { kod = j.error.code || kod; mesaj = j.error.message || mesaj; }
 } catch (_) { /* ikili govde */ }
 throw new VeriMerkeziException(mesaj, res.status, kod);
 }
 if (writableStream) {
 const { Readable } = require('stream');
 await new Promise((resolve, reject) => {
 Readable.fromWeb(res.body).pipe(writableStream).on('finish', resolve).on('error', reject);
 });
 return writableStream;
 }
 return Buffer.from(await res.arrayBuffer());
 }

 // ── Alıntılı cevap + tepki (2026-09-22) ────────────────────────────────
 sendReply(phoneNumberId, to, text, replyToWamid) {
 return this._post('/messages', { phone_number_id: phoneNumberId, to, text, context: { message_id: replyToWamid } });
 }
 // emoji '' → önceki tepkiyi kaldırır
 reactToMessage(phoneNumberId, to, messageId, emoji) {
 return this._post('/messages', { phone_number_id: phoneNumberId, to, type: 'reaction', reaction: { message_id: messageId, emoji } });
 }

 // ── Dosya yükleme → Meta media_id (multipart) ──────────────────────────
 async uploadMedia(phoneNumberId, fileInput, filename, contentType) {
 const fs = require('fs');
 const buf = Buffer.isBuffer(fileInput) ? fileInput : fs.readFileSync(fileInput);
 const name = filename || (typeof fileInput === 'string' ? require('path').basename(fileInput) : 'file');
 const fd = new FormData();
 fd.set('phone_number_id', String(phoneNumberId));
 fd.set('file', new Blob([buf], contentType ? { type: contentType } : undefined), name);
 const res = await fetch(this.baseUrl + '/media', {
 method: 'POST',
 headers: { 'Authorization': 'Bearer ' + this.apiKey, 'User-Agent': 'VeriMerkezi-NodeJS-SDK/' + VERSION },
 body: fd,
 });
 const txt = await res.text();
 let j; try { j = txt ? JSON.parse(txt) : {}; } catch { j = {}; }
 if (!res.ok) throw new VeriMerkeziException(j?.error?.message || ('HTTP ' + res.status), res.status, j?.error?.code || null);
 return j;
 }

 // ── Uzlaştırma, geçmiş, ayarlar, sağlık ────────────────────────────────
 listMessages({ phoneNumberId, since, cursor, limit = 50 } = {}) {
 const q = new URLSearchParams({ phone_number_id: String(phoneNumberId), limit: String(limit) });
 if (since) q.set('since', since);
 if (cursor) q.set('cursor', String(cursor));
 return this._get('/messages?' + q.toString());
 }
 redeliverWebhooks(since) { return this._post('/webhooks/redeliver', { since }); }
 historyImportStatus(phoneNumberId) { return this._get('/numbers/' + encodeURIComponent(phoneNumberId) + '/history-import'); }
 startHistoryImport(phoneNumberId) { return this._post('/numbers/' + encodeURIComponent(phoneNumberId) + '/history-import', {}); }
 numberSettings(phoneNumberId, settings) { return this._patch('/numbers/' + encodeURIComponent(phoneNumberId) + '/settings', settings); }
 // Numarayı hesaptan ayır (2026-10-08). purgeMessages ZORUNLU: true = kayıtlar ≤24 saatte silinir (GERİ ALINAMAZ).
 // Olaylar: number.detached / number.purged ('*' kapsamaz). Numara Meta/WABA'da kayıtlı kalır.
 detachNumber(phoneNumberId, purgeMessages, reason) { const b = { purge_messages: purgeMessages === true }; if (reason) b.reason = reason; return this._post('/numbers/' + encodeURIComponent(phoneNumberId) + '/detach', b); }
 health() { return this._get('/health'); }

 // ── Hesap ayarları + KVKK (2026-09-25) ───────────────────────────────
 // settings: revoke_edit_clean, automation_enabled, opt_out_autoreply_enabled (tüm numaralara),
 // default_automation_enabled, default_opt_out_autoreply_enabled (yeni numaralar) — boolean, en az bir alan.
 accountSettings(settings) { return this._patch('/account/settings', settings); }
 // retention: { messages_days (1-3650), media_days (1-3650), webhook_deliveries_days (1-365) } — en az bir alan.
 updateRetention(retention) { return this._patch('/account/retention', retention); }
 // Numara kopma / kısıt / yeniden yetki nedenleri sözlüğü (2.31.0)
 getDisconnectReasons() { return this._request('GET', '/meta/disconnect-reasons'); }
 // Hata kodları sözlüğü (2.32.0) — source: meta_message | meta_template | meta_account | meta_call | vm
 getErrorCodes(source = null) { return this._request('GET', '/meta/error-codes' + (source ? '?source=' + encodeURIComponent(source) : '')); }

 // KVKK silme/unutulma — waId (telefon) veya userId (BSUID) zorunlu. 202 + privacy.erasure_completed olayı.
 privacyErasure({ waId, userId, phoneNumberId, reference } = {}) {
 const body = {};
 if (reference != null) body.reference = reference;
 if (waId != null) body.wa_id = waId;
 if (userId != null) body.user_id = userId;
 if (phoneNumberId != null) body.phone_number_id = phoneNumberId;
 return this._post('/privacy/erasure', body);
 }

 // ── Sandbox (yalnız vmk_test_ anahtarı) ────────────────────────────────
 // Sahte gelen mesaj enjekte eder → imzalı message.received / message.revoked / message.edited
 // olayları aboneliklerinize gider. type: 'text' | 'revoke' | 'edit'. Meta'ya istek gitmez.
 testInbound(phoneNumberId, { type = 'text', from, text, originalMessageId } = {}) {
 const body = { phone_number_id: phoneNumberId, type };
 if (from != null) body.from = from;
 if (text != null) body.text = text;
 if (originalMessageId != null) body.original_message_id = originalMessageId;
 return this._post('/test/inbound', body);
 }

 // ── Webhooks ───────────────────────────────────────────────────────────
 // Webhook abonelikleri v1.9.0 ile programatik olarak yönetilebilir (aşağıdaki metotlar).
 // secret YALNIZCA createWebhook yanıtında bir kez döner — güvenli saklayın.
 // Gelen olayların imzasını doğrulamak için statik verifyWebhookSignature() kullanın.
 // events boş bırakılırsa ['*'] kullanılır; joker '*' joker-dışı yeni olayları KAPSAMAZ
 // (message.revoked/edited/history/sent, number.status_changed, credit.low/exhausted) — açıkça ekleyin.
 createWebhook(url, events = ['*'], description = null) {
 const body = { url, events };
 if (description != null) body.description = description;
 return this._post('/webhooks', body);
 }
 listWebhooks() { return this._get('/webhooks'); }
 updateWebhook(id, fields) { return this._patch('/webhooks/' + encodeURIComponent(id), fields); }
 deleteWebhook(id) { return this._delete('/webhooks/' + encodeURIComponent(id)); }
 testWebhook(id) { return this._post('/webhooks/' + encodeURIComponent(id) + '/test', {}); }
 // Secret'ı yerinde döndürür; yeni secret YALNIZCA bu yanıtta döner. graceSeconds (0-604800, vars. 86400)
 // boyunca eski secret X-VeriMerkezi-Signature-256-Previous başlığıyla ikinci imza olarak gönderilir.
 rotateWebhookSecret(id, graceSeconds = null) {
 const body = {};
 if (graceSeconds != null) body.grace_seconds = graceSeconds;
 return this._post('/webhooks/' + encodeURIComponent(id) + '/rotate-secret', body);
 }

 // ── Arama (Calling) — 2026-10-08 ─────────────────────────────────────
 // Ses WebRTC ile Meta <-> sizin uç arasında akar; API yalnız SDP iletir. Kredi düşmez.
 // Olaylar: call.connect / call.status / call.terminate / call.permission_reply ('*' kapsamaz — açıkça ekleyin).
 // Yanıtta eligibility: { eligible_inbound, eligible_outbound, checks: [{ key, ok, title_tr, detail_tr, how_to_fix_tr }] }
 getCallingSettings(phoneNumberId, raw = false) {
 return this._get('/numbers/' + encodeURIComponent(phoneNumberId) + '/calling' + (raw ? '?raw=1' : ''));
 }
 // settings: { enabled, callback_permission, call_icon_visibility, call_hours } — yalnız verilen alanlar değişir
 updateCallingSettings(phoneNumberId, settings) {
 return this._patch('/numbers/' + encodeURIComponent(phoneNumberId) + '/calling', settings);
 }
 // İşletme başlatmalı arama — kullanıcının arama izni gerekir. Dönen call_id ile terminateCall.
 startCall(phoneNumberId, to, sdpOffer, bizOpaque = null) {
 const body = { phone_number_id: phoneNumberId, to, sdp_offer: sdpOffer };
 if (bizOpaque != null) body.biz_opaque = bizOpaque;
 return this._post('/calls', body);
 }
 preAcceptCall(callId, sdpAnswer) { return this._callAction(callId, 'pre_accept', { sdp_answer: sdpAnswer }); }
 acceptCall(callId, sdpAnswer) { return this._callAction(callId, 'accept', { sdp_answer: sdpAnswer }); }
 rejectCall(callId) { return this._callAction(callId, 'reject', {}); }
 terminateCall(callId) { return this._callAction(callId, 'terminate', {}); }
 requestCallPermission(phoneNumberId, to, body = null) {
 const payload = { phone_number_id: phoneNumberId, to };
 if (body != null) payload.body = body;
 return this._post('/calls/permission-request', payload);
 }
 getCallPermission(phoneNumberId, to) {
 return this._get('/calls/permission?phone_number_id=' + encodeURIComponent(phoneNumberId) + '&to=' + encodeURIComponent(to));
 }
 // from/to: ISO 8601 tarih aralığı; peer: karşı taraf numarası
 listCalls({ phoneNumberId, from, to, peer, cursor, limit } = {}) {
 const params = new URLSearchParams();
 if (phoneNumberId) params.set('phone_number_id', phoneNumberId);
 if (from) params.set('from', from);
 if (to) params.set('to', to);
 if (peer) params.set('peer', peer);
 if (cursor) params.set('cursor', String(cursor));
 if (limit != null) params.set('limit', String(limit));
 const qs = params.toString();
 return this._get('/calls' + (qs ? '?' + qs : ''));
 }
 // call_id '/' içerirse yol yerine '_' + gövdede call_id gönderilir.
 _callAction(callId, action, body) {
 const id = String(callId);
 if (id.includes('/')) return this._post('/calls/_/' + action, { ...body, call_id: id });
 return this._post('/calls/' + encodeURIComponent(id) + '/' + action, body);
 }

 // ── Formlar (WhatsApp Flows) — 2026-10-08 ─────────────────────────────
 // Formlar WABA düzeyindedir. Yönetim kredisiz; form mesajı (sendFlow) normal mesaj gibi 1 kredi.
 // Olaylar: flow.completed / flow.status_changed ('*' kapsamaz — açıkça ekleyin).
 // phoneNumberId (isteğe bağlı) Meta arayüzünde oluşturulmuş formu hesabınıza bağlamak içindir.
 // listFlows: limit ≤ 200; sonraki sayfa için yanıttaki next_cursor değerini after olarak verin (has_more: false → son sayfa).
 listFlows(phoneNumberId, { limit, after } = {}) {
 const params = new URLSearchParams({ phone_number_id: phoneNumberId });
 if (limit != null) params.set('limit', String(limit));
 if (after) params.set('after', after);
 return this._get('/flows?' + params.toString());
 }
 // categories: ['LEAD_GENERATION', ...]; flowJson: nesne ya da JSON metni (≤ 10 MB)
 createFlow(phoneNumberId, name, categories, flowJson, endpointUri = null) {
 const body = { phone_number_id: phoneNumberId, name, categories, flow_json: flowJson };
 if (endpointUri) body.endpoint_uri = endpointUri;
 return this._post('/flows', body);
 }
 getFlow(flowId, phoneNumberId = null) { return this._get(this._flowPath(flowId, '', phoneNumberId)); }
 // Yalnız DRAFT form
 updateFlowJson(flowId, flowJson, phoneNumberId = null) { return this._put(this._flowPath(flowId, '/json', phoneNumberId), { flow_json: flowJson }); }
 publishFlow(flowId, phoneNumberId = null) { return this._post(this._flowPath(flowId, '/publish', phoneNumberId), {}); }
 deprecateFlow(flowId, phoneNumberId = null) { return this._post(this._flowPath(flowId, '/deprecate', phoneNumberId), {}); }
 // Yalnız DRAFT form
 deleteFlow(flowId, phoneNumberId = null) { return this._delete(this._flowPath(flowId, '', phoneNumberId)); }
 getFlowPreview(flowId, invalidate = false, phoneNumberId = null) {
 const p = this._flowPath(flowId, '/preview', phoneNumberId);
 return this._get(p + (invalidate ? (p.includes('?') ? '&' : '?') + 'invalidate=true' : ''));
 }
 // from/to: YYYY-MM-DD; metric: ENDPOINT_REQUEST_COUNT (varsayılan) ...; granularity: DAY | HOUR | LIFETIME
 getFlowMetrics(flowId, { from, to, metric, granularity, phoneNumberId } = {}) {
 const params = new URLSearchParams();
 if (from) params.set('from', from);
 if (to) params.set('to', to);
 if (metric) params.set('metric', metric);
 if (granularity) params.set('granularity', granularity);
 if (phoneNumberId) params.set('phone_number_id', phoneNumberId);
 const qs = params.toString();
 return this._get('/flows/' + encodeURIComponent(flowId) + '/metrics' + (qs ? '?' + qs : ''));
 }
 // flow: { flow_id | flow_name, flow_token?, cta (≤20), body, header?, footer?, mode: 'published'|'draft', action?, screen, data? }
 // Yanıttaki flow.flow_token, flow.completed olayında aynen döner.
 sendFlow(phoneNumberId, to, flow) {
 return this._post('/messages', { phone_number_id: phoneNumberId, to, type: 'flow', flow });
 }
 // Konum (v2.21.0): latitude -90..90, longitude -180..180; name/address isteğe bağlı (≤1000). Serbest mesaj, 1 kredi.
 sendLocation(phoneNumberId, to, latitude, longitude, name = null, address = null) {
 const location = { latitude, longitude };
 if (name) location.name = name;
 if (address) location.address = address;
 return this._post('/messages', { phone_number_id: phoneNumberId, to, type: 'location', location });
 }
 // Kişi kartı (v2.21.0): contacts = [{ name: { formatted_name }, phones?: [{ phone, type?, wa_id? }], emails?, org?, urls?, addresses?, birthday? }] — 1..20 kart.
 sendContacts(phoneNumberId, to, contacts) {
 return this._post('/messages', { phone_number_id: phoneNumberId, to, type: 'contacts', contacts });
 }
 // Etkileşimli mesaj (v2.22.0) — Meta biçiminde interactive nesnesi: { type: 'button'|'list'|'cta_url'|'location_request_message', header?, body, footer?, action }.
 sendInteractive(phoneNumberId, to, interactive) {
 return this._post('/messages', { phone_number_id: phoneNumberId, to, type: 'interactive', interactive });
 }
 // Yanıt düğmeleri (v2.22.0): buttons = [{ id (≤256), title (≤20) }] — 1..3. options: { header?: 'metin' | {type:'image'|'video'|'document'|'text', ...}, footer?: 'metin' (≤60) }. body ≤1024.
 sendButtons(phoneNumberId, to, bodyText, buttons, options = {}) {
 const interactive = this._interactiveBase('button', bodyText, options);
 interactive.action = { buttons: buttons.map((b) => (b.reply ? b : { type: 'reply', reply: { id: b.id, title: b.title } })) };
 return this.sendInteractive(phoneNumberId, to, interactive);
 }
 // Liste (v2.22.0): buttonText ≤20; sections = [{ title?, rows: [{ id (≤200), title (≤24), description? (≤72) }] }] — 1..10 bölüm, toplam ≤10 satır. options: { header?: 'metin' (≤60), footer? }. body ≤4096.
 sendList(phoneNumberId, to, bodyText, buttonText, sections, options = {}) {
 const interactive = this._interactiveBase('list', bodyText, options);
 interactive.action = { button: buttonText, sections };
 return this.sendInteractive(phoneNumberId, to, interactive);
 }
 // Bağlantı düğmesi (v2.22.0): displayText ≤20, url http(s). options: { header?, footer? }. Dokunma webhook olayı üretmez.
 sendCtaUrl(phoneNumberId, to, bodyText, displayText, url, options = {}) {
 const interactive = this._interactiveBase('cta_url', bodyText, options);
 interactive.action = { name: 'cta_url', parameters: { display_text: displayText, url } };
 return this.sendInteractive(phoneNumberId, to, interactive);
 }
 // Konum isteği (v2.22.0): yalnız body (≤1024). Yanıt message.received type:'location' (context.message_id = bu mesaj) olarak gelir.
 requestLocation(phoneNumberId, to, bodyText) {
 return this.sendInteractive(phoneNumberId, to, { type: 'location_request_message', body: { text: bodyText }, action: { name: 'send_location' } });
 }
 _interactiveBase(type, bodyText, options) {
 const i = { type, body: { text: bodyText } };
 if (options.header) i.header = typeof options.header === 'string' ? { type: 'text', text: options.header } : options.header;
 if (options.footer) i.footer = { text: options.footer };
 return i;
 }
 _flowPath(flowId, suffix, phoneNumberId) {
 return '/flows/' + encodeURIComponent(flowId) + suffix + (phoneNumberId ? '?phone_number_id=' + encodeURIComponent(phoneNumberId) : '');
 }

 _get(path) { return this._request('GET', path); }
 _post(path, body) { return this._request('POST', path, body); }
 _patch(path, body) { return this._request('PATCH', path, body); }
 _put(path, body) { return this._request('PUT', path, body); }
 _delete(path) { return this._request('DELETE', path); }

 async _request(method, path, body = null) {
 const url = this.baseUrl + path;
 const idempotencyKey = crypto.randomUUID();
 let lastError = null;

 for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
 const headers = {
 'Authorization': 'Bearer ' + this.apiKey,
 'Content-Type': 'application/json',
 'Accept': 'application/json',
 'User-Agent': 'VeriMerkezi-NodeJS-SDK/' + VERSION,
 };
 if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
 headers['Idempotency-Key'] = idempotencyKey;
 }

 try {
 const controller = new AbortController();
 const t = setTimeout(() => controller.abort(), this.timeout);
 const resp = await fetch(url, {
 method,
 headers,
 body: body !== null ? JSON.stringify(body) : undefined,
 signal: controller.signal,
 });
 clearTimeout(t);
 // Yanıt gövdesi boş veya JSON olmayabilir (502/204) — önce metni oku,
 // sonra güvenli şekilde parse et. Böylece 5xx/429 retry dalları bozulmaz.
 const text = await resp.text();
 let data;
 try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

 // 429 / 503 -> Retry-After başlığı ya da gövdedeki retry_after (2.27.0: 503 temporarily_unavailable)
 if ((resp.status === 429 || resp.status === 503) && attempt < this.maxRetries) {
 const retryAfter = parseInt(resp.headers.get('Retry-After') || '', 10) || data?.error?.retry_after || 5;
 await new Promise(r => setTimeout(r, Math.min(30000, retryAfter * 1000)));
 continue;
 }
 // diğer 5xx -> retry
 if (resp.status >= 500 && attempt < this.maxRetries) {
 await new Promise(r => setTimeout(r, attempt * 1000));
 continue;
 }
 // 429 -> Retry-After header veya gövdedeki retry_after
 if (resp.status === 429 && attempt < this.maxRetries) {
 const retryAfter = parseInt(resp.headers.get('Retry-After') || '', 10) || data?.error?.retry_after || 5;
 await new Promise(r => setTimeout(r, Math.min(30000, retryAfter * 1000)));
 continue;
 }

 if (resp.status >= 400) {
 const err = data.error || {};
 throw new VeriMerkeziException(
 err.message || 'API hatası',
 resp.status,
 err.code || null,
 err
 );
 }
 return data;
 } catch (err) {
 if (err instanceof VeriMerkeziException) throw err;
 lastError = err;
 if (attempt < this.maxRetries) {
 await new Promise(r => setTimeout(r, attempt * 500));
 continue;
 }
 throw new VeriMerkeziException('Bağlantı hatası: ' + err.message, 0);
 }
 }
 throw new VeriMerkeziException('Max retry aşıldı', 0);
 }

 /**
 * Webhook signature doğrulama (müşteri tarafında).
 */
 static verifyWebhookSignature(secret, body, signature, timestamp, toleranceSec = 300) {
 const ts = parseInt(timestamp, 10);
 if (!ts || Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false;
 const expected = 'sha256=' + crypto.createHmac('sha256', secret)
 .update(ts + '.' + body)
 .digest('hex');
 try {
 return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
 } catch {
 return false;
 }
 }
}

VeriMerkeziClient.VERSION = VERSION;

module.exports = { VeriMerkeziClient, VeriMerkeziException, VERSION };
