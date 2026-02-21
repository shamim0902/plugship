import { input, password } from '@inquirer/prompts';
import chalk from 'chalk';
import { addSite } from '../lib/config.js';
import { WordPressApi } from '../lib/wordpress-api.js';
import * as logger from '../lib/logger.js';

export async function initCommand() {
  console.log(chalk.bold('\nConfigure a WordPress site for deployment\n'));

  const name = await input({
    message: 'Site alias (e.g. "my-site"):',
    validate: (v) => (v.trim() ? true : 'Required'),
  });

  const url = await input({
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

  const username = await input({
    message: 'WordPress username:',
    validate: (v) => (v.trim() ? true : 'Required'),
  });

  const appPassword = await password({
    message: 'Application password:',
    mask: '*',
    validate: (v) => (v.trim() ? true : 'Required'),
  });

  const siteUrl = url.replace(/\/+$/, '');
  const api = new WordPressApi({ url: siteUrl, username, appPassword });

  // Test connection
  const spin = logger.spinner('Testing connection to WordPress REST API...');
  spin.start();

  try {
    await api.testConnection();
    spin.succeed('REST API is accessible');
  } catch (err) {
    spin.fail('Cannot reach WordPress REST API');
    logger.error(`Make sure ${siteUrl}/wp-json/ is accessible.\n  ${err.message}`);
    process.exitCode = 1;
    return;
  }

  // Test authentication
  spin.start('Verifying credentials...');
  try {
    const user = await api.testAuth();
    const caps = user.capabilities || {};
    if (!caps.install_plugins) {
      spin.fail('User does not have the "install_plugins" capability');
      logger.error('The user must be an Administrator to deploy plugins.');
      process.exitCode = 1;
      return;
    }
    spin.succeed(`Authenticated as "${user.name}"`);
  } catch (err) {
    spin.fail('Authentication failed');
    logger.error(`Check your username and application password.\n  ${err.message}`);
    process.exitCode = 1;
    return;
  }

  // Check receiver plugin
  spin.start('Checking for wpdeploy-receiver plugin...');
  try {
    const status = await api.checkReceiver();
    spin.succeed(`Receiver plugin active (v${status.version})`);
  } catch {
    spin.warn('Receiver plugin not detected');
    console.log('');
    logger.warn(
      'The wpdeploy-receiver plugin must be installed and activated on your WordPress site.'
    );
    console.log(
      chalk.dim(
        '  1. Copy receiver-plugin/wpdeploy-receiver.php to your site\'s wp-content/plugins/ directory\n' +
        '  2. Activate "WPDeploy Receiver" in the WordPress admin\n' +
        '  3. Run "wpdeploy init" again to verify\n'
      )
    );
  }

  // Save config
  await addSite(name.trim(), {
    url: siteUrl,
    username: username.trim(),
    appPassword,
  });

  logger.success(`Site "${name.trim()}" saved and set as default.\n`);
}
