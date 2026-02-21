import { input, password, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { addSite } from '../lib/config.js';
import { WordPressApi } from '../lib/wordpress-api.js';
import { RECEIVER_DOWNLOAD_URL } from '../lib/constants.js';
import * as logger from '../lib/logger.js';

export async function initCommand() {
  console.log(chalk.bold('\nConfigure a WordPress site for deployment\n'));

  const name = await input({
    message: 'Site alias (e.g. "my-site"):',
    validate: (v) => (v.trim() ? true : 'Required'),
  });

  let siteUrl, username, appPassword, api;
  let connected = false;

  // Loop until connection + auth succeed
  while (!connected) {
    siteUrl = await input({
      message: 'WordPress site URL:',
      validate: (v) => {
        if (!v.trim()) return 'Required';
        try {
          const parsed = new URL(v);
          if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return 'URL must start with https:// or http://';
          }
          return true;
        } catch {
          return 'Invalid URL';
        }
      },
    });

    siteUrl = siteUrl.replace(/\/+$/, '');

    // Test connection
    const spin = logger.spinner('Testing connection to WordPress REST API...');
    spin.start();

    try {
      const tempApi = new WordPressApi({ url: siteUrl, username: '', appPassword: '' });
      await tempApi.testConnection();
      spin.succeed('REST API is accessible');
    } catch (err) {
      spin.stop();
      spin.clear();
      logger.error('Cannot reach WordPress REST API');
      logger.error(`Make sure ${siteUrl}/wp-json/ is accessible.\n  ${err.message}`);
      console.log('');
      const retry = await confirm({ message: 'Try a different URL?', default: true });
      if (!retry) return;
      continue;
    }

    // Loop until auth succeeds or user quits
    let authenticated = false;
    while (!authenticated) {
      username = await input({
        message: 'WordPress username:',
        validate: (v) => (v.trim() ? true : 'Required'),
      });

      appPassword = await password({
        message: 'Application password:',
        mask: '*',
        validate: (v) => (v.trim() ? true : 'Required'),
      });

      api = new WordPressApi({ url: siteUrl, username, appPassword });

      const spin2 = logger.spinner('Verifying credentials...');
      spin2.start();
      try {
        const user = await api.testAuth();
        const caps = user.capabilities || {};
        if (!caps.install_plugins) {
          spin2.stop();
          spin2.clear();
          logger.error('User does not have the "install_plugins" capability');
          logger.error('The user must be an Administrator to deploy plugins.');
          console.log('');
          const retry = await confirm({ message: 'Try different credentials?', default: true });
          if (!retry) return;
          continue;
        }
        spin2.succeed(`Authenticated as "${user.name}"`);
        authenticated = true;
      } catch (err) {
        spin2.stop();
        spin2.clear();
        logger.error(`Authentication failed`);
        logger.error(`Check your username and application password.\n  ${err.message}`);
        console.log('');
        const retry = await confirm({ message: 'Try again?', default: true });
        if (!retry) return;
      }
    }

    connected = true;
  }

  // Check receiver plugin
  let receiverActive = false;
  while (!receiverActive) {
    const spin = logger.spinner('Checking for plugship-receiver plugin...');
    spin.start();
    try {
      const status = await api.checkReceiver();
      spin.succeed(`Receiver plugin active (v${status.version})`);
      receiverActive = true;
    } catch {
      spin.warn('Receiver plugin not detected');
      console.log('');
      logger.warn(
        'The plugship-receiver plugin must be installed and activated on your WordPress site.'
      );
      console.log(
        chalk.dim(
          `  1. Download: ${RECEIVER_DOWNLOAD_URL}\n` +
          '  2. Upload and activate in WordPress admin (Plugins > Add New > Upload Plugin)\n'
        )
      );
      const retry = await confirm({ message: 'Check again?', default: true });
      if (!retry) break;
    }
  }

  // Save config
  await addSite(name.trim(), {
    url: siteUrl,
    username: username.trim(),
    appPassword,
  });

  logger.success(`Site "${name.trim()}" saved and set as default.`);
  console.log(chalk.bold('\nNext steps:\n'));
  console.log(`  Navigate to your plugin directory and run:\n`);
  console.log(chalk.cyan(`    plugship deploy\n`));
  console.log(chalk.dim(`  Other useful commands:`));
  console.log(chalk.dim(`    plugship deploy --dry-run       Preview without uploading`));
  console.log(chalk.dim(`    plugship deploy --site ${name.trim()}   Deploy to this site`));
  console.log(chalk.dim(`    plugship ignore                 Set up file exclusions\n`));
}
