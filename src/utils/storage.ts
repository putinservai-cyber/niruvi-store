import { InstalledAppRecord, AppMetadata } from '../types';

const INSTALLED_STORAGE_KEY = 'niruvi_installed_apps';
const BOOKMARKS_STORAGE_KEY = 'niruvi_bookmarked_apps';
const CUSTOM_APPS_STORAGE_KEY = 'niruvi_custom_apps';

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
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load custom apps', err);
    return [];
  }
}

export function saveCustomApp(app: AppMetadata): void {
  try {
    const current = getCustomApps();
    const filtered = current.filter((item) => item.id !== app.id);
    filtered.unshift(app);
    localStorage.setItem(CUSTOM_APPS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save custom app', err);
  }
}
