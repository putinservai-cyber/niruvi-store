export type Category = 
  | 'All'
  | 'Development'
  | 'Graphics & Design'
  | 'Audio & Video'
  | 'Productivity'
  | 'Utilities'
  | 'Internet & Network'
  | 'Games';

export type Architecture = 'x86_64' | 'aarch64' | 'armhf';

export type LicenseType = 'All' | 'Open Source' | 'Permissive' | 'Proprietary';

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
  iconBg?: string;
  iconName: string;
  screenshots: string[];
  homepageUrl?: string;
  sourceUrl?: string;
  tags: string[];
  featured?: boolean;
  downloadsCount: number;
  rating: number;
  changelog?: string[];
  requirements?: string;
}

export interface FilterState {
  searchQuery: string;
  category: Category;
  architecture: Architecture | 'All';
  licenseCategory: LicenseType;
  sortBy: 'featured' | 'popular' | 'rating' | 'name' | 'recent';
}
