import { join } from 'node:path';
import { access } from 'node:fs/promises';
import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { getSite, listSites } from './config.js';
import { detectPlugin } from './plugin-detector.js';
import { createPluginZip } from './zipper.js';
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
  try {
    await access(join(cwd, '.plugshipignore'));
  } catch {
    logger.warn('No .plugshipignore file found.');
    const create = await confirm({
      message: 'Create one with default template?',
      default: true,
    });
    if (create) {
      const { ignoreCommand } = await import('../commands/ignore.js');
      await ignoreCommand([]);
    }
  }
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

  // Build ZIP once (shared across all targets)
  const spin = logger.spinner('Creating ZIP archive...');
  spin.start();
  const { zipPath, size } = await createPluginZip(cwd, plugin.slug);
  const sizeMB = (size / 1024 / 1024).toFixed(2);
  spin.succeed(`ZIP created (${sizeMB} MB)`);

  // Dry run — show summary and exit
  if (dryRun) {
    const targets = all ? await getAllSites() : [await resolveSite(siteName)];
    console.log(chalk.bold('\n--- Dry Run ---\n'));
    logger.info(`Plugin:  ${plugin.name}`);
    logger.info(`Version: ${plugin.version}`);
    logger.info(`Slug:    ${plugin.slug}`);
    logger.info(`ZIP:     ${zipPath} (${sizeMB} MB)`);
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
    try {
      result = await api.deployPlugin(zipPath, `${plugin.slug}.zip`);
      s.succeed('Plugin uploaded and installed');
    } catch (err) {
      s.fail('Upload failed');
      if (targets.length > 1) {
        logger.error(`Deploy to ${site.name} failed: ${err.message}`);
        continue;
      }
      throw new DeployError(`Deploy failed: ${err.message}`);
    }

    if (result.activated) {
      logger.success(`Plugin "${result.name || plugin.name}" v${result.version || plugin.version} is active on ${site.url}`);
    } else {
      logger.success(`Plugin "${result.name || plugin.name}" v${result.version || plugin.version} installed on ${site.url}`);
      if (activate && !result.activated) {
        logger.info('Plugin was not activated (may already be active or activation was skipped).');
      }
    }
  }

  console.log('');
}
