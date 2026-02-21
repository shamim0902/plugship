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

1. Get [plugship-receiver](https://github.com/plugship/plugship-receiver) and copy `plugship-receiver.php` to your site's `wp-content/plugins/` directory
2. Activate **PlugShip Receiver** from the WordPress admin Plugins page

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
```

### Manage Sites

```bash
plugship sites list             # List all saved sites
plugship sites remove <name>    # Remove a saved site
```

## Commands

| Command | Description |
| --- | --- |
| `plugship init` | Configure a new WordPress site |
| `plugship deploy` | Deploy the plugin from the current directory |
| `plugship sites list` | List all saved sites |
| `plugship sites remove <name>` | Remove a saved site |
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
