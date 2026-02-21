import { Command } from 'commander';

const program = new Command();

program
  .name('plugship')
  .description('Deploy local WordPress plugins to remote sites')
  .version('1.0.0');

program
  .command('init')
  .description('Configure a WordPress site for deployment')
  .action(async () => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand();
  });

program
  .command('deploy')
  .description('Deploy the plugin from the current directory')
  .option('--site <name>', 'Target site alias')
  .option('--no-activate', 'Skip plugin activation after deploy')
  .option('--dry-run', 'Preview deploy without uploading')
  .option('--all', 'Deploy to all configured sites')
  .action(async (options) => {
    const { deployCommand } = await import('./commands/deploy.js');
    await deployCommand(options);
  });

program
  .command('status')
  .description('Check connection and receiver status for a site')
  .option('--site <name>', 'Target site alias')
  .action(async (options) => {
    const { statusCommand } = await import('./commands/status.js');
    await statusCommand(options);
  });

program
  .command('ignore [patterns...]')
  .description('Create .plugshipignore or add patterns to it')
  .action(async (patterns) => {
    const { ignoreCommand } = await import('./commands/ignore.js');
    await ignoreCommand(patterns);
  });

const sites = program
  .command('sites')
  .description('Manage saved WordPress sites');

sites
  .command('list')
  .description('List all saved sites')
  .action(async () => {
    const { listSitesCommand } = await import('./commands/sites/list.js');
    await listSitesCommand();
  });

sites
  .command('remove <name>')
  .description('Remove a saved site')
  .action(async (name) => {
    const { removeSiteCommand } = await import('./commands/sites/remove.js');
    await removeSiteCommand(name);
  });

sites
  .command('set-default <name>')
  .description('Set the default site')
  .action(async (name) => {
    const { setDefaultCommand } = await import('./commands/sites/set-default.js');
    await setDefaultCommand(name);
  });

export async function run() {
  await program.parseAsync(process.argv);
}
