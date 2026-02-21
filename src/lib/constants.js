import { homedir } from 'node:os';
import { join } from 'node:path';

export const CONFIG_DIR = join(homedir(), '.plugship');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
export const CONFIG_PERMISSIONS = 0o600;
export const RECEIVER_DOWNLOAD_URL = 'https://github.com/shamim0902/plugship-receiver/releases/latest/download/plugship-receiver.zip';

export const PLUGIN_HEADER_FIELDS = {
  'Plugin Name': 'name',
  'Plugin URI': 'pluginUri',
  'Description': 'description',
  'Version': 'version',
  'Author': 'author',
  'Author URI': 'authorUri',
  'Text Domain': 'textDomain',
  'Domain Path': 'domainPath',
  'Requires at least': 'requiresWp',
  'Requires PHP': 'requiresPhp',
  'License': 'license',
  'License URI': 'licenseUri',
};

export const DEFAULT_EXCLUDES = [
  '.*',
  'node_modules/**',
  '*.log',
  'tests/**',
  'phpunit.xml',
  'builds/**',
];
