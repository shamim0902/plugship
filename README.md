# plugship

A CLI tool to deploy local WordPress plugins to remote WordPress sites.

## Prerequisites

- Node.js 18+
- A WordPress site with REST API enabled
- An Administrator account with an [Application Password](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)

## Installation

```bash
npm install -g plugship
```

## Setup

### 1. Install the Receiver Plugin

The `plugship-receiver` companion plugin must be installed on your WordPress site. It adds a REST endpoint that accepts plugin ZIP uploads.

1. Download [plugship-receiver.zip](https://github.com/shamim0902/plugship-receiver/releases/latest/download/plugship-receiver.zip) or get it from the [repo](https://github.com/shamim0902/plugship-receiver)
2. Go to **Plugins > Add New > Upload Plugin** in WordPress admin
3. Upload the ZIP and activate **PlugShip Receiver**

### 2. Create an Application Password

1. Go to **Users > Profile** in WordPress admin
2. Scroll to **Application Passwords**
3. Enter a name (e.g. "plugship") and click **Add New Application Password**
4. Copy the generated password

### 3. Configure a Site

```bash
plugship init
```

You will be prompted for:

- **Site alias** — a short name for this site (e.g. "staging")
- **Site URL** — your WordPress site URL (e.g. `https://example.com`)
- **Username** — your WordPress admin username
- **Application password** — the password from step 2

The command will verify the connection, credentials, and receiver plugin status.

## Usage

### Deploy a Plugin

Navigate to your WordPress plugin directory and run:

```bash
plugship deploy
```

This will:

1. Detect the plugin from PHP file headers
2. Create a ZIP archive in the `build/` directory
3. Upload and install the plugin on the remote site
4. Activate the plugin

If you have multiple sites configured, you will be prompted to select one.

#### Options

```bash
plugship deploy --site <name>   # Deploy to a specific site
plugship deploy --no-activate   # Deploy without activating the plugin
plugship deploy --dry-run       # Preview what would be deployed without uploading
plugship deploy --all           # Deploy to all configured sites
```

### Check Site Status

Verify connection, credentials, and receiver plugin before deploying:

```bash
plugship status                 # Check default or select a site
plugship status --site <name>   # Check a specific site
```

### Manage Sites

```bash
plugship sites list                 # List all saved sites
plugship sites remove <name>        # Remove a saved site
plugship sites set-default <name>   # Set the default site
```

## Commands

| Command | Description |
| --- | --- |
| `plugship init` | Configure a new WordPress site |
| `plugship deploy` | Deploy the plugin from the current directory |
| `plugship deploy --dry-run` | Preview deploy without uploading |
| `plugship deploy --all` | Deploy to all configured sites |
| `plugship status` | Check site connection and receiver status |
| `plugship sites list` | List all saved sites |
| `plugship sites remove <name>` | Remove a saved site |
| `plugship sites set-default <name>` | Set the default site |
| `plugship ignore` | Create `.plugshipignore` with default template |
| `plugship ignore <patterns...>` | Add patterns to `.plugshipignore` |
| `plugship --help` | Show help |
| `plugship --version` | Show version |

## Plugin Detection

The CLI detects your plugin by scanning `.php` files in the current directory for a standard WordPress plugin header:

```php
<?php
/**
 * Plugin Name: My Plugin
 * Version: 1.0.0
 * Text Domain: my-plugin
 */
```

The `Text Domain` is used as the plugin slug. If not provided, the slug is derived from the plugin name.

## Ignoring Files

Use the `ignore` command to create a `.plugshipignore` file with a default template:

```bash
plugship ignore
```

Or add specific patterns directly:

```bash
plugship ignore "src/**" "*.map" composer.json
```

You can also manually create or edit `.plugshipignore` in your plugin directory to exclude files and folders from the deployment ZIP:

```
# .plugshipignore
src/**
assets/scss/**
webpack.config.js
package.json
package-lock.json
composer.json
composer.lock
*.map
```

- One pattern per line
- Lines starting with `#` are comments
- Blank lines are ignored
- Supports `dir/**` (directory and contents), `*.ext` (extension match), and exact names

The following are always excluded by default:

`node_modules`, `.git`, `.DS_Store`, `.env`, `*.log`, `.vscode`, `.idea`, `tests`, `phpunit.xml`, `.phpunit.result.cache`, `.github`, `build`

## Configuration

Site credentials are stored in `~/.plugship/config.json` with `0600` file permissions. The config file looks like:

```json
{
  "defaultSite": "staging",
  "sites": {
    "staging": {
      "url": "https://staging.example.com",
      "username": "admin",
      "appPassword": "xxxx xxxx xxxx xxxx"
    }
  }
}
```

## How It Works

The WordPress REST API does not support direct ZIP upload for plugin installation. The `plugship-receiver` companion plugin adds two custom endpoints:

- `GET /wp-json/plugship/v1/status` — Health check
- `POST /wp-json/plugship/v1/deploy` — Accepts a ZIP file and installs it using WordPress's built-in `Plugin_Upgrader` with `overwrite_package => true`

If the plugin already exists on the site, it is replaced with the uploaded version.

## License

MIT
