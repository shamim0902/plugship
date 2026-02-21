import { resolve, basename } from 'node:path';
import { select } from '@inquirer/prompts';
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

export async function deploy({ siteName, activate = true }) {
  const cwd = process.cwd();

  // 1. Resolve site config
  const site = await resolveSite(siteName);
  const api = new WordPressApi(site);

  // 2. Detect plugin
  const plugin = await detectPlugin(cwd);
  console.log('');
  logger.info(`Plugin:  ${plugin.name}`);
  logger.info(`Version: ${plugin.version}`);
  logger.info(`Slug:    ${plugin.slug}`);
  logger.info(`Site:    ${site.name} (${site.url})`);
  console.log('');

  // 3. Check receiver
  const spin = logger.spinner('Checking receiver plugin...');
  spin.start();
  try {
    await api.checkReceiver();
    spin.succeed('Receiver plugin is active');
  } catch {
    spin.fail('Receiver plugin not found');
    throw new DeployError(
      `The plugship-receiver plugin is not active on the target site. Download and install it first.\n  ${RECEIVER_DOWNLOAD_URL}`
    );
  }

  // 4. Create ZIP
  spin.start('Creating ZIP archive...');
  const { zipPath, size } = await createPluginZip(cwd, plugin.slug);
  const sizeMB = (size / 1024 / 1024).toFixed(2);
  spin.succeed(`ZIP created (${sizeMB} MB)`);

  // 5. Upload
  spin.start('Uploading plugin...');
  let result;
  try {
    result = await api.deployPlugin(zipPath, `${plugin.slug}.zip`);
    spin.succeed('Plugin uploaded and installed');
  } catch (err) {
    spin.fail('Upload failed');
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

  console.log('');
  return result;
}
