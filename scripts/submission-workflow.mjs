import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VALID_ARCHITECTURES = ['x86_64', 'aarch64', 'armhf'];
const SHA256_REGEX = /^[a-fA-F0-9]{64}$/;

/**
 * Normalizes an application name into a safe catalog ID slug.
 * @param {string} rawName
 * @returns {string}
 */
export function slugifyAppId(rawName) {
  return String(rawName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Loads the allowed hostnames from catalog/allowed-hosts.json.
 * @param {string} [rootDir]
 * @returns {string[]}
 */
export function loadAllowedHosts(rootDir = process.cwd()) {
  const configPath = path.join(rootDir, 'catalog', 'allowed-hosts.json');
  if (!fs.existsSync(configPath)) {
    return ['github.com', 'gitlab.com', 'sourceforge.net'];
  }
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (Array.isArray(raw.allowedHosts)) {
    return raw.allowedHosts.map((h) => String(h).trim().toLowerCase()).filter(Boolean);
  }
  return ['github.com', 'gitlab.com', 'sourceforge.net'];
}

/**
 * Checks whether a URL hostname matches any host (or subdomain) on the allowlist.
 * @param {string} hostname
 * @param {string[]} allowedHosts
 * @returns {boolean}
 */
export function isHostAllowed(hostname, allowedHosts) {
  const cleanHost = String(hostname || '').trim().toLowerCase();
  if (!cleanHost) return false;
  return allowedHosts.some(
    (allowed) => cleanHost === allowed || cleanHost.endsWith(`.${allowed}`)
  );
}

/**
 * Checks whether a URL path ends in .AppImage (case-insensitive) or points to a releases page.
 * @param {URL} parsedUrl
 * @returns {{ valid: boolean; kind: 'appimage' | 'releases' | 'invalid' }}
 */
export function classifyDownloadUrlPath(parsedUrl) {
  const pathname = decodeURIComponent(parsedUrl.pathname || '').trim();
  const lowerPath = pathname.toLowerCase();

  if (lowerPath.endsWith('.appimage')) {
    return { valid: true, kind: 'appimage' };
  }

  // Check if URL is a GitHub, GitLab, SourceForge, or Codeberg releases page
  const isReleasesPage =
    /\/releases(\/|$)/i.test(pathname) ||
    /\/-\/releases(\/|$)/i.test(pathname) ||
    /\/projects\/[^/]+\/files(\/|$)/i.test(pathname);

  if (isReleasesPage) {
    return { valid: true, kind: 'releases' };
  }

  return { valid: false, kind: 'invalid' };
}

/**
 * Cleans a raw Markdown field value from a GitHub Issue Form section.
 * @param {string | undefined} val
 * @returns {string}
 */
function cleanIssueFieldValue(val) {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (
    trimmed === '_No response_' ||
    trimmed === 'No response' ||
    trimmed === 'None' ||
    trimmed === 'N/A' ||
    trimmed === '-'
  ) {
    return '';
  }
  return trimmed;
}

/**
 * Parses a GitHub Issue Form Markdown body into structured fields without shell interpolation.
 * @param {string} issueBody
 * @returns {{
 *   name: string;
 *   shortDescription: string;
 *   version: string;
 *   architecture: string;
 *   license: string;
 *   downloadUrl: string;
 *   sourceUrl: string;
 *   iconUrl: string;
 *   sha256: string;
 *   category: string;
 * }}
 */
export function parseSubmissionIssueBody(issueBody) {
  const sections = new Map();
  const normalized = String(issueBody || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  let currentHeading = '';
  let buffer = [];

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+(.+?)\s*$/);
    if (headingMatch) {
      if (currentHeading) {
        sections.set(currentHeading.toLowerCase(), cleanIssueFieldValue(buffer.join('\n')));
      }
      currentHeading = headingMatch[1].trim();
      buffer = [];
    } else if (currentHeading) {
      buffer.push(line);
    }
  }
  if (currentHeading) {
    sections.set(currentHeading.toLowerCase(), cleanIssueFieldValue(buffer.join('\n')));
  }

  const getField = (...keys) => {
    for (const k of keys) {
      const val = sections.get(k.toLowerCase());
      if (val !== undefined && val !== '') return val;
    }
    return '';
  };

  return {
    name: getField('application name', 'name'),
    shortDescription: getField('short description', 'description & tagline', 'description'),
    version: getField('version').replace(/^v/i, ''),
    architecture: getField('architecture', 'supported architectures') || 'x86_64',
    license: getField('license', 'software license'),
    downloadUrl: getField(
      'download url (https only)',
      'download url',
      'appimage download url',
      'official appimage release url (x86_64)'
    ),
    sourceUrl: getField(
      'upstream source / repository url',
      'upstream source url',
      'source code repository',
      'repository url'
    ),
    iconUrl: getField(
      'icon url (optional)',
      'icon url',
      'application icon (png/svg url or attached image)'
    ),
    sha256: getField(
      'sha-256 checksum (optional)',
      'sha-256 checksum (optional but recommended)',
      'sha-256 checksum',
      'sha-256'
    ).toLowerCase(),
    category: getField('category') || 'Utilities',
  };
}

/**
 * Checks existing catalog JSON files in catalog/apps/*.json for duplicate IDs, names, or download URLs.
 * @param {{ id: string; name: string; downloadUrl: string }} candidate
 * @param {string} [rootDir]
 * @returns {{ isDuplicate: boolean; reason?: string }}
 */
export function checkCatalogDuplicates(candidate, rootDir = process.cwd()) {
  const appsDir = path.join(rootDir, 'catalog', 'apps');
  if (!fs.existsSync(appsDir)) {
    return { isDuplicate: false };
  }

  const candidateId = candidate.id.toLowerCase();
  const candidateName = candidate.name.trim().toLowerCase();
  const candidateUrl = candidate.downloadUrl.trim().toLowerCase().replace(/\/+$/, '');

  const files = fs.readdirSync(appsDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const app = JSON.parse(fs.readFileSync(path.join(appsDir, file), 'utf-8'));
      const existingId = String(app.id || file.replace(/\.json$/i, '')).toLowerCase();
      const existingName = String(app.name || '').trim().toLowerCase();
      const existingUrls = Object.values(app.download || {}).map((u) =>
        String(u || '')
          .trim()
          .toLowerCase()
          .replace(/\/+$/, '')
      );

      if (existingId === candidateId) {
        return {
          isDuplicate: true,
          reason: `An application with ID \`${existingId}\` already exists in \`catalog/apps/${file}\`.`,
        };
      }
      if (existingName && existingName === candidateName) {
        return {
          isDuplicate: true,
          reason: `An application named "${app.name}" already exists in \`catalog/apps/${file}\`.`,
        };
      }
      if (candidateUrl && existingUrls.includes(candidateUrl)) {
        return {
          isDuplicate: true,
          reason: `The download URL is already registered under \`catalog/apps/${file}\`.`,
        };
      }
    } catch {
      // Ignore unreadable file
    }
  }

  return { isDuplicate: false };
}

