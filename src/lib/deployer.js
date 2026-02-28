import { join, dirname, relative } from 'node:path';
import { access, readFile, stat, writeFile } from 'node:fs/promises';
import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { getSite, listSites } from './config.js';
import { detectPlugin } from './plugin-detector.js';
import { createPluginZip, getIgnoreSource } from './zipper.js';
import { WordPressApi } from './wordpress-api.js';
import { DeployError, ConfigError } from './errors.js';
import { RECEIVER_DOWNLOAD_URL } from './constants.js';
import * as logger from './logger.js';

async function resolveSite(siteName) {
  if (siteName) return getSite(siteName);

  const { sites, defaultSite } = await listSites();
  const names = Object.keys(sites);

  if (names.length === 0) {
    throw new ConfigError('No sites configured. Run "plugship init" first.');
  }

  if (names.length === 1) {
    return { name: names[0], ...sites[names[0]] };
  }

  const chosen = await select({
    message: 'Which site do you want to deploy to?',
    choices: names.map((name) => ({
      name: name === defaultSite ? `${name} (default)` : name,
      value: name,
    })),
    default: defaultSite,
  });

  return { name: chosen, ...sites[chosen] };
}

async function getAllSites() {
  const { sites } = await listSites();
  const names = Object.keys(sites);

  if (names.length === 0) {
    throw new ConfigError('No sites configured. Run "plugship init" first.');
  }

  return names.map((name) => ({ name, ...sites[name] }));
}

async function checkIgnoreFile(cwd) {
  const source = await getIgnoreSource(cwd);
  if (source) {
    logger.info(`Using ${source} for file exclusions`);
    return;
  }
  logger.warn('No .plugshipignore or .distignore file found.');
  const create = await confirm({
    message: 'Create .plugshipignore with default template?',
    default: true,
  });
  if (create) {
    const { ignoreCommand } = await import('../commands/ignore.js');
    await ignoreCommand([]);
  }
}

async function findGitRepoRoot(startDir) {
  let current = startDir;

  while (true) {
    try {
      await access(join(current, '.git'));
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }
}

function normalizePattern(pattern) {
  const trimmed = pattern.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
    return null;
  }

  let normalized = trimmed.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  if (normalized.endsWith('/**')) {
    normalized = normalized.slice(0, -3);
  }
  return normalized || null;
}

function hasIgnoreRule(content, targetPath) {
  return content.split('\n').some((line) => normalizePattern(line) === targetPath);
}

async function directoryExists(path) {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch {
    return false;
  }
}

async function ensureBuildDirIgnored(cwd) {
  const repoRoot = await findGitRepoRoot(cwd);
  if (!repoRoot) return;

  const gitignorePath = join(repoRoot, '.gitignore');
  let content = '';
  try {
    content = await readFile(gitignorePath, 'utf-8');
  } catch {
    // .gitignore does not exist yet; create it when first entry is added.
  }

  for (const dirName of ['build', 'builds']) {
    const dirPath = join(cwd, dirName);
    if (!(await directoryExists(dirPath))) continue;

    const targetPath = relative(repoRoot, dirPath).replace(/\\/g, '/').replace(/\/+$/, '');
    if (!targetPath || targetPath.startsWith('..')) continue;
    if (hasIgnoreRule(content, targetPath)) continue;

    const ignoreEntry = `/${targetPath}/`;
    content = content
      ? `${content.trimEnd()}\n${ignoreEntry}\n`
      : `${ignoreEntry}\n`;

    await writeFile(gitignorePath, content);
    logger.success(`Added "${ignoreEntry}" to .gitignore.`);
  }
}

async function buildZip(cwd, slug) {
  const spin = logger.spinner('Creating ZIP archive...');
  spin.start();
  const result = await createPluginZip(cwd, slug);
  spin.succeed(`ZIP created (${(result.size / 1024 / 1024).toFixed(2)} MB)`);
  return result;
}

function printPluginInfo(plugin, site) {
  console.log('');
  logger.info(`Plugin:  ${plugin.name}`);
  logger.info(`Version: ${plugin.version}`);
  logger.info(`Slug:    ${plugin.slug}`);
  if (site) {
    logger.info(`Site:    ${site.name} (${site.url})`);
  }
  console.log('');
}

