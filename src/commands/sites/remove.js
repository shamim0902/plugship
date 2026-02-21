import { confirm } from '@inquirer/prompts';
import { removeSite } from '../../lib/config.js';
import * as logger from '../../lib/logger.js';

export async function removeSiteCommand(name) {
  const confirmed = await confirm({
    message: `Remove site "${name}"?`,
    default: false,
  });

  if (!confirmed) {
    logger.info('Cancelled.');
    return;
  }

  try {
    await removeSite(name);
    logger.success(`Site "${name}" removed.`);
  } catch (err) {
    logger.error(err.message);
    process.exitCode = 1;
  }
}
