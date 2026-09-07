import { db } from './index';
import { apps, appVersions, reviews, users, developerProfiles } from './schema';
import { APPS_CATALOG } from '../data/apps';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function seedDatabaseIfEmpty() {
  try {
    const existingApps = await db.select().from(apps).limit(1);
    if (existingApps.length > 0) {
      console.log('Database already contains apps. Skipping seed.');
      return;
    }

    console.log('Seeding initial apps catalog and demo accounts into Cloud SQL...');

    // 1. Create demo developer and admin users
    const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
    const devPasswordHash = await bcrypt.hash('DevPassword123!', 10);

    const adminUser = {
      id: 'usr_admin_001',
      email: 'admin@niruvi.store',
      passwordHash: adminPasswordHash,
      username: 'niruvi_admin',
      displayName: 'Niruvi Platform Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      role: 'ADMIN',
      emailVerified: true,
    };

    const devUser = {
      id: 'usr_dev_001',
      email: 'developer@niruvi.store',
      passwordHash: devPasswordHash,
      username: 'linux_craft',
      displayName: 'Linux Craft Labs',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      role: 'DEVELOPER',
      emailVerified: true,
    };

    await db.insert(users).values([adminUser, devUser]).onConflictDoNothing();

    const devProfile = {
      id: 'dev_prof_001',
      userId: devUser.id,
      orgName: 'Linux Craft Labs',
      orgWebsite: 'https://linuxcraft.org',
      orgDescription: 'Independent open-source tools and desktop utilities for modern Linux distributions.',
      verified: true,
      payoutEmail: 'payouts@linuxcraft.org',
      taxInfoSubmitted: true,
    };

    await db.insert(developerProfiles).values(devProfile).onConflictDoNothing();

    // 2. Insert apps from catalog
    for (const app of APPS_CATALOG) {
      const appRecord = {
        id: `app_${app.id}`,
        slug: app.id,
        name: app.name,
        tagline: app.tagline,
        description: app.description,
        category: app.category,
        version: app.version,
        releaseDate: app.releaseDate,
        sizeBytes: app.size,
        architectures: app.architectures,
        license: app.license,
        licenseCategory: app.licenseCategory,
        publisherId: devProfile.id,
        publisherName: app.publisher.name,
        sha256: app.sha256,
        downloadUrl: app.downloadUrl,
        iconUrl: app.iconSlug,
        screenshots: [],
        homepageUrl: app.homepageUrl || app.publisher.website,
        sourceUrl: app.sourceUrl || app.publisher.github,
        tags: app.tags,
        featured: Boolean(app.featured),
        priceCents: 0,
        currency: 'USD',
        isPublished: true,
        moderationStatus: 'APPROVED',
      };

      await db.insert(apps).values(appRecord).onConflictDoNothing();

      // Insert version record
      await db.insert(appVersions).values({
        id: `ver_${app.id}_${app.version.replace(/\./g, '_')}`,
        appId: `app_${app.id}`,
        version: app.version,
        changelog: app.changelog || ['Upstream version sync with enhanced stability fixes.'],
        downloadUrl: app.downloadUrl,
        sha256: app.sha256,
        sizeBytes: app.size,
        releaseDate: app.releaseDate,
        isCurrent: true,
      }).onConflictDoNothing();
    }

    // 3. Insert some authentic community reviews
    const sampleReviews = [
      {
        id: 'rev_001',
        appId: 'app_vscodium',
        userId: adminUser.id,
        rating: 5,
        title: 'Perfect privacy-first development experience',
        body: 'VSCodium runs cleanly across Wayland and X11 without telemetry overhead. The AppImage integration with Niruvi makes desktop launcher setup completely effortless.',
        isVerifiedPurchase: true,
        helpfulCount: 24,
      },
      {
        id: 'rev_002',
        appId: 'app_blender',
        userId: devUser.id,
        rating: 5,
        title: 'Rock solid Cycles rendering on Arch and Ubuntu',
        body: 'Tested with AMD ROCm and NVIDIA CUDA backends. Flawless geometry node rendering and no broken library dependencies thanks to the self-contained AppImage bundle.',
        isVerifiedPurchase: true,
        helpfulCount: 42,
      },
      {
        id: 'rev_003',
        appId: 'app_obsidian',
        userId: devUser.id,
        rating: 5,
        title: 'Fast note-taking and markdown linking',
        body: 'Starts instantly and keeps all personal notes in local vaults without vendor lock-in. Verification SHA-256 matches upstream perfectly.',
        isVerifiedPurchase: true,
        helpfulCount: 19,
      }
    ];

    for (const r of sampleReviews) {
      await db.insert(reviews).values(r).onConflictDoNothing();
    }

    console.log(`Successfully seeded ${APPS_CATALOG.length} apps, versions, and sample reviews into Cloud SQL!`);
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
