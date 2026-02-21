import { Command } from 'commander';

const program = new Command();

program
  .name('wpdeploy')
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
  .action(async (options) => {
    const { deployCommand } = await import('./commands/deploy.js');
    await deployCommand(options);
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

export async function run() {
  await program.parseAsync(process.argv);
}
