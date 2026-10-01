export type Category =
  | 'All'
  | 'Internet'
  | 'Games'
  | 'Graphics'
  | 'Audio/Video'
  | 'Office'
  | 'Development'
  | 'System/Utilities'
  | 'Education'
  | 'AI'
  | 'Browser'
  | 'Graphics & Design'
  | 'Audio & Video'
  | 'Productivity'
  | 'Communication'
  | 'System & Security'
  | 'Utilities'
  | 'Internet & Network';

export type SimplifiedCategory =
  | 'All'
  | 'Internet'
  | 'Games'
  | 'Graphics'
  | 'Audio/Video'
  | 'Office'
  | 'Development'
  | 'System/Utilities'
  | 'Education';

export interface ReleaseAssetEntry {
  name: string;
  architecture: Architecture;
  downloadUrl: string;
  size: string;
  sizeBytes?: number;
  sha256: string;
  verified: boolean;
}

export interface ReleaseVersionEntry {
  version: string;
  tagName: string;
  releaseDate: string;
  releaseNotes?: string;
  htmlUrl?: string;
  prerelease?: boolean;
  assets: ReleaseAssetEntry[];
}

export type Architecture = 'x86_64' | 'aarch64' | 'armhf';

export type LicenseType = 'All' | 'Open Source' | 'Permissive' | 'Proprietary';

export type TrustTier = 'All' | 'Official Developer' | 'Verified Community' | 'Unverified Community';

export interface AppMetadata {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: Exclude<Category, 'All'>;
  simplifiedCategory?: Exclude<SimplifiedCategory, 'All'>;
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
  githubRepo?: string;
  sourceType?: 'Official' | 'Community';
  trustTier?: 'Official Developer' | 'Verified Community' | 'Unverified Community';
  officialStatus?: boolean;
  tags: string[];
  featured?: boolean;
  downloadsCount: number;
  rating: number;
  changelog?: string[];
  versionHistory?: ReleaseVersionEntry[];
  requirements?: string;
  isUserAdded?: boolean;
  screenshots?: Array<{
    url: string;
    alt: string;
    caption?: string;
  }>;
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
  verifiedOnly?: boolean;
  recentlyUpdated?: boolean;
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