export async function deploy({ siteName, activate = true, dryRun = false, all = false }) {
  const cwd = process.cwd();

  // Check for .plugshipignore
  await checkIgnoreFile(cwd);

  // Detect plugin
  const plugin = await detectPlugin(cwd);

  // Check for existing ZIP
  const existingZipPath = join(cwd, 'builds', `${plugin.slug}.zip`);
  let zipPath, size;

  try {
    const zipStat = await stat(existingZipPath);
    const sizeMB = (zipStat.size / 1024 / 1024).toFixed(2);

    // Check if ignore file was modified after the ZIP was built
    let ignoreStale = false;
    for (const ignoreFile of ['.plugshipignore', '.distignore']) {
      try {
        const ignoreStat = await stat(join(cwd, ignoreFile));
        if (ignoreStat.mtimeMs > zipStat.mtimeMs) {
          ignoreStale = true;
        }
        break;
      } catch {
        // file not found, try next
      }
    }

    if (ignoreStale) {
      logger.warn('Ignore file changed since last build — rebuilding ZIP...');
      ({ zipPath, size } = await buildZip(cwd, plugin.slug));
    } else {
      logger.info(`Existing ZIP found: builds/${plugin.slug}.zip (${sizeMB} MB)`);
      const action = await select({
        message: 'What do you want to do?',
        choices: [
          { name: 'Use existing ZIP', value: 'existing' },
          { name: 'Build a new ZIP', value: 'rebuild' },
        ],
      });
      if (action === 'rebuild') {
        ({ zipPath, size } = await buildZip(cwd, plugin.slug));
      } else {
        zipPath = existingZipPath;
        size = zipStat.size;
        logger.success(`Using existing ZIP (${sizeMB} MB)`);
      }
    }
  } catch {
    ({ zipPath, size } = await buildZip(cwd, plugin.slug));
  }

  const zipSizeMB = (size / 1024 / 1024).toFixed(2);

  // Dry run — show summary and exit
  if (dryRun) {
    const targets = all ? await getAllSites() : [await resolveSite(siteName)];
    console.log(chalk.bold('\n--- Dry Run ---\n'));
    logger.info(`Plugin:  ${plugin.name}`);
    logger.info(`Version: ${plugin.version}`);
    logger.info(`Slug:    ${plugin.slug}`);
    logger.info(`ZIP:     ${zipPath} (${zipSizeMB} MB)`);
    logger.info(`Activate: ${activate ? 'yes' : 'no'}`);
    console.log('');
    logger.info('Target sites:');
    for (const s of targets) {
      console.log(`  - ${s.name} (${s.url})`);
    }
    console.log(chalk.dim('\nNo changes were made. Remove --dry-run to deploy.\n'));
    return;
  }

  // Resolve targets
  const targets = all ? await getAllSites() : [await resolveSite(siteName)];

  for (const site of targets) {
    if (targets.length > 1) {
      console.log(chalk.bold(`\n--- Deploying to ${site.name} ---`));
    }

    printPluginInfo(plugin, site);

    const api = new WordPressApi(site);

    // Check receiver
    const s = logger.spinner('Checking receiver plugin...');
    s.start();
    try {
      await api.checkReceiver();
      s.succeed('Receiver plugin is active');
    } catch {
      s.fail('Receiver plugin not found');
      logger.error(
        `The plugship-receiver plugin is not active on ${site.name}. Download and install it first.\n  ${RECEIVER_DOWNLOAD_URL}`
      );
      if (targets.length > 1) continue;
      throw new DeployError('Receiver plugin not found.');
    }

    // Upload
    s.start('Uploading plugin...');
    let result;
    let uploadWarnings = null;
    try {
      result = await api.deployPlugin(zipPath, `${plugin.slug}.zip`);
    } catch (err) {
      // Non-JSON response — plugin might still have installed
      if (err.body && err.body.rawWarnings) {
        s.succeed('Plugin uploaded');
        uploadWarnings = err.body.rawWarnings;
      } else {
        s.fail('Upload failed');
        if (targets.length > 1) {
          logger.error(`Deploy to ${site.name} failed: ${err.message}`);
          continue;
        }
        throw new DeployError(`Upload failed: ${err.message}`);
      }
    }

    // If we got warnings instead of clean JSON, verify installation via WP API
    if (uploadWarnings) {
      s.start('Verifying installation...');
      try {
        const pluginInfo = await api.getPlugin(`${plugin.slug}/${plugin.slug}`);
        s.succeed('Plugin installed successfully');
        result = {
          success: true,
          name: pluginInfo.name || plugin.name,
          version: pluginInfo.version || plugin.version,
          activated: pluginInfo.status === 'active',
        };
        for (const w of uploadWarnings) {
          logger.warn(w);
        }
      } catch {
        // Try alternative slug format (slug/main-file)
        try {
          const plugins = await api.getPlugins();
          const found = plugins.find((p) => p.textdomain === plugin.slug || p.plugin.startsWith(plugin.slug + '/'));
          if (found) {
            s.succeed('Plugin installed successfully');
            result = {
              success: true,
              name: found.name || plugin.name,
              version: found.version || plugin.version,
              activated: found.status === 'active',
            };
            for (const w of uploadWarnings) {
              logger.warn(w);
            }
          } else {
            s.fail('Installation could not be verified');
            for (const w of uploadWarnings) {
              logger.error(w);
            }
            if (targets.length > 1) continue;
            throw new DeployError('Plugin installation could not be verified.');
          }
        } catch (verifyErr) {
          if (verifyErr instanceof DeployError) throw verifyErr;
          s.fail('Installation could not be verified');
          for (const w of uploadWarnings) {
            logger.error(w);
          }
          if (targets.length > 1) continue;
          throw new DeployError('Plugin installation could not be verified.');
        }
      }
    } else {
      // Clean JSON response
      if (!result.success) {
        s.fail('Installation failed');
        logger.error('Plugin uploaded but installation failed.');
        if (targets.length > 1) continue;
        throw new DeployError('Installation failed on remote server.');
      }
      s.succeed('Plugin uploaded and installed');
    }

    // Show warnings if any
    if (result.warnings) {
      logger.warn(`Warning: ${result.warnings}`);
    }

    // Activation status
    if (result.activated) {
      logger.success(`Plugin "${result.name || plugin.name}" v${result.version || plugin.version} is active on ${site.url}`);
    } else {
      logger.success(`Plugin "${result.name || plugin.name}" v${result.version || plugin.version} installed on ${site.url}`);
      if (activate && result.activation_error) {
        logger.error(`Activation failed: ${result.activation_error}`);
      } else if (activate) {
        logger.warn('Plugin installed but not activated. It may have errors — check WordPress admin.');
      }
    }
  }

  await ensureBuildDirIgnored(cwd);
  console.log('');
}
