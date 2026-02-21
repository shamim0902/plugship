import { setDefaultSite } from '../../lib/config.js';
import * as logger from '../../lib/logger.js';

export async function setDefaultCommand(name) {
  try {
    await setDefaultSite(name);
    logger.success(`Default site set to "${name}".`);
  } catch (err) {
    logger.error(err.message);
    process.exitCode = 1;
  }
}