/**
 * Validates a parsed submission object, including allowlist verification, HEAD request check, and duplicate detection.
 * @param {ReturnType<typeof parseSubmissionIssueBody>} parsed
 * @param {{
 *   rootDir?: string;
 *   fetchImpl?: typeof fetch;
 *   skipHeadCheck?: boolean;
 * }} [options]
 */
export async function validateSubmissionFields(parsed, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const errors = [];
  const checks = [];

  // 1. Required fields
  const requiredFields = [
    ['Application Name', parsed.name],
    ['Short Description', parsed.shortDescription],
    ['Version', parsed.version],
    ['Architecture', parsed.architecture],
    ['License', parsed.license],
    ['Download URL', parsed.downloadUrl],
    ['Upstream Source / Repository URL', parsed.sourceUrl],
  ];

  for (const [label, value] of requiredFields) {
    if (!value || !String(value).trim()) {
      errors.push(`Missing required field: **${label}**.`);
    }
  }

  const appId = slugifyAppId(parsed.name);
  if (!appId) {
    errors.push('Application Name must contain alphanumeric characters to form a valid catalog ID.');
  }

  // 2. Architecture validation
  if (parsed.architecture && !VALID_ARCHITECTURES.includes(parsed.architecture)) {
    errors.push(
      `Unsupported architecture \`${parsed.architecture}\`. Allowed values: ${VALID_ARCHITECTURES.join(', ')}.`
    );
  } else if (parsed.architecture) {
    checks.push(`Architecture \`${parsed.architecture}\` is valid.`);
  }

  // 3. Download URL validation (HTTPS + host allowlist + .AppImage or releases page)
  const allowedHosts = loadAllowedHosts(rootDir);
  let parsedDownloadUrl = null;
  if (parsed.downloadUrl) {
    try {
      parsedDownloadUrl = new URL(parsed.downloadUrl);
      if (parsedDownloadUrl.protocol !== 'https:') {
        errors.push('Download URL must use `https://`.');
      } else {
        checks.push('Download URL uses `https://`.');
      }

      if (!isHostAllowed(parsedDownloadUrl.hostname, allowedHosts)) {
        errors.push(
          `Download URL host \`${parsedDownloadUrl.hostname}\` is not on the allowlist (\`catalog/allowed-hosts.json\`: ${allowedHosts.join(', ')}).`
        );
      } else {
        checks.push(`Download URL host \`${parsedDownloadUrl.hostname}\` is on the allowlist.`);
      }

      const pathClassification = classifyDownloadUrlPath(parsedDownloadUrl);
      if (!pathClassification.valid) {
        errors.push(
          'Download URL must end in `.AppImage` (case-insensitive) or point to an official releases page (`/releases`).'
        );
      } else {
        checks.push(
          pathClassification.kind === 'appimage'
            ? 'Download URL filename ends in `.AppImage`.'
            : 'Download URL points to a releases page.'
        );
      }
    } catch {
      errors.push('Download URL is not a valid URL.');
    }
  }

  // 4. Upstream Source / Repo URL validation
  if (parsed.sourceUrl) {
    try {
      const parsedSource = new URL(parsed.sourceUrl);
      if (parsedSource.protocol !== 'https:') {
        errors.push('Upstream Source / Repository URL must use `https://`.');
      } else {
        checks.push('Upstream Source / Repository URL uses `https://`.');
      }
    } catch {
      errors.push('Upstream Source / Repository URL is not a valid URL.');
    }
  }

  // 5. Optional Icon URL validation
  if (parsed.iconUrl) {
    try {
      const parsedIcon = new URL(parsed.iconUrl);
      if (parsedIcon.protocol !== 'https:') {
        errors.push('Optional Icon URL must use `https://`.');
      } else {
        checks.push('Optional Icon URL uses `https://`.');
      }
    } catch {
      errors.push('Optional Icon URL is not a valid URL.');
    }
  }

  // 6. Optional SHA-256 validation
  if (parsed.sha256) {
    if (!SHA256_REGEX.test(parsed.sha256)) {
      errors.push('Optional SHA-256 checksum must be exactly 64 hexadecimal characters.');
    } else {
      checks.push(`Optional SHA-256 checksum format verified (\`${parsed.sha256.slice(0, 12)}…\`).`);
    }
  } else {
    checks.push('No SHA-256 checksum supplied (will be marked as `unverified`).');
  }

  // 7. Duplicate check against catalog
  if (appId && parsed.name && parsed.downloadUrl) {
    const dup = checkCatalogDuplicates(
      { id: appId, name: parsed.name, downloadUrl: parsed.downloadUrl },
      rootDir
    );
    if (dup.isDuplicate) {
      errors.push(`Duplicate entry detected: ${dup.reason}`);
    } else {
      checks.push(`No duplicate entry found in catalog for ID \`${appId}\`.`);
    }
  }

  // 8. HEAD request check (only if URL syntax & allowlist passed and not skipped)
  if (!options.skipHeadCheck && parsedDownloadUrl && errors.length === 0) {
    try {
      const response = await fetchImpl(parsedDownloadUrl.toString(), {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'NiruviStore-SubmissionValidator/1.0 (+https://github.com/putinservai-cyber/niruvi-store)',
        },
      });

      if (!response.ok) {
        errors.push(
          `HEAD request to Download URL returned HTTP ${response.status} (${response.statusText || 'error'}). Confirm the URL is publicly reachable.`
        );
      } else {
        if (response.url) {
          const finalUrl = new URL(response.url);
          if (finalUrl.protocol !== 'https:') {
            errors.push('Download URL redirected to an insecure non-HTTPS URL.');
          }
        }
        checks.push(`HEAD request succeeded (HTTP ${response.status}, no binary downloaded).`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`HEAD request to Download URL failed: ${msg}`);
    }
  }

  return {
    valid: errors.length === 0,
    appId,
    checksumStatus: parsed.sha256 && SHA256_REGEX.test(parsed.sha256) ? 'provided' : 'unverified',
    errors,
    checks,
    parsed,
  };
}

