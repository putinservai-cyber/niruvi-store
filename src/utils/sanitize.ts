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
