/**
 * Input & Output Sanitization Utilities
 * Protects against XSS, HTML injection, and dangerous URI schemes (e.g., javascript:, data:, vbscript:)
 * across user-generated reviews, app descriptions, and developer profiles.
 */

const HTML_TAG_REGEX = /<\/?[a-zA-Z][^>]*>/g;
const SCRIPT_BLOCK_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_REGEX = /\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_URI_REGEX = /^\s*(?:javascript|vbscript|data):/i;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Strips raw HTML tags, script blocks, inline event handlers, and control characters
 * from user-generated text while preserving normal punctuation and line breaks.
 */
export function sanitizeText(input: unknown, maxLength = 5000): string {
  if (typeof input !== 'string') return '';
  const cleaned = input
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(SCRIPT_BLOCK_REGEX, '')
    .replace(EVENT_HANDLER_REGEX, '')
    .replace(HTML_TAG_REGEX, '')
    .replace(/javascript\s*:/gi, '')
    .trim();

  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

/**
 * Validates and sanitizes a URL, allowing only http:// and https:// protocols.
 * Returns an empty string if the URL is malformed or uses a dangerous scheme (e.g., javascript:).
 */
export function sanitizeUrl(input: unknown): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed || DANGEROUS_URI_REGEX.test(trimmed)) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitizes a username handle to lowercase alphanumeric, underscores, and hyphens.
 */
export function sanitizeUsername(input: unknown, maxLength = 24): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .toLowerCase()
    .replace(HTML_TAG_REGEX, '')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, maxLength);
}

export interface PasswordStrengthResult {
  score: number;
  label: string;
  isValid: boolean;
}

/**
 * Evaluates password strength and enforces >= 10 character minimum.
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLen = password.length >= 10;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLen) score++;
  if (password.length >= 14) score++;
  if (hasUpper && hasLower) score++;
  if (hasNumber) score++;
  if (hasSymbol) score++;

  const labels = ['Too Short', 'Weak', 'Fair', 'Good', 'Strong', 'Cryptographic'];
  return {
    score,
    label: !hasMinLen ? 'Min 10 chars required' : labels[score] || 'Strong',
    isValid: hasMinLen,
  };
}

/**
 * Detects whether a string resembles a sensitive backend/server secret key
 * (e.g., Supabase service_role JWT, sb_secret_, GitHub PAT, Stripe/Razorpay secret).
 */
export function isLikelySecretKey(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (!trimmed) return false;

  if (
    /service_role/i.test(trimmed) ||
    trimmed.startsWith('sb_secret_') ||
    trimmed.startsWith('ghp_') ||
    trimmed.startsWith('github_pat_') ||
    trimmed.startsWith('sk_live_') ||
    trimmed.startsWith('sk_test_') ||
    trimmed.startsWith('rk_live_') ||
    trimmed.startsWith('whsec_')
  ) {
    return true;
  }

  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const decoded = JSON.parse(atob(padded));
      if (decoded && (decoded.role === 'service_role' || decoded.role === 'supabase_admin')) {
        return true;
      }
    } catch {
      // Not a standard JSON JWT payload
    }
  }

  return false;
}

const SENSITIVE_ERROR_PATTERNS = [
  /\b(?:SQLITE_[A-Z_]+|D1_ERROR|PGRST\d+|ER_[A-Z_]+)\b/i,
  /\b(?:syntax error at or near|relation ["'][^"']+["'] does not exist|column ["'][^"']+["'] does not exist)\b/i,
  /\b(?:at\s+[A-Za-z0-9_$.]+\s*\([^)]*:\d+:\d+\))/i,
  /(?:\/home\/|\/Users\/|\/var\/|\/app\/|\/src\/|node_modules\/|[A-Z]:\\)/i,
  /\b(?:Bearer\s+[A-Za-z0-9\-._~+/]+=*|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})\b/,
  /\b(?:sb_secret_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+|sk_live_[A-Za-z0-9]+|ADMIN_TOKEN|JWT_SECRET|TURNSTILE_SECRET_KEY|OAUTH_CLIENT_SECRET)\b/i,
  /\b(?:postgres:\/\/|postgresql:\/\/|mongodb(?:\+srv)?:\/\/|mysql:\/\/|redis:\/\/)/i,
];

/**
 * Masks sensitive server/database/stack-trace details from any error object or message
 * before displaying it in the UI or returning it to a client.
 */
export function sanitizeErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred. Please try again.'
): string {
  const rawMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : error && typeof (error as any).message === 'string'
          ? (error as any).message
          : '';

  const cleaned = sanitizeText(rawMessage, 280);
  if (!cleaned) return fallback;

  for (const pattern of SENSITIVE_ERROR_PATTERNS) {
    if (pattern.test(cleaned)) {
      return fallback;
    }
  }

  if (cleaned.includes('\n') && /\bat\s+/.test(cleaned)) {
    return fallback;
  }

  return cleaned;
}