/**
 * Builds a catalog JSON entry for catalog/apps/<id>.json from a validated community submission.
 * @param {ReturnType<typeof parseSubmissionIssueBody>} parsed
 * @param {string} [submitterUsername]
 */
export function buildCatalogEntryFromSubmission(parsed, submitterUsername = 'community') {
  const id = slugifyAppId(parsed.name);
  const categoriesPath = path.join(process.cwd(), 'catalog', 'categories.json');
  let validCategories = [
    'Development',
    'Graphics & Design',
    'Audio & Video',
    'Productivity',
    'Utilities',
    'Internet & Network',
    'Games',
    'System & Security',
    'Education',
  ];
  if (fs.existsSync(categoriesPath)) {
    try {
      const rawCats = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
      if (Array.isArray(rawCats)) {
        validCategories = rawCats.filter((c) => c !== 'All');
      }
    } catch {
      // fallback to default list
    }
  }

  const category = validCategories.includes(parsed.category) ? parsed.category : 'Utilities';
  const arch = VALID_ARCHITECTURES.includes(parsed.architecture) ? parsed.architecture : 'x86_64';
  const hasSha = Boolean(parsed.sha256 && SHA256_REGEX.test(parsed.sha256));
  const checksumStatus = hasSha ? 'provided' : 'unverified';

  let developer = submitterUsername ? `@${submitterUsername}` : 'Community Contributor';
  try {
    const srcUrl = new URL(parsed.sourceUrl);
    const parts = srcUrl.pathname.split('/').filter(Boolean);
    if (parts.length >= 1) {
      developer = parts[0];
    }
  } catch {
    // keep submitterUsername
  }

  const entry = {
    id,
    name: parsed.name.trim(),
    tagline: parsed.shortDescription.trim().slice(0, 160),
    description: parsed.shortDescription.trim(),
    version: parsed.version.trim(),
    releaseDate: new Date().toISOString().split('T')[0],
    category,
    developer,
    license: parsed.license.trim(),
    homepage: parsed.sourceUrl.trim(),
    repository: parsed.sourceUrl.trim(),
    repositoryUrl: parsed.sourceUrl.trim(),
    ...(parsed.iconUrl ? { icon: parsed.iconUrl.trim() } : {}),
    iconSlug: id,
    architectures: [arch],
    formats: ['AppImage'],
    download: {
      [arch]: parsed.downloadUrl.trim(),
    },
    ...(hasSha ? { sha256: parsed.sha256.trim().toLowerCase() } : { sha256: '' }),
    source: 'community',
    sourceType: 'Community',
    checksumStatus,
    officialStatus: false,
  };

  return entry;
}

