import { select } from '@inquirer/prompts';
import { listSites, setDefaultSite } from '../../lib/config.js';
import * as logger from '../../lib/logger.js';

export async function setDefaultCommand(name) {
  let siteName = name;

  if (!siteName) {
    const { sites, defaultSite } = await listSites();
    const names = Object.keys(sites);

    if (names.length === 0) {
      logger.info('No sites configured. Run "plugship init" to add one.');
      return;
    }

    siteName = await select({
      message: 'Select the default site:',
      choices: [
        ...names.map((currentName) => {
          const site = sites[currentName];
          const defaultLabel = currentName === defaultSite ? ' (current default)' : '';

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

  try {
    await setDefaultSite(siteName);
    logger.success(`Default site set to "${siteName}".`);
  } catch (err) {
    logger.error(err.message);
    process.exitCode = 1;
  }
}
