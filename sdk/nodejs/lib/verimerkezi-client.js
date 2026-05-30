/**
 * VeriMerkezi WhatsApp API — Node.js SDK
 *
 * Kullanım:
 *   const { VeriMerkeziClient } = require('./verimerkezi-client');
 *   const vm = new VeriMerkeziClient('vmk_live_xxxxxxxxxxxxxxxx');
 *   await vm.sendTemplate('1234567890', '905551234567', 'hosgeldin_mesaji', 'tr', [
 *     { type: 'body', parameters: [{ type: 'text', text: 'Ahmet' }] }
 *   ]);
 *
 * v1.0 — 2026-05-27
 * https://verimerkezi.app/panel/api/dokuman
 */

const crypto = require('crypto');

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

  sendText(phoneNumberId, to, text) {
    return this._post('/messages', { phone_number_id: phoneNumberId, to, text });
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

  listTemplates() { return this._get('/templates'); }
  getProfile(phoneNumberId) { return this._get('/profile/' + encodeURIComponent(phoneNumberId)); }
  updateProfile(phoneNumberId, fields) { return this._patch('/profile/' + encodeURIComponent(phoneNumberId), fields); }
  reportsSummary(period = '30d') { return this._get('/reports/summary?period=' + encodeURIComponent(period)); }

  _get(path) { return this._request('GET', path); }
  _post(path, body) { return this._request('POST', path, body); }
  _patch(path, body) { return this._request('PATCH', path, body); }

  async _request(method, path, body = null) {
    const url = this.baseUrl + path;
    const idempotencyKey = crypto.randomUUID();
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const headers = {
        'Authorization': 'Bearer ' + this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'VeriMerkezi-NodeJS-SDK/1.0',
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
        const data = await resp.json();

        // 5xx → retry
        if (resp.status >= 500 && attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, attempt * 1000));
          continue;
        }
        // 429 → respect Retry-After
        if (resp.status === 429 && attempt < this.maxRetries) {
          const retryAfter = parseInt(resp.headers.get('Retry-After') || '5', 10);
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
    if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) return false;
    const expected = 'sha256=' + crypto.createHmac('sha256', secret)
      .update(timestamp + '.' + body)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}

module.exports = { VeriMerkeziClient, VeriMerkeziException };
