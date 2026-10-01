import { pgTable, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('USER'), // 'USER' | 'DEVELOPER' | 'ADMIN' | 'MODERATOR'
  emailVerified: boolean('email_verified').notNull().default(false),
  verificationToken: text('verification_token'),
  verificationTokenExpires: timestamp('verification_token_expires'),
  resetPasswordToken: text('reset_password_token'),
  resetPasswordExpires: timestamp('reset_password_expires'),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  isBanned: boolean('is_banned').notNull().default(false),
  banReason: text('ban_reason'),
  firebaseUid: text('firebase_uid').unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const developerProfiles = pgTable('developer_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id).unique(),
  orgName: text('org_name').notNull(),
  orgWebsite: text('org_website'),
  orgDescription: text('org_description'),
  verified: boolean('verified').notNull().default(false),
  payoutEmail: text('payout_email').notNull(),
  stripeConnectAccountId: text('stripe_connect_account_id'),
  taxInfoSubmitted: boolean('tax_info_submitted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const apps = pgTable('apps', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // 'DEVELOPMENT' | 'GRAPHICS_DESIGN' | 'AUDIO_VIDEO' | 'PRODUCTIVITY' | 'UTILITIES' | 'INTERNET_NETWORK' | 'GAMES'
  version: text('version').notNull(),
  releaseDate: text('release_date').notNull(),
  sizeBytes: text('size_bytes').notNull().default('0'),
  architectures: jsonb('architectures').notNull().default(['x86_64']),
  license: text('license').notNull().default('GPL-3.0'),
  licenseCategory: text('license_category').notNull().default('OPEN_SOURCE'), // 'OPEN_SOURCE' | 'PERMISSIVE' | 'PROPRIETARY'
  publisherId: text('publisher_id').references(() => developerProfiles.id),
  publisherName: text('publisher_name').notNull().default('Community'),
  sha256: text('sha256').notNull(),
  downloadUrl: text('download_url').notNull(),
  iconUrl: text('icon_url'),
  screenshots: jsonb('screenshots').default([]),
  homepageUrl: text('homepage_url'),
  sourceUrl: text('source_url'),
  tags: jsonb('tags').default([]),
  featured: boolean('featured').notNull().default(false),
  priceCents: integer('price_cents').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  isPublished: boolean('is_published').notNull().default(true),
  moderationStatus: text('moderation_status').notNull().default('APPROVED'), // 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED'
  moderationNotes: text('moderation_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const appVersions = pgTable('app_versions', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull().references(() => apps.id),
  version: text('version').notNull(),
  changelog: jsonb('changelog').default([]),
  downloadUrl: text('download_url').notNull(),
  sha256: text('sha256').notNull(),
  sizeBytes: text('size_bytes').notNull().default('0'),
  releaseDate: text('release_date').notNull(),
  isCurrent: boolean('is_current').notNull().default(true),
});

export const downloads = pgTable('downloads', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull().references(() => apps.id),
  userId: text('user_id').references(() => users.id),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  downloadedAt: timestamp('downloaded_at').defaultNow(),
  sha256Verified: boolean('sha256_verified').notNull().default(true),
  pricePaidCents: integer('price_paid_cents').notNull().default(0),
});

export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull().references(() => apps.id),
  userId: text('user_id').notNull().references(() => users.id),
  rating: integer('rating').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(false),
  helpfulCount: integer('helpful_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const reviewVotes = pgTable('review_votes', {
  id: text('id').primaryKey(),
  reviewId: text('review_id').notNull().references(() => reviews.id),
  userId: text('user_id').notNull().references(() => users.id),
  isHelpful: boolean('is_helpful').notNull(),
});

