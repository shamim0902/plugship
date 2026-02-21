# plugship

> Deploy WordPress plugins from your terminal to any WordPress site instantly.

A simple CLI tool to deploy local WordPress plugins to remote WordPress sites. No FTP, no cPanel — just `plugship deploy`.

## Quick Start

### 1. Install

```bash
npm install -g plugship
```

### 2. Install Receiver Plugin

Download and install the companion plugin on your WordPress site:

**[Download plugship-receiver.zip](https://github.com/shamim0902/plugship-receiver/releases/latest/download/plugship-receiver.zip)**

1. Go to **Plugins > Add New > Upload Plugin** in WordPress admin
2. Upload the ZIP file
3. Activate **PlugShip Receiver**

### 3. Configure Your Site

```bash
plugship init
```

You'll be prompted for:
- Site alias (e.g., "production")
- WordPress site URL
- Admin username
- [Application Password](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/) (create one in Users > Profile)

### 4. Deploy

Navigate to your plugin directory and run:

```bash
plugship deploy
```

Done! Your plugin is deployed and activated.

---

## Commands

### `plugship deploy`

Deploy the plugin from the current directory.

```bash
plugship deploy                 # Deploy to default site
plugship deploy --site staging  # Deploy to specific site
plugship deploy --all           # Deploy to all configured sites
plugship deploy --dry-run       # Preview without uploading
plugship deploy --no-activate   # Deploy without activating
```

### `plugship init`

Add a new WordPress site.

```bash
plugship init
```

### `plugship status`

Check if a site is ready for deployment.

```bash
plugship status                 # Check default site
plugship status --site staging  # Check specific site
```

### `plugship sites`

Manage your saved sites.

```bash
plugship sites list                 # List all sites
plugship sites set-default staging  # Set default site
plugship sites remove staging       # Remove a site
```

### `plugship ignore`

Exclude files from deployment.

```bash
plugship ignore                     # Create .plugshipignore template
plugship ignore "src/**" "*.map"    # Add patterns
```

---

## Ignoring Files

Create a `.plugshipignore` file to exclude files from deployment:

```bash
plugship ignore
```

This creates a template with common exclusions. Edit it to add your own:

```
# .plugshipignore
src/**
*.map
package.json
composer.json
webpack.config.js
```

**Already excluded by default:**
`node_modules`, `.git`, `.env`, `*.log`, `.vscode`, `.idea`, `tests`, `.github`, `build`

---

## How It Works

1. **Detects your plugin** from the WordPress plugin header in your PHP files
2. **Creates a ZIP** with only the files you need (excludes dev files)
3. **Uploads via REST API** to the WordPress site using the receiver plugin
4. **Installs and activates** the plugin automatically

The [plugship-receiver](https://github.com/shamim0902/plugship-receiver) plugin adds secure REST endpoints to accept the upload. Only admin users with Application Passwords can deploy.

---

## Examples

### Deploy to Staging

```bash
cd my-plugin/
plugship deploy --site staging
```

### Deploy to All Sites

```bash
plugship deploy --all
```

### Preview What Would Be Deployed

```bash
plugship deploy --dry-run
```

### Check Connection Before Deploying

```bash
plugship status
```

---

## Requirements

- **Node.js** 18 or higher
- **WordPress** 5.8 or higher
- **Admin account** with Application Passwords enabled

---

## Security

- All credentials are stored locally in `~/.plugship/config.json` with `0600` permissions
- Uses WordPress Application Passwords (not your main password)
- Only users with `install_plugins` capability can deploy
- All uploads are authenticated via WordPress REST API

---

## Configuration

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

---

## Troubleshooting

### "Receiver plugin not found"

The plugship-receiver plugin isn't active on your WordPress site.

1. Download: https://github.com/shamim0902/plugship-receiver/releases/latest/download/plugship-receiver.zip
2. Upload and activate in WordPress admin

### "Authentication failed"

Your Application Password is incorrect.

1. Go to **Users > Profile** in WordPress admin
2. Generate a new Application Password
3. Run `plugship init` again

### "Cannot reach REST API"

Your WordPress REST API isn't accessible.

- Check that `https://yoursite.com/wp-json/` loads
- Disable security plugins temporarily to test
- Check for firewall/hosting restrictions

---

## Links

- [npm package](https://www.npmjs.com/package/plugship)
- [Receiver plugin](https://github.com/shamim0902/plugship-receiver)
- [Report issues](https://github.com/shamim0902/plugship/issues)

---

## License

MIT
