import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { CONFIG_DIR, CONFIG_FILE, CONFIG_PERMISSIONS } from './constants.js';
import { ConfigError } from './errors.js';

const EMPTY_CONFIG = { defaultSite: null, sites: {} };

export async function loadConfig() {
  try {
    await access(CONFIG_FILE);
    const data = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

export async function saveConfig(config) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', {
    mode: CONFIG_PERMISSIONS,
  });
}

export async function getSite(name) {
  const config = await loadConfig();
  const siteName = name || config.defaultSite;
  if (!siteName) {
    throw new ConfigError('No site specified and no default site configured. Run "wpdeploy init" first.');
  }
  const site = config.sites[siteName];
  if (!site) {
    throw new ConfigError(`Site "${siteName}" not found. Run "wpdeploy sites list" to see available sites.`);
  }
  return { name: siteName, ...site };
}

export async function addSite(name, siteConfig) {
  const config = await loadConfig();
  config.sites[name] = siteConfig;
  if (!config.defaultSite || Object.keys(config.sites).length === 1) {
    config.defaultSite = name;
  }
  await saveConfig(config);
}

export async function removeSite(name) {
  const config = await loadConfig();
  if (!config.sites[name]) {
    throw new ConfigError(`Site "${name}" not found.`);
  }
  delete config.sites[name];
  if (config.defaultSite === name) {
    const remaining = Object.keys(config.sites);
    config.defaultSite = remaining.length > 0 ? remaining[0] : null;
  }
  await saveConfig(config);
}

export async function setDefaultSite(name) {
  const config = await loadConfig();
  if (!config.sites[name]) {
    throw new ConfigError(`Site "${name}" not found.`);
  }
  config.defaultSite = name;
  await saveConfig(config);
}

export async function listSites() {
  const config = await loadConfig();
  return { sites: config.sites, defaultSite: config.defaultSite };
}
