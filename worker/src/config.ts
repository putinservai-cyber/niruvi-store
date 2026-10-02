export const ALLOWED_CORS_ORIGINS = [
  'https://putinservai-cyber.github.io',
  'https://niruvi-store.runs-on.dev',
] as const;

export const ALLOWED_DOWNLOAD_HOSTS = [
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'gitlab.com',
  'sourceforge.net',
  'downloads.sourceforge.net',
  'codeberg.org',
  'freedesktop.org',
  'kde.org',
  'download.kde.org',
  'gnome.org',
  'mozilla.org',
] as const;

export const VALID_ARCHITECTURES = ['x86_64', 'aarch64', 'armhf'] as const;

export const FIELD_LIMITS = {
  nameMax: 80,
  slugMax: 64,
  descriptionMax: 500,
  versionMax: 40,
  licenseMax: 60,
  urlMax: 500,
  reportReasonMax: 120,
  reportDetailsMax: 1000,
} as const;

export const RATE_LIMITS = {
  windowMinutes: 60,
  maxSubmissionsPerIpWindow: 5,
  maxReportsPerIpWindow: 10,
} as const;

/**
 * Curated static catalog slugs to prevent duplicate community submissions
 * of packages that already exist in the base catalog.
 */
export const STATIC_CATALOG_SLUGS = new Set([
  'audacity',
  'blender',
  'etcher',
  'freecad',
  'freetube',
  'gimp',
  'handbrake',
  'inkscape',
  'joplin',
  'kdenlive',
  'keepassxc',
  'krita',
  'obs-studio',
  'supertuxkart',
  'vscodium',
]);