export const cookieConsents = pgTable('cookie_consents', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  ipHash: text('ip_hash'),
  consentGiven: boolean('consent_given').notNull().default(true),
  necessary: boolean('necessary').notNull().default(true),
  analytics: boolean('analytics').notNull().default(false),
  marketing: boolean('marketing').notNull().default(false),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(), // 'LOGIN' | 'LOGOUT' | 'UPLOAD' | 'DOWNLOAD' | 'PURCHASE' | 'REVIEW' | 'PASSWORD_CHANGE' | 'EMAIL_VERIFY' | 'ADMIN_ACTION'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const vulnerabilities = pgTable('vulnerabilities', {
  id: text('id').primaryKey(),
  findingId: text('finding_id').notNull().unique(),
  title: text('title').notNull(),
  severity: text('severity').notNull(), // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  cvssScore: text('cvss_score').notNull().default('0.0'),
  affectedComponent: text('affected_component').notNull(),
  affectedEndpoint: text('affected_endpoint').notNull(),
  description: text('description').notNull(),
  impact: text('impact').notNull(),
  evidence: text('evidence').notNull(),
  remediation: text('remediation').notNull(),
  status: text('status').notNull().default('OPEN'), // 'OPEN' | 'CONFIRMED' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED_RISK' | 'FALSE_POSITIVE'
  firstDetected: timestamp('first_detected').defaultNow(),
  lastDetected: timestamp('last_detected').defaultNow(),
  fixedDate: timestamp('fixed_date'),
  references: jsonb('references').default([]),
});

export const securityAlerts = pgTable('security_alerts', {
  id: text('id').primaryKey(),
  alertId: text('alert_id').notNull().unique(),
  title: text('title').notNull(),
  severity: text('severity').notNull(), // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: text('category').notNull(), // 'BRUTE_FORCE' | 'RATE_LIMIT' | 'XSS_ATTEMPT' | 'SQLI_ATTEMPT' | 'UNAUTHORIZED_ACCESS' | 'PRIVILEGE_ESCALATION' | 'ANOMALOUS_TRAFFIC'
  description: text('description').notNull(),
  evidence: jsonb('evidence'),
  status: text('status').notNull().default('UNREAD'), // 'UNREAD' | 'ACKNOWLEDGED' | 'RESOLVED'
  triggerCount: integer('trigger_count').notNull().default(1),
  lastTriggeredAt: timestamp('last_triggered_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const securityEvents = pgTable('security_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  category: text('category').notNull(), // 'AUTH' | 'API' | 'WAF' | 'RATE_LIMIT' | 'SYSTEM' | 'ANOMALY' | 'SCAN'
  severity: text('severity').notNull(), // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  path: text('path'),
  userId: text('user_id'),
  details: jsonb('details'),
  riskScore: integer('risk_score').notNull().default(0),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const securityScans = pgTable('security_scans', {
  id: text('id').primaryKey(),
  scanType: text('scan_type').notNull(), // 'FULL_SAST_DAST' | 'HEADERS' | 'DEPENDENCIES' | 'SECRETS' | 'API_PERMISSIONS'
  target: text('target').notNull(),
  profile: text('profile').notNull().default('SAFE_DEFAULT'),
  status: text('status').notNull().default('COMPLETED'), // 'COMPLETED' | 'RUNNING' | 'FAILED'
  findingsCount: integer('findings_count').notNull().default(0),
  criticalCount: integer('critical_count').notNull().default(0),
  highCount: integer('high_count').notNull().default(0),
  mediumCount: integer('medium_count').notNull().default(0),
  lowCount: integer('low_count').notNull().default(0),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at').defaultNow(),
  summary: jsonb('summary'),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  developerProfile: one(developerProfiles, {
    fields: [users.id],
    references: [developerProfiles.userId],
  }),
  downloads: many(downloads),
  reviews: many(reviews),
  auditLogs: many(auditLogs),
}));

export const appsRelations = relations(apps, ({ one, many }) => ({
  publisher: one(developerProfiles, {
    fields: [apps.publisherId],
    references: [developerProfiles.id],
  }),
  versions: many(appVersions),
  downloads: many(downloads),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  app: one(apps, {
    fields: [reviews.appId],
    references: [apps.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  votes: many(reviewVotes),
}));

