import { select } from '@inquirer/prompts';
import { getSite, listSites } from '../lib/config.js';
import { WordPressApi } from '../lib/wordpress-api.js';
import { RECEIVER_DOWNLOAD_URL } from '../lib/constants.js';
import * as logger from '../lib/logger.js';

export async function statusCommand(options) {
  let site;
  try {
    if (options.site) {
      site = await getSite(options.site);
    } else {
      const { sites, defaultSite } = await listSites();
      const names = Object.keys(sites);

      if (names.length === 0) {
        logger.error('No sites configured. Run "plugship init" first.');
        process.exitCode = 1;
        return;
      }

      if (names.length === 1) {
        site = { name: names[0], ...sites[names[0]] };
      } else {
        const chosen = await select({
          message: 'Which site do you want to check?',
          choices: names.map((n) => ({
            name: n === defaultSite ? `${n} (default)` : n,
            value: n,
          })),
          default: defaultSite,
        });
        site = { name: chosen, ...sites[chosen] };
      }
    }
  } catch (err) {
    logger.error(err.message);
    process.exitCode = 1;
    return;
  }

  const api = new WordPressApi(site);
  console.log(`\nChecking ${site.name} (${site.url})...\n`);

  // Connection
  const spin = logger.spinner('Testing REST API connection...');
  spin.start();
  try {
    await api.testConnection();
    spin.succeed('REST API is accessible');
  } catch {
    spin.fail('Cannot reach REST API');
    process.exitCode = 1;
    return;
  }

  // Auth
  spin.start('Verifying credentials...');
  try {
    const user = await api.testAuth();
    const caps = user.capabilities || {};
    if (!caps.install_plugins) {
      spin.fail(`Authenticated as "${user.name}" but missing install_plugins capability`);
      process.exitCode = 1;
      return;
    }
    spin.succeed(`Authenticated as "${user.name}"`);
  } catch {
    spin.fail('Authentication failed');
    process.exitCode = 1;
    return;
  }

  // Receiver
  spin.start('Checking receiver plugin...');
  try {
    const status = await api.checkReceiver();
    spin.succeed(`Receiver plugin active (v${status.version})`);
  } catch {
    spin.fail('Receiver plugin not found');
    logger.info(`Download: ${RECEIVER_DOWNLOAD_URL}`);
    process.exitCode = 1;
    return;
  }

  console.log('');
  logger.success('All checks passed. Ready to deploy.');
  console.log('');
}
