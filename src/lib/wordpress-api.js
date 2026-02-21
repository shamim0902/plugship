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

    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const msg = typeof body === 'object' && body.message ? body.message : `Upload failed (HTTP ${res.status})`;
      throw new ApiError(msg, res.status, body);
    }

    return body;
  }
}
