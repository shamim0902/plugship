import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { stat, mkdir } from 'node:fs/promises';
import archiver from 'archiver';
import { DEFAULT_EXCLUDES } from './constants.js';

export async function createPluginZip(sourceDir, slug) {
  const buildDir = join(sourceDir, 'build');
  await mkdir(buildDir, { recursive: true });
  const zipName = `${slug}.zip`;
  const zipPath = join(buildDir, zipName);

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
      for (const pattern of DEFAULT_EXCLUDES) {
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
  // Strip trailing /** for directory matching
  if (pattern.endsWith('/**')) {
    const dir = pattern.slice(0, -3);
    return filePath === dir || filePath.startsWith(dir + '/');
  }
  // Exact match or wildcard prefix
  if (pattern.startsWith('*.')) {
    return filePath.endsWith(pattern.slice(1));
  }
  return filePath === pattern;
}
