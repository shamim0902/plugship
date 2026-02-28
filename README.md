# plugship

> Deploy WordPress plugins from your terminal to any WordPress site instantly.


<img width="326" height="220" alt="carbon" src="https://github.com/user-attachments/assets/fdd7fe5f-582b-41fe-a45a-4a74b5824c6d" />


[![npm version](https://img.shields.io/npm/v/plugship.svg)](https://www.npmjs.com/package/plugship)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A simple CLI tool to deploy local WordPress plugins to remote WordPress sites. No FTP, no cPanel — just `plugship deploy`.

**[View on npm →](https://www.npmjs.com/package/plugship)**

---

## ✨ Features

- 🚀 **One-command deploys** — `plugship deploy` and you're done
- 🔐 **Secure** — uses WordPress Application Passwords (not your main password)
- 🎯 **Multi-site** — configure once, deploy to staging/production/any site
- 📦 **Smart packaging** — auto-excludes dev files (node_modules, tests, src, etc.)
- 🔄 **Auto-updates** — replaces existing plugins automatically
- 🌐 **No server access needed** — works entirely via WordPress REST API

---

## 📝 Changelog

### 1.0.6 - 2026-02-28

- Added interactive site picker for `plugship sites remove`.
- Added interactive site picker for `plugship sites set-default`.
- Added automatic `.gitignore` updates after successful deploy for `build/` and `builds/`.
- Fixed dry-run ZIP size reporting.

See full history in [`CHANGELOG.md`](./CHANGELOG.md).

---

## 📦 Installation

### Global Install (Recommended)

```bash
npm install -g plugship
```

### Verify Installation

```bash
plugship --version
```

---

## 🚀 Quick Start

### Step 1: Install the Receiver Plugin

The `plugship-receiver` plugin must be installed on your WordPress site first. It adds secure REST endpoints to receive plugin uploads.

**[Download plugship-receiver.zip →](https://github.com/shamim0902/plugship-receiver/releases/latest/download/plugship-receiver.zip)**

1. Go to **Plugins > Add New > Upload Plugin** in WordPress admin
2. Upload `plugship-receiver.zip`
3. Activate **PlugShip Receiver**

**[View receiver plugin source →](https://github.com/shamim0902/plugship-receiver)**

### Step 2: Create an Application Password

1. Go to **Users > Profile** in WordPress admin
2. Scroll to **Application Passwords**
3. Enter "plugship" as the name
4. Click **Add New Application Password**
5. Copy the generated password (you'll need it in the next step)

**[Learn more about Application Passwords →](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)**

### Step 3: Configure Your First Site

```bash
plugship init
```

You'll be prompted for:
- **Site alias** — a short name like "production" or "staging"
- **WordPress site URL** — e.g., `https://example.com`
- **Admin username** — your WordPress admin username
- **Application Password** — paste the password from Step 2

### Step 4: Deploy Your Plugin

Navigate to your WordPress plugin directory:

```bash
cd my-awesome-plugin/
plugship deploy
```

✅ Done! Your plugin is deployed and activated on the remote site.

---

## 📚 Commands

### `plugship deploy`

Deploy the plugin from the current directory.

```bash
# Deploy to default site
plugship deploy

# Deploy to a specific site
plugship deploy --site staging

# Deploy to all configured sites
plugship deploy --all

# Preview what would be deployed (no upload)
plugship deploy --dry-run

# Deploy without activating the plugin
plugship deploy --no-activate
```

**What happens:**
1. Detects your plugin from PHP headers
2. Creates a ZIP excluding dev files
3. Uploads to the WordPress site
4. Installs/updates the plugin
5. Activates it (unless `--no-activate`)

---

### `plugship init`

Add a new WordPress site to your configuration.

```bash
plugship init
```

Interactive prompts guide you through:
- Site alias
- URL
- Username
- Application Password

The CLI automatically tests the connection and verifies the receiver plugin is active.

---

### `plugship status`

Check if a site is ready for deployment.

```bash
# Check default site
plugship status

# Check a specific site
plugship status --site staging
```

Verifies:
- ✅ REST API is accessible
- ✅ Credentials are valid
- ✅ User has `install_plugins` capability
- ✅ Receiver plugin is active

---

### `plugship sites`

Manage your saved sites.

```bash
# List all configured sites
plugship sites list

# Set the default site
plugship sites set-default production

# Set default using interactive picker
plugship sites set-default

# Remove a site by name
plugship sites remove staging

# Remove a site using interactive picker
plugship sites remove
```

---

### `plugship ignore`

Manage file exclusions for deployment.
NB: If you have already build ignore file like .distignore then it will use it by default.

```bash
# Create .plugshipignore with default template
plugship ignore

# Add specific patterns
plugship ignore "src/**" "*.map" "composer.json"
```

Creates a `.plugshipignore` file in your plugin directory. Example:

```
# .plugshipignore
src/**
*.map
webpack.config.js
package.json
package-lock.json
composer.json
```

**Already excluded by default:**
`node_modules`, `.git`, `.env`, `*.log`, `.vscode`, `.idea`, `tests`, `.github`, `build`

---

## 💡 Usage Examples

### Multi-Site Workflow

Configure multiple environments:

```bash
plugship init  # Add production
plugship init  # Add staging
plugship init  # Add local test site
```

Deploy to each:

```bash
plugship deploy --site staging     # Test on staging first
plugship deploy --site production  # Then push to prod
```

Or deploy everywhere at once:

```bash
plugship deploy --all
```

---

### Preview Before Deploy

See what would be deployed without uploading:

```bash
plugship deploy --dry-run
```

Output shows:
- Plugin name, version, slug
- ZIP file size
- Target site(s)
- Activation setting

---

### Exclude Dev Files

Auto-suggest on first deploy, or create manually:

```bash
plugship ignore
```

Edit `.plugshipignore` to add project-specific exclusions:

```
# Custom exclusions
assets/src/**
*.scss
*.ts
tsconfig.json
```


---

## 🔧 How It Works

```
┌──────────────┐
│ Your Plugin  │
│  Directory   │
└──────┬───────┘
       │
       │ plugship deploy
       ▼
┌──────────────┐
│   ZIP File   │  (excludes dev files)
└──────┬───────┘
       │
       │ Upload via REST API
       ▼
┌──────────────────────┐
│  WordPress Site      │
│  (plugship-receiver) │
└──────┬───────────────┘
       │
       │ Install/Update
       ▼
┌──────────────┐
│    Plugin    │
│   Active!    │
└──────────────┘
```

The [plugship-receiver](https://github.com/shamim0902/plugship-receiver) plugin adds two REST endpoints:

- `GET /wp-json/plugship/v1/status` — Health check
- `POST /wp-json/plugship/v1/deploy` — Accept plugin ZIP upload

WordPress's native `Plugin_Upgrader` with `overwrite_package => true` handles installation. Existing plugins are replaced automatically.

---

## ⚙️ Configuration

Config file: `~/.plugship/config.json`

```json
{
  "defaultSite": "production",
  "sites": {
    "production": {
      "url": "https://example.com",
      "username": "admin",
      "appPassword": "xxxx xxxx xxxx xxxx"
    },
    "staging": {
      "url": "https://staging.example.com",
      "username": "admin",
      "appPassword": "xxxx xxxx xxxx xxxx"
    }
  }
}
```

**File permissions:** `0600` (only you can read/write)

---

## 🔒 Security

- ✅ **Application Passwords only** — never uses your main WordPress password
- ✅ **Local storage** — credentials stored in `~/.plugship/config.json` with restricted permissions
- ✅ **Capability checks** — only users with `install_plugins` can deploy
- ✅ **ZIP validation** — receiver plugin validates MIME type and ZIP integrity
- ✅ **Path traversal protection** — rejects ZIPs with malicious entries
- ✅ **50 MB upload limit** — prevents abuse

---

## 🛠️ Requirements

- **Node.js** 18 or higher
- **WordPress** 5.8 or higher
- **Admin account** with Application Passwords enabled

---

## ❓ Troubleshooting

### "Receiver plugin not found"

**Problem:** The plugship-receiver plugin isn't active on your WordPress site.

**Solution:**
1. Download: https://github.com/shamim0902/plugship-receiver/releases/latest/download/plugship-receiver.zip
2. Upload via **Plugins > Add New > Upload Plugin**
3. Activate **PlugShip Receiver**
4. Run `plugship status` to verify

---

### "Authentication failed"

**Problem:** Your Application Password is incorrect or expired.

**Solution:**
1. Go to **Users > Profile** in WordPress admin
2. Delete the old Application Password
3. Create a new one
4. Run `plugship init` again and paste the new password

---

### "Cannot reach REST API"

**Problem:** The WordPress REST API isn't accessible.

**Solution:**
1. Check that `https://yoursite.com/wp-json/` loads in your browser
2. Temporarily disable security plugins (Wordfence, iThemes, etc.)
3. Check hosting firewall rules
4. Verify mod_rewrite is enabled (permalinks must work)

---

### Deploy fails with "permission denied"

**Problem:** User doesn't have `install_plugins` capability.

**Solution:**
- Ensure you're using an **Administrator** account
- Other roles (Editor, Author, etc.) can't install plugins

---

## 📖 Plugin Detection

PlugShip detects your plugin by scanning `.php` files in the current directory for WordPress plugin headers:

```php
<?php
/**
 * Plugin Name: My Awesome Plugin
 * Version: 1.0.0
 * Text Domain: my-awesome-plugin
 */
```

- The `Text Domain` is used as the plugin slug
- If no `Text Domain` is found, the slug is derived from the plugin name
- Version is read from the header and displayed during deploy

---

## 🌐 Links

- **npm package:** https://www.npmjs.com/package/plugship
- **Receiver plugin:** https://github.com/shamim0902/plugship-receiver
- **Report issues:** https://github.com/shamim0902/plugship/issues

---

## 📄 License

MIT © [shamim0902](https://github.com/shamim0902)

---

## 🙌 Contributing

Contributions are welcome! Please open an issue or PR.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

**Made with ❤️ for the WordPress community**
