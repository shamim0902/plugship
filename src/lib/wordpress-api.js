import FormData from 'form-data';
import { readFile } from 'node:fs/promises';
import { ApiError } from './errors.js';

export class WordPressApi {
  constructor({ url, username, appPassword }) {
    this.baseUrl = url.replace(/\/+$/, '');
    this.auth = 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}/wp-json${path}`;
    const headers = { ...options.headers };

    if (options.auth !== false) {
      headers['Authorization'] = this.auth;
    }

    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const msg = typeof body === 'object' && body.message ? body.message : `HTTP ${res.status}`;
      throw new ApiError(msg, res.status, body);
    }

    return body;
  }

  async testConnection() {
    return this.request('/', { auth: false });
  }

  async testAuth() {
    return this.request('/wp/v2/users/me?context=edit');
  }

  async getPlugins() {
    return this.request('/wp/v2/plugins');
  }

  async getPlugin(slug) {
    return this.request(`/wp/v2/plugins/${slug}`);
  }

  async activatePlugin(plugin) {
    return this.request(`/wp/v2/plugins/${plugin}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
  }

  async deactivatePlugin(plugin) {
    return this.request(`/wp/v2/plugins/${plugin}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'inactive' }),
    });
  }

  async deletePlugin(plugin) {
    return this.request(`/wp/v2/plugins/${plugin}`, {
      method: 'DELETE',
    });
  }

  async checkReceiver() {
    return this.request('/plugship/v1/status');
  }

  async deployPlugin(zipPath, filename) {
    const fileBuffer = await readFile(zipPath);
    const form = new FormData();
    form.append('plugin', fileBuffer, {
      filename,
      contentType: 'application/zip',
    });

    const url = `${this.baseUrl}/wp-json/plugship/v1/deploy`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.auth,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    const rawBody = await res.text();

    // Try to extract JSON from response (may have HTML errors prepended)
    const body = this._extractJson(rawBody);

    if (body) {
      if (!res.ok && body.message) {
        throw new ApiError(body.message, res.status, body);
      }
      return body;
    }

    // No valid JSON found — response is pure HTML/error
    // Extract readable error from HTML
    const warnings = this._extractHtmlErrors(rawBody);
    throw new ApiError(
      'non_json_response',
      res.status,
      { rawWarnings: warnings }
    );
  }

  _extractJson(text) {
    // Try direct parse first
    try {
      return JSON.parse(text);
    } catch {
      // JSON might be buried after HTML errors — find it
      const jsonStart = text.indexOf('{"');
      if (jsonStart > 0) {
        try {
          return JSON.parse(text.slice(jsonStart));
        } catch {
          // ignore
        }
      }
      return null;
    }
  }

  _extractHtmlErrors(html) {
    const errors = [];
    const regex = /<b>(Warning|Fatal error|Parse error|Notice)<\/b>:\s*(.*?)<br/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      errors.push(match[1] + ': ' + match[2].replace(/<[^>]+>/g, '').trim());
    }
    return errors.length > 0 ? errors : ['Server returned non-JSON response'];
  }
}