/**
 * Formats a Markdown comment summarizing validation results for the GitHub issue.
 */
export function formatValidationComment(result) {
  const { valid, appId, checksumStatus, errors, checks, parsed } = result;
  const header = valid
    ? '### ✅ AppImage Submission Validated\n\nAll automated checks passed! A maintainer can now review this submission and apply the `approved` label to open a catalog Pull Request.'
    : '### ⚠️ Submission Needs Changes\n\nOne or more automated checks did not pass. Please edit the issue body above to fix the following items—validation will re-run automatically:';

  const errorBlock =
    errors.length > 0
      ? `\n#### ❌ Validation Errors\n${errors.map((e) => `- ${e}`).join('\n')}\n`
      : '';

  const checkBlock =
    checks.length > 0
      ? `\n#### 🔍 Checks Performed\n${checks.map((c) => `- ✅ ${c}`).join('\n')}\n`
      : '';

  const summaryTable = `
#### 📋 Parsed Submission Metadata
| Field | Value |
| :--- | :--- |
| **Catalog ID** | \`${appId || 'n/a'}\` |
| **Name** | ${parsed.name || '_missing_'} |
| **Version** | \`${parsed.version || '_missing_'}\` |
| **Architecture** | \`${parsed.architecture || '_missing_'}\` |
| **License** | \`${parsed.license || '_missing_'}\` |
| **Download URL** | ${parsed.downloadUrl ? `\`${parsed.downloadUrl}\`` : '_missing_'} |
| **Source URL** | ${parsed.sourceUrl ? `\`${parsed.sourceUrl}\`` : '_missing_'} |
| **Source Tag** | \`community\` |
| **Checksum Status** | \`${checksumStatus}\`${parsed.sha256 ? ` (\`${parsed.sha256}\`)` : ''} |
`;

  return `${header}\n${errorBlock}${checkBlock}${summaryTable}`;
}

async function githubApiRequest(endpoint, method = 'GET', body = undefined) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY environment variables are required.');
  }
  const url = `https://api.github.com/repos/${repo}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'NiruviStore-SubmissionBot/1.0',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res;
}

