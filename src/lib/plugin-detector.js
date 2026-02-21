import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { PLUGIN_HEADER_FIELDS } from './constants.js';
import { PluginDetectionError } from './errors.js';

export async function detectPlugin(directory) {
  const entries = await readdir(directory);
  const phpFiles = entries.filter((f) => f.endsWith('.php'));

  if (phpFiles.length === 0) {
    throw new PluginDetectionError('No PHP files found in current directory. Are you in a WordPress plugin directory?');
  }

  for (const file of phpFiles) {
    const filePath = join(directory, file);
    const content = await readFile(filePath, 'utf-8');
    const headers = parseHeaders(content);

    if (headers.name) {
      const slug = deriveSlug(headers.textDomain, headers.name);
      return {
        name: headers.name,
        version: headers.version || '0.0.0',
        slug,
        textDomain: headers.textDomain || slug,
        description: headers.description || '',
        directory: basename(directory),
        mainFile: file,
        headers,
      };
    }
  }

  throw new PluginDetectionError(
    'No WordPress plugin header found. Ensure a PHP file contains a "Plugin Name:" header comment.'
  );
}

function parseHeaders(content) {
  const headerBlock = content.match(/\/\*\*?[\s\S]*?\*\//);
  if (!headerBlock) return {};

  const block = headerBlock[0];
  const result = {};

  for (const [field, key] of Object.entries(PLUGIN_HEADER_FIELDS)) {
    const regex = new RegExp(`^\\s*\\*?\\s*${escapeRegex(field)}:\\s*(.+)$`, 'mi');
    const match = block.match(regex);
    if (match) {
      result[key] = match[1].trim();
    }
  }

  return result;
}

function deriveSlug(textDomain, name) {
  if (textDomain) return textDomain;
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
