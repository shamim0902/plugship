import { deploy } from '../lib/deployer.js';
import * as logger from '../lib/logger.js';

export async function deployCommand(options) {
  try {
    await deploy({
      siteName: options.site,
      activate: options.activate,
      dryRun: options.dryRun,
      all: options.all,
    });
  } catch (err) {
    logger.error(err.message);
    process.exitCode = 1;
  }
}
