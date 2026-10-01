-- Niruvi Store — Cloudflare D1 Migration 0001: AppImageHub & GitHub Releases Pipeline
-- Apply locally:  npx wrangler d1 execute niruvi-store-db --local --file=./migrations/0001_catalog_pipeline.sql
-- Apply remotely: npx wrangler d1 execute niruvi-store-db --remote --file=./migrations/0001_catalog_pipeline.sql

CREATE TABLE IF NOT EXISTS catalog_apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  categories_json TEXT NOT NULL DEFAULT '[]',
  version TEXT NOT NULL DEFAULT 'latest',
  release_date TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'Unknown size',
  architectures_json TEXT NOT NULL DEFAULT '["x86_64"]',
  license TEXT NOT NULL DEFAULT 'Open Source',
  license_category TEXT NOT NULL DEFAULT 'Open Source',
  publisher_name TEXT NOT NULL,
  publisher_website TEXT,
  publisher_github TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL DEFAULT '',
  download_url TEXT NOT NULL,
  download_map_json TEXT NOT NULL DEFAULT '{}',
  icon_url TEXT,
  screenshots_json TEXT NOT NULL DEFAULT '[]',
  homepage_url TEXT,
  github_repo TEXT,
  releases_url TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  release_notes TEXT,
  version_history_json TEXT NOT NULL DEFAULT '[]',
  source_origin TEXT NOT NULL DEFAULT 'appimagehub',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_catalog_apps_category ON catalog_apps(category);
CREATE INDEX IF NOT EXISTS idx_catalog_apps_verified ON catalog_apps(verified);
CREATE INDEX IF NOT EXISTS idx_catalog_apps_release_date ON catalog_apps(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_apps_downloads ON catalog_apps(downloads_count DESC);

CREATE TABLE IF NOT EXISTS catalog_releases (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  version TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  published_at TEXT NOT NULL,
  release_notes TEXT,
  assets_json TEXT NOT NULL DEFAULT '[]',
  sha256 TEXT NOT NULL DEFAULT '',
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (app_id) REFERENCES catalog_apps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_catalog_releases_app_id ON catalog_releases(app_id, published_at DESC);

CREATE TABLE IF NOT EXISTS catalog_sync_logs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  app_id TEXT,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_reports (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  distro TEXT,
  architecture TEXT,
  reporter_email TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_submissions (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  homepage_url TEXT,
  github_repo TEXT NOT NULL,
  download_url TEXT NOT NULL,
  sha256 TEXT,
  license TEXT NOT NULL DEFAULT 'Open Source',
  submitter_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
