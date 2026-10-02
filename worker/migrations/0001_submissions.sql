-- Niruvi Store — Cloudflare D1 Schema Migration 0001: Community AppImage Submissions & Reports
-- Apply locally:  npx wrangler d1 migrations apply niruvi-store-db --local
-- Apply remotely: npx wrangler d1 migrations apply niruvi-store-db --remote

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  version TEXT NOT NULL,
  architecture TEXT NOT NULL CHECK (architecture IN ('x86_64', 'aarch64', 'armhf')),
  license TEXT NOT NULL,
  download_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  icon_url TEXT,
  sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_status_created ON submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_ip_hash_created ON submissions(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_download_url ON submissions(download_url);

CREATE TABLE IF NOT EXISTS submission_reports (
  id TEXT PRIMARY KEY,
  app_slug TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_reports_slug ON submission_reports(app_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_reports_ip_hash ON submission_reports(ip_hash, created_at DESC);
