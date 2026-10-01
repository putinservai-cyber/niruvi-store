import { InstalledAppRecord, AppMetadata } from '../types';
import { sanitizeText, sanitizeUrl } from './sanitize';

const INSTALLED_STORAGE_KEY = 'niruvi_installed_apps';
const BOOKMARKS_STORAGE_KEY = 'niruvi_bookmarked_apps';
const CUSTOM_APPS_STORAGE_KEY = 'niruvi_custom_apps';

function sanitizeAppMetadata(app: AppMetadata): AppMetadata {
  return {
    ...app,
    name: sanitizeText(app.name, 100),
    tagline: sanitizeText(app.tagline, 300),
    description: sanitizeText(app.description, 4000),
    version: sanitizeText(app.version, 40),
    downloadUrl: sanitizeUrl(app.downloadUrl),
    homepageUrl: app.homepageUrl ? sanitizeUrl(app.homepageUrl) : undefined,
    sourceUrl: app.sourceUrl ? sanitizeUrl(app.sourceUrl) : undefined,
    releasesUrl: app.releasesUrl ? sanitizeUrl(app.releasesUrl) : undefined,
    repositoryUrl: app.repositoryUrl ? sanitizeUrl(app.repositoryUrl) : undefined,
    publisher: {
      ...app.publisher,
      name: sanitizeText(app.publisher?.name || '', 100),
      website: app.publisher?.website ? sanitizeUrl(app.publisher.website) : undefined,
    },
    tags: Array.isArray(app.tags) ? app.tags.map((t) => sanitizeText(t, 40)) : [],
  };
}

export function getInstalledApps(): InstalledAppRecord[] {
  try {
    const data = localStorage.getItem(INSTALLED_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load installed apps from localStorage', err);
    return [];
  }
}

export function saveInstalledApp(record: InstalledAppRecord): void {
  try {
    const current = getInstalledApps();
    const filtered = current.filter((item) => item.appId !== record.appId);
    filtered.push(record);
    localStorage.setItem(INSTALLED_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save installed app to localStorage', err);
  }
}

export function removeInstalledApp(appId: string): void {
  try {
    const current = getInstalledApps();
    const updated = current.filter((item) => item.appId !== appId);
    localStorage.setItem(INSTALLED_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove installed app from localStorage', err);
  }
}

export function getBookmarkedAppIds(): string[] {
  try {
    const data = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load bookmarks', err);
    return [];
  }
}

export function toggleBookmark(appId: string): string[] {
  try {
    const current = getBookmarkedAppIds();
    const exists = current.includes(appId);
    const updated = exists ? current.filter((id) => id !== appId) : [...current, appId];
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to toggle bookmark', err);
    return [];
  }
}

export function getCustomApps(): AppMetadata[] {
  try {
    const data = localStorage.getItem(CUSTOM_APPS_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.map(sanitizeAppMetadata) : [];
  } catch (err) {
    console.error('Failed to load custom apps', err);
    return [];
  }
}

export function saveCustomApp(app: AppMetadata): void {
  try {
    const sanitized = sanitizeAppMetadata(app);
    const current = getCustomApps();
    const filtered = current.filter((item) => item.id !== sanitized.id);
    filtered.unshift(sanitized);
    localStorage.setItem(CUSTOM_APPS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save custom app', err);
  }
}
