export interface ParsedSubmissionFields {
  name: string;
  shortDescription: string;
  version: string;
  architecture: string;
  license: string;
  downloadUrl: string;
  sourceUrl: string;
  iconUrl: string;
  sha256: string;
  category: string;
}

export interface SubmissionValidationResult {
  valid: boolean;
  appId: string;
  checksumStatus: 'provided' | 'unverified';
  errors: string[];
  checks: string[];
  parsed: ParsedSubmissionFields;
}

export function slugifyAppId(rawName: string): string;
export function loadAllowedHosts(rootDir?: string): string[];
export function isHostAllowed(hostname: string, allowedHosts: string[]): boolean;
export function classifyDownloadUrlPath(parsedUrl: URL): {
  valid: boolean;
  kind: 'appimage' | 'releases' | 'invalid';
};
export function parseSubmissionIssueBody(issueBody: string): ParsedSubmissionFields;
export function checkCatalogDuplicates(
  candidate: { id: string; name: string; downloadUrl: string },
  rootDir?: string
): { isDuplicate: boolean; reason?: string };
export function validateSubmissionFields(
  parsed: ParsedSubmissionFields,
  options?: {
    rootDir?: string;
    fetchImpl?: typeof fetch;
    skipHeadCheck?: boolean;
  }
): Promise<SubmissionValidationResult>;
export function buildCatalogEntryFromSubmission(
  parsed: ParsedSubmissionFields,
  submitterUsername?: string
): Record<string, any>;
export function formatValidationComment(result: SubmissionValidationResult): string;