async function runValidateCli() {
  const issueNumber = process.env.ISSUE_NUMBER;
  const issueBody = process.env.ISSUE_BODY || '';

  const parsed = parseSubmissionIssueBody(issueBody);
  const result = await validateSubmissionFields(parsed);
  const commentBody = formatValidationComment(result);

  console.log(commentBody);

  if (issueNumber && process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
    await githubApiRequest(`/issues/${encodeURIComponent(issueNumber)}/comments`, 'POST', {
      body: commentBody,
    });

    const labelToAdd = result.valid ? 'validated' : 'needs-changes';
    const labelToRemove = result.valid ? 'needs-changes' : 'validated';

    await githubApiRequest(`/issues/${encodeURIComponent(issueNumber)}/labels`, 'POST', {
      labels: [labelToAdd],
    });

    // Remove opposite label if present (ignore 404 if label wasn't on the issue)
    await githubApiRequest(
      `/issues/${encodeURIComponent(issueNumber)}/labels/${encodeURIComponent(labelToRemove)}`,
      'DELETE'
    ).catch(() => {});
  }

  if (!result.valid) {
    process.exitCode = 1;
  }
}

async function runApproveCli() {
  const issueNumber = String(process.env.ISSUE_NUMBER || '').trim();
  const issueBody = process.env.ISSUE_BODY || '';
  const issueUser = process.env.ISSUE_USER || 'community';
  const issueLabelsRaw = process.env.ISSUE_LABELS || '[]';
  const baseBranch = process.env.BASE_BRANCH || 'master';

  if (!/^\d+$/.test(issueNumber)) {
    throw new Error(`Invalid ISSUE_NUMBER: "${issueNumber}"`);
  }

  let labels = [];
  try {
    labels = JSON.parse(issueLabelsRaw);
  } catch {
    labels = String(issueLabelsRaw).split(',').map((s) => s.trim());
  }

  if (!labels.includes('validated')) {
    const msg =
      '⚠️ Cannot open an approval Pull Request because this issue does not have the `validated` label yet. Ensure `validate-submission.yml` passes first.';
    console.error(msg);
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
      await githubApiRequest(`/issues/${encodeURIComponent(issueNumber)}/comments`, 'POST', {
        body: msg,
      });
    }
    process.exit(1);
  }

  const parsed = parseSubmissionIssueBody(issueBody);
  const validation = await validateSubmissionFields(parsed);
  if (!validation.valid) {
    const msg = `⚠️ Re-validation failed during approval:\n${validation.errors
      .map((e) => `- ${e}`)
      .join('\n')}`;
    console.error(msg);
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
      await githubApiRequest(`/issues/${encodeURIComponent(issueNumber)}/comments`, 'POST', {
        body: msg,
      });
    }
    process.exit(1);
  }

  const entry = buildCatalogEntryFromSubmission(parsed, issueUser);
  const appFilePath = path.join(process.cwd(), 'catalog', 'apps', `${entry.id}.json`);
  fs.writeFileSync(appFilePath, `${JSON.stringify(entry, null, 2)}\n`, 'utf-8');
  console.log(`✅ Wrote community catalog entry to catalog/apps/${entry.id}.json`);

  const branchName = `submission/issue-${issueNumber}-${entry.id}`;

  execFileSync('git', ['config', 'user.name', 'github-actions[bot]'], { stdio: 'inherit' });
  execFileSync(
    'git',
    ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'],
    { stdio: 'inherit' }
  );
  execFileSync('git', ['checkout', '-B', branchName], { stdio: 'inherit' });
  execFileSync('git', ['add', `catalog/apps/${entry.id}.json`], { stdio: 'inherit' });
  execFileSync(
    'git',
    [
      'commit',
      '-m',
      `feat(catalog): add community submission ${entry.name} v${entry.version} (#${issueNumber})`,
    ],
    { stdio: 'inherit' }
  );
  execFileSync('git', ['push', '--force-with-lease', 'origin', branchName], { stdio: 'inherit' });

  const prTitle = `feat(catalog): add ${entry.name} v${entry.version} (community submission)`;
  const prBody = [
    `## Community AppImage Submission: ${entry.name} v${entry.version}`,
    '',
    `Closes #${issueNumber}`,
    '',
    '### Catalog Metadata',
    `- **ID**: \`${entry.id}\``,
    `- **Name**: ${entry.name}`,
    `- **Version**: \`${entry.version}\``,
    `- **Architecture**: \`${entry.architectures.join(', ')}\``,
    `- **License**: \`${entry.license}\``,
    `- **Download URL**: ${entry.download[entry.architectures[0]]}`,
    `- **Upstream Source**: ${entry.repository}`,
    `- **Source Tag**: \`${entry.source}\``,
    `- **Checksum Status**: \`${entry.checksumStatus}\`${entry.sha256 ? ` (\`${entry.sha256}\`)` : ''}`,
    '',
    '> **Note for Maintainer**: This PR was opened automatically because the `approved` label was added to a `validated` submission issue. Auto-merge is disabled—please review the diff and merge manually.',
  ].join('\n');

  const prRes = await githubApiRequest('/pulls', 'POST', {
    title: prTitle,
    head: branchName,
    base: baseBranch,
    body: prBody,
  });

  const prData = await prRes.json();
  if (!prRes.ok) {
    throw new Error(`Failed to open Pull Request: ${JSON.stringify(prData)}`);
  }

  await githubApiRequest(`/issues/${encodeURIComponent(issueNumber)}/comments`, 'POST', {
    body: `🎉 Approved! Opened Pull Request #${prData.number} (${prData.html_url}) to add \`catalog/apps/${entry.id}.json\` with \`source: "community"\` and \`checksumStatus: "${entry.checksumStatus}"\`. This issue will close automatically when the PR is merged.`,
  });

  console.log(`✅ Opened Pull Request: ${prData.html_url}`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  const mode = process.argv[2];
  if (mode === 'validate') {
    runValidateCli().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  } else if (mode === 'approve') {
    runApproveCli().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  } else {
    console.error('Usage: node scripts/submission-workflow.mjs <validate|approve>');
    process.exit(1);
  }
}
