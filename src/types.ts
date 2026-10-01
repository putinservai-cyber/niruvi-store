export type Category = 
  | 'All'
  | 'AI'
  | 'Browser'
  | 'Development'
  | 'Graphics & Design'
  | 'Audio & Video'
  | 'Productivity'
  | 'Communication'
  | 'Games'
  | 'System & Security'
  | 'Utilities'
  | 'Internet & Network'
  | 'Education';

export type Architecture = 'x86_64' | 'aarch64' | 'armhf';

export type LicenseType = 'All' | 'Open Source' | 'Permissive' | 'Proprietary';

export type TrustTier = 'All' | 'Official Developer' | 'Verified Community' | 'Unverified Community';

export interface AppMetadata {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: Exclude<Category, 'All'>;
  version: string;
  releaseDate: string;
  size: string;
  architectures: Architecture[];
  formats?: string[];
  license: string;
  licenseCategory: 'Open Source' | 'Permissive' | 'Proprietary';
  publisher: {
    name: string;
    website?: string;
    verified: boolean;
    github?: string;
  };
  sha256: string;
  downloadUrl: string;
  downloadMap?: Record<string, string>;
  brandColor?: string;
  iconSlug: string;
  icon?: string;
  features?: string[];
  homepageUrl?: string;
  sourceUrl?: string;
  repositoryUrl?: string;
  releasesUrl?: string;
  sourceType?: 'Official' | 'Community';
  trustTier?: 'Official Developer' | 'Verified Community' | 'Unverified Community';
  officialStatus?: boolean;
  tags: string[];
  featured?: boolean;
  downloadsCount: number;
  rating: number;
  changelog?: string[];
  requirements?: string;
  isUserAdded?: boolean;
}

export interface InstalledAppRecord {
  appId: string;
  installedVersion: string;
  installedAt: string;
  installMethod: 'protocol' | 'direct' | 'cli';
  installDirectory: string;
}

export interface FilterState {
  searchQuery: string;
  category: Category;
  architecture: Architecture | 'All';
  licenseCategory: LicenseType;
  trustTier: TrustTier;
  sortBy: 'featured' | 'popular' | 'rating' | 'name' | 'recent';
}

export interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  priceInr: number;
  priceUsd: number;
  interval: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  popular?: boolean;
  buttonText: string;
  planType: 'free' | 'supporter' | 'pro_developer' | 'team';
}

export type AccountPlan = 'free' | 'supporter' | 'pro_developer' | 'team';

export interface PurchaseRecord {
  id: string;
  orderId: string;
  paymentId: string;
  appId?: string;
  planId?: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
  licenseKey?: string;
  customerEmail?: string;
}

export interface LicenseKeyInfo {
  key: string;
  appId?: string;
  planType: string;
  expiresAt?: string;
  isActive: boolean;
  registeredTo?: string;
}

