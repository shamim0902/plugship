import { join } from 'node:path';
import { readFile, writeFile, access } from 'node:fs/promises';
import * as logger from '../lib/logger.js';

const IGNORE_FILE = '.plugshipignore';

const DEFAULT_TEMPLATE = `# .plugshipignore
# Add patterns here to exclude files from the deployment ZIP.
# One pattern per line. Supports dir/**, *.ext, and exact names.
#
# The following are always excluded by default (no need to list them):
#   node_modules, .git, .github, .DS_Store, .env, *.log,
#   .vscode, .idea, tests, phpunit.xml, builds

# Source files (uncomment as needed)
# src/**
# *.map

# Build tools
package.json
package-lock.json
composer.lock
webpack.config.js
`;

export async function ignoreCommand(patterns) {
  const filePath = join(process.cwd(), IGNORE_FILE);

  // No patterns provided — create template file
  if (patterns.length === 0) {
    try {
      await access(filePath);
      logger.info(`${IGNORE_FILE} already exists.`);
    } catch {
      await writeFile(filePath, DEFAULT_TEMPLATE);
      logger.success(`Created ${IGNORE_FILE} with default template.`);
    }
    return;
  }

  // Append patterns to existing file or create new one
  let existing = '';
  try {
    existing = await readFile(filePath, 'utf-8');
  } catch {
    // File doesn't exist yet
  }

  const existingPatterns = new Set(
    existing.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  );

  const newPatterns = patterns.filter((p) => !existingPatterns.has(p));

  if (newPatterns.length === 0) {
    logger.info('All patterns already in .plugshipignore.');
    return;
  }

  const content = existing
    ? existing.trimEnd() + '\n' + newPatterns.join('\n') + '\n'
    : newPatterns.join('\n') + '\n';

  await writeFile(filePath, content);

  for (const p of newPatterns) {
    logger.success(`Added: ${p}`);
  }
}
