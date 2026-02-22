import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { stat, mkdir, readFile } from 'node:fs/promises';
import archiver from 'archiver';
import { DEFAULT_EXCLUDES } from './constants.js';

async function loadIgnoreFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const patterns = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      patterns.push(trimmed);
    }
  }
  return patterns;
}

export async function getIgnoreSource(sourceDir) {
  try {
    await readFile(join(sourceDir, '.plugshipignore'), 'utf-8');
    return '.plugshipignore';
  } catch {
    try {
      await readFile(join(sourceDir, '.distignore'), 'utf-8');
      return '.distignore';
    } catch {
      return null;
    }
  }
}

async function loadIgnorePatterns(sourceDir) {
  const patterns = [...DEFAULT_EXCLUDES];

  // .plugshipignore takes priority, then .distignore
  for (const file of ['.plugshipignore', '.distignore']) {
    try {
      const extra = await loadIgnoreFile(join(sourceDir, file));
      patterns.push(...extra);
      return patterns;
    } catch {
      // file not found, try next
    }
  }

  return patterns;
}

export async function createPluginZip(sourceDir, slug) {
  const buildDir = join(sourceDir, 'builds');
  await mkdir(buildDir, { recursive: true });
  const zipName = `${slug}.zip`;
  const zipPath = join(buildDir, zipName);
  const excludes = await loadIgnorePatterns(sourceDir);

  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, slug, (entry) => {
      for (const pattern of excludes) {
        if (matchGlob(entry.name, pattern)) return false;
      }
      return entry;
    });
    archive.finalize();
  });

  const zipStat = await stat(zipPath);
  return { zipPath, size: zipStat.size };
}

function matchGlob(filePath, pattern) {
  // Strip trailing /**, /* or / for directory matching
  if (pattern.endsWith('/**') || pattern.endsWith('/*') || pattern.endsWith('/')) {
    const dir = pattern.replace(/\/\*{0,2}$/, '');
    return filePath === dir || filePath.startsWith(dir + '/');
  }
  // **/*.ext — match extension at any depth
  if (pattern.startsWith('**/')) {
    const sub = pattern.slice(3);
    return matchGlob(filePath, sub) || filePath.split('/').some((seg) => matchGlob(seg, sub));
  }
  // Exact match or wildcard prefix
  if (pattern.startsWith('*.')) {
    return filePath.endsWith(pattern.slice(1));
  }
  // Dotfile pattern — match root-level files/dirs starting with .
  if (pattern === '.*') {
    const firstSegment = filePath.split('/')[0];
    return firstSegment.startsWith('.');
  }
  // Exact match (file or directory name)
  // "resources" matches "resources", "resources/file.js", "resources/sub/file.js"
  if (filePath === pattern || filePath.startsWith(pattern + '/')) {
    return true;
  }
  return false;
}
