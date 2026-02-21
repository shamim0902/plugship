import { deploy } from '../lib/deployer.js';
import * as logger from '../lib/logger.js';

export async function deployCommand(options) {
  try {
    await deploy({
      siteName: options.site,
      activate: options.activate,
    });
  } catch (err) {
    logger.error(err.message);
    process.exitCode = 1;
  }
}
