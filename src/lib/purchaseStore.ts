import { PurchaseRecord, LicenseKeyInfo } from '../types';

const PURCHASES_KEY = 'niruvi_purchases_v1';
const LICENSES_KEY = 'niruvi_licenses_v1';

export function getStoredPurchases(): PurchaseRecord[] {
  try {
    const raw = localStorage.getItem(PURCHASES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read purchases from storage:', e);
    return [];
  }
}

export function saveStoredPurchase(purchase: PurchaseRecord): void {
  try {
    const current = getStoredPurchases();
    const updated = [purchase, ...current.filter((p) => p.id !== purchase.id)];
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('niruvi_purchases_updated'));
  } catch (e) {
    console.error('Failed to save purchase:', e);
  }
}

export function isAppPurchased(appId: string): boolean {
  const purchases = getStoredPurchases();
  return purchases.some((p) => p.appId === appId && p.status === 'completed');
}

export function hasProLicense(): boolean {
  const purchases = getStoredPurchases();
  return purchases.some(
    (p) =>
      p.status === 'completed' &&
      (p.planId === 'pro_developer' || p.planId === 'team' || p.planId === 'supporter')
  );
}

export function generateLicenseKey(prefix = 'NIRUVI'): string {
  const segment = () =>
    Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${segment()}-${segment()}-${segment()}-${segment()}`;
}

export function getStoredLicenses(): LicenseKeyInfo[] {
  try {
    const raw = localStorage.getItem(LICENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLicense(license: LicenseKeyInfo): void {
  try {
    const current = getStoredLicenses();
    const updated = [license, ...current.filter((l) => l.key !== license.key)];
    localStorage.setItem(LICENSES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('niruvi_licenses_updated'));
  } catch (e) {
    console.error('Failed to save license:', e);
  }
}
