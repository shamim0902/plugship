# Changelog

All notable changes to this project are documented in this file.

## 1.0.6 - 2026-02-28

### Added
- Interactive site removal flow: `plugship sites remove` now supports no-arg selection from saved sites.
- Interactive default-site selection: `plugship sites set-default` now supports no-arg selection from saved sites.
- Automatic `.gitignore` updates after successful deploy for missing `build/` and `builds/` entries in Git repositories.

### Changed
- Updated CLI help text and README examples for interactive `sites remove` and `sites set-default`.

### Fixed
- Fixed dry-run ZIP size reporting (`sizeMB is now resolved correctly after build`).

