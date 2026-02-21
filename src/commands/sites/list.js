import chalk from 'chalk';
import { listSites } from '../../lib/config.js';
import * as logger from '../../lib/logger.js';

export async function listSitesCommand() {
  const { sites, defaultSite } = await listSites();
  const names = Object.keys(sites);

  if (names.length === 0) {
    logger.info('No sites configured. Run "plugship init" to add one.');
    return;
  }

  console.log(chalk.bold('\nSaved sites:\n'));
  for (const name of names) {
    const site = sites[name];
    const isDefault = name === defaultSite;
    const label = isDefault ? chalk.green(`${name} (default)`) : name;
    console.log(`  ${label}`);
    console.log(`    URL:  ${site.url}`);
    console.log(`    User: ${site.username}\n`);
  }
}
