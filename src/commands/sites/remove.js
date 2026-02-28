import { confirm, select } from '@inquirer/prompts';
import { listSites, removeSite } from '../../lib/config.js';
import * as logger from '../../lib/logger.js';

export async function removeSiteCommand(name) {
  let siteName = name;

  if (!siteName) {
    const { sites, defaultSite } = await listSites();
    const names = Object.keys(sites);

    if (names.length === 0) {
      logger.info('No sites configured. Run "plugship init" to add one.');
      return;
    }

    siteName = await select({
      message: 'Select a site to remove:',
      choices: [
        ...names.map((currentName) => {
          const site = sites[currentName];
          const defaultLabel = currentName === defaultSite ? ' (default)' : '';

          return {
            name: `${currentName}${defaultLabel} - ${site.url}`,
            value: currentName,
          };
        }),
        {
          name: 'Cancel',
          value: null,
        },
      ],
    });
  }

  if (!siteName) {
    logger.info('Cancelled.');
    return;
  }

  const confirmed = await confirm({
    message: `Remove site "${siteName}"?`,
    default: false,
  });

  if (!confirmed) {
    logger.info('Cancelled.');
    return;
  }

  try {
    await removeSite(siteName);
    logger.success(`Site "${siteName}" removed.`);
  } catch (err) {
    logger.error(err.message);
    process.exitCode = 1;
  }
}
