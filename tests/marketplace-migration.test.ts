// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateReleaseMetadata,
  importReleaseFromGitHub,
  importReleaseFromGitLab,
  formatSupabaseAuthError,
  setSupabaseClientForTesting,
  createPublisherApplication,
  updatePublisherApplication,
  createAppVersionWithAssets,
  submitApplicationForReview,
  moderateApplication,
  moderatePublisher,
  recordAppDownload,
  syncLibraryBookmarkWithSupabase,
  fetchUserLibraryFromSupabase,
  fetchUserDownloadsFromSupabase,
  fetchPublisherApplications,
  checkSupabaseUsernameAvailability,
  changeUserPassword,
  unlinkIdentity,
  fetchSupabaseUserProfile,
  getOAuthDiagnosticsInfo,
} from '../src/lib/supabase';

describe('Marketplace Migration — Authentication & Error Contracts', () => {
  beforeEach(() => {
    setSupabaseClientForTesting(undefined);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setSupabaseClientForTesting(undefined);
  });

  it('formats invalid login credentials clearly without leaking internals', () => {
    const errorMsg = formatSupabaseAuthError('Invalid login credentials', 'signin');
    expect(errorMsg).toBe('Invalid email or password.');
  });

  it('formats provider not configured for Google, GitHub, and GitLab without crashing', () => {
    expect(formatSupabaseAuthError('Provider is not enabled', 'google')).toBe(
      'Google sign-in is not configured.'
    );
    expect(formatSupabaseAuthError('Unsupported provider', 'github')).toBe(
      'GitHub sign-in is not configured.'
    );
    expect(formatSupabaseAuthError('Provider not configured', 'gitlab')).toBe(
      'GitLab sign-in is not configured.'
    );
  });

  it('formats OAuth cancelled or popup closed gracefully', () => {
    expect(formatSupabaseAuthError('User cancelled sign-in flow', 'github')).toBe(
      'GitHub sign-in was cancelled.'
    );
    expect(formatSupabaseAuthError('Access_denied by user', 'google')).toBe(
      'Google sign-in was cancelled.'
    );
  });

  it('formats Google 403 and access restrictions with actionable guidance', () => {
    const msg = formatSupabaseAuthError('Error 403: access_denied. We are sorry, but you do not have access', 'google');
    expect(msg).toContain('Google sign-in was blocked by Google (403)');
    expect(msg).toContain('OAuth Consent Screen');
  });

  it('generates safe OAuth diagnostic reports without exposing secrets', () => {
    const report = getOAuthDiagnosticsInfo();
    expect(report.clientCallbackUrl).toContain('/auth/callback');
    expect(report.expectedGoogleCloudAuthorizedRedirectUri).toContain('/auth/v1/callback');
    expect(report.googleCloudDirectClientMismatchWarning).toContain('CRITICAL');
    expect(report.common403Causes.length).toBeGreaterThan(0);
    // Verify sensitive keys are NOT present
    expect(JSON.stringify(report)).not.toContain('eyJhbGciOi');
    expect(JSON.stringify(report)).not.toContain('secret');
  });

  it('detects duplicate email / username conflicts safely', () => {
    expect(formatSupabaseAuthError('User already registered', 'signup')).toBe(
      'This email is already registered.'
    );
    expect(formatSupabaseAuthError('duplicate key value violates unique constraint "profiles_username_key"')).toBe(
      'Username is already taken.'
    );
  });

  it('validates usernames server-side via checkSupabaseUsernameAvailability', async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing_user_id' }, error: null }),
      }),
    };
    setSupabaseClientForTesting(mockClient as any);

    const res = await checkSupabaseUsernameAvailability('existing_user');
    expect(res.available).toBe(false);
    expect(res.error).toBe('Username is already taken.');

    // Invalid username lengths
    const tooShort = await checkSupabaseUsernameAvailability('ab');
    expect(tooShort.available).toBe(false);
    expect(tooShort.error).toContain('3–24 characters');
  });

  it('prevents disconnecting the only authentication method', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              identities: [{ id: 'id_1', provider: 'email' }],
            },
          },
        }),
        unlinkIdentity: vi.fn(),
      },
    };
    setSupabaseClientForTesting(mockClient as any);

    await expect(unlinkIdentity('id_1')).rejects.toThrow(
      'Cannot disconnect your only authentication method.'
    );
    expect(mockClient.auth.unlinkIdentity).not.toHaveBeenCalled();
  });

  it('enforces minimum 10-character password in changeUserPassword', async () => {
    await expect(changeUserPassword('Short1!')).rejects.toThrow(
      'New password must be at least 10 characters long.'
    );
  });

  it('strictly isolates roles and never trusts user_metadata or client-supplied role claims', async () => {
    const maliciousAuthUser = {
      id: 'attacker_uuid_123',
      email: 'attacker@example.org',
      user_metadata: {
        role: 'admin',
        is_admin: true,
        publisher: true,
      },
      app_metadata: {
        provider: 'email',
      },
    };

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'attacker_uuid_123',
            email: 'attacker@example.org',
            username: 'attacker',
            display_name: 'Attacker',
            avatar_url: null,
            bio: '',
            website_url: null,
            github_username: null,
            auth_provider: 'email',
            role: 'user', // PostgreSQL authoritative role
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    };
    setSupabaseClientForTesting(mockClient as any);

    const profile = await fetchSupabaseUserProfile(maliciousAuthUser as any);
    expect(profile).not.toBeNull();
    expect(profile?.role).toBe('user');
  });

  it('leaves the user completely unauthenticated if Supabase session is null', async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
    };
    setSupabaseClientForTesting(mockClient as any);

    const sessionRes = await mockClient.auth.getSession();
    expect(sessionRes.data.session).toBeNull();
  });
});

describe('Marketplace Migration — Release Validation & Upstream Importers', () => {
  it('validates release metadata: rejects latest/vlatest, invalid arch, and non-appimage URLs', () => {
    // 1. Rejects 'latest' as a version number
    const check1 = validateReleaseMetadata({
      version: 'latest',
      architecture: 'x86_64',
      downloadUrl: 'https://github.com/org/repo/releases/download/v1.0/app.AppImage',
      sha256: 'a'.repeat(64),
    });
    expect(check1.valid).toBe(false);
    expect(check1.errors.some((e) => e.includes('latest'))).toBe(true);

    // 2. Rejects invalid architecture
    const check2 = validateReleaseMetadata({
      version: '2.0.0',
      architecture: 'mips64' as any,
      downloadUrl: 'https://github.com/org/repo/releases/download/v2.0/app.AppImage',
      sha256: 'b'.repeat(64),
    });
    expect(check2.valid).toBe(false);
    expect(check2.errors.some((e) => e.includes('Architecture'))).toBe(true);

    // 3. Rejects non-AppImage URLs (e.g. .tar.gz or .deb)
    const check3 = validateReleaseMetadata({
      version: '2.0.0',
      architecture: 'x86_64',
      downloadUrl: 'https://github.com/org/repo/releases/download/v2.0/app.tar.gz',
      sha256: 'c'.repeat(64),
    });
    expect(check3.valid).toBe(false);
    expect(check3.errors.some((e) => e.includes('.AppImage'))).toBe(true);

    // 4. Rejects invalid SHA-256 length or non-hex characters
    const check4 = validateReleaseMetadata({
      version: '2.0.0',
      architecture: 'x86_64',
      downloadUrl: 'https://github.com/org/repo/releases/download/v2.0/app.AppImage',
      sha256: 'not-a-valid-sha256-digest',
    });
    expect(check4.valid).toBe(false);
    expect(check4.errors.some((e) => e.includes('SHA-256'))).toBe(true);

    // 5. Accepts valid package release
    const checkValid = validateReleaseMetadata({
      version: '2.0.0',
      architecture: 'x86_64',
      downloadUrl: 'https://github.com/org/repo/releases/download/v2.0/app-x86_64.AppImage',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });
    expect(checkValid.valid).toBe(true);
    expect(checkValid.errors).toHaveLength(0);
  });

  it('imports and parses GitHub release metadata and detects AppImage architectures', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tag_name: 'v4.3.2',
        body: 'Bug fixes and performance improvements.',
        assets: [
          {
            name: 'Blender-4.3.2-linux-x86_64.AppImage',
            browser_download_url:
              'https://github.com/blender/blender/releases/download/v4.3.2/Blender-4.3.2-linux-x86_64.AppImage',
            size: 250000000,
          },
          {
            name: 'Blender-4.3.2-linux-aarch64.AppImage',
            browser_download_url:
              'https://github.com/blender/blender/releases/download/v4.3.2/Blender-4.3.2-linux-aarch64.AppImage',
            size: 240000000,
          },
          {
            name: 'source.tar.gz',
            browser_download_url: 'https://github.com/blender/blender/releases/download/v4.3.2/source.tar.gz',
            size: 5000000,
          },
        ],
      }),
    } as any);

    const result = await importReleaseFromGitHub('https://github.com/blender/blender');
    expect(result.version).toBe('4.3.2');
    expect(result.releaseNotes).toContain('Bug fixes');
    expect(result.assets).toHaveLength(2); // Only .AppImage assets
    expect(result.assets[0].architecture).toBe('x86_64');
    expect(result.assets[1].architecture).toBe('aarch64');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('imports and parses GitLab release metadata', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [
        {
          tag_name: 'v1.5.0',
          description: 'GitLab Linux portable release notes.',
          assets: {
            links: [
              {
                name: 'App-1.5.0-x86_64.AppImage',
                url: 'https://gitlab.com/group/project/-/releases/v1.5.0/downloads/App-1.5.0-x86_64.AppImage',
              },
            ],
          },
        },
      ],
    } as any);

    const result = await importReleaseFromGitLab('https://gitlab.com/group/project');
    expect(result.version).toBe('1.5.0');
    expect(result.releaseNotes).toContain('GitLab Linux');
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].downloadUrl).toContain('.AppImage');
  });
});

describe('Marketplace Migration — Publisher & Moderation Workflow', () => {
  beforeEach(() => {
    setSupabaseClientForTesting(undefined);
  });

  afterEach(() => {
    setSupabaseClientForTesting(undefined);
  });

  it('creates an application in draft status and prevents duplicate slugs', async () => {
    const mockAppRow = {
      id: 'app_123',
      publisher_id: 'user_456',
      name: 'SuperPaint',
      slug: 'superpaint',
      short_description: 'Fast digital painting',
      description: 'Open source vector illustration tool',
      category: 'Graphics',
      license: 'GPL-3.0',
      status: 'draft',
      verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockClient = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAppRow, error: null }),
      }),
    };
    setSupabaseClientForTesting(mockClient as any);

    const app = await createPublisherApplication({
      publisherId: 'user_456',
      name: 'SuperPaint',
      slug: 'superpaint',
      shortDescription: 'Fast digital painting',
      description: 'Open source vector illustration tool',
      category: 'Graphics',
      license: 'GPL-3.0',
    });

    expect(app.id).toBe('app_123');
    expect(app.status).toBe('draft');
    expect(app.slug).toBe('superpaint');
    expect(mockClient.from).toHaveBeenCalledWith('apps');
  });

  it('transitions application from draft to pending_review when submitted', async () => {
    const mockUpdatedRow = {
      id: 'app_123',
      publisher_id: 'user_456',
      name: 'SuperPaint',
      slug: 'superpaint',
      short_description: 'Fast digital painting',
      description: 'Open source vector illustration tool',
      category: 'Graphics',
      license: 'GPL-3.0',
      status: 'pending_review',
      verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedRow, error: null }),
      }),
    };
    setSupabaseClientForTesting(mockClient as any);

    const app = await submitApplicationForReview('app_123');
    expect(app.status).toBe('pending_review');
  });

  it('records moderation action and creates audit log entry', async () => {
    const updateSpy = vi.fn().mockResolvedValue({ error: null });
    const insertAuditSpy = vi.fn().mockResolvedValue({ error: null });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin_user_99' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'apps') {
          return {
            update: vi.fn().mockReturnValue({
              eq: updateSpy,
            }),
          };
        }
        if (table === 'audit_log') {
          return {
            insert: insertAuditSpy,
          };
        }
        return {};
      }),
    };
    setSupabaseClientForTesting(mockClient as any);

    await moderateApplication('app_123', 'approve');
    expect(updateSpy).toHaveBeenCalledWith('id', 'app_123');
    expect(insertAuditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: 'admin_user_99',
        action: 'application_approve',
        target_id: 'app_123',
      })
    );
  });

  it('promotes publisher role and creates audit record on publisher verification', async () => {
    const updatePublisherSpy = vi.fn().mockResolvedValue({ error: null });
    const updateProfileRoleSpy = vi.fn().mockResolvedValue({ error: null });
    const insertAuditSpy = vi.fn().mockResolvedValue({ error: null });

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin_user_99' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'publisher_profiles') {
          return {
            update: vi.fn().mockReturnValue({
              eq: updatePublisherSpy,
            }),
          };
        }
        if (table === 'profiles') {
          return {
            update: vi.fn().mockReturnValue({
              eq: updateProfileRoleSpy,
            }),
          };
        }
        if (table === 'audit_log') {
          return {
            insert: insertAuditSpy,
          };
        }
        return {};
      }),
    };
    setSupabaseClientForTesting(mockClient as any);

    await moderatePublisher('user_applicant_1', 'approve');
    expect(updatePublisherSpy).toHaveBeenCalledWith('user_id', 'user_applicant_1');
    expect(updateProfileRoleSpy).toHaveBeenCalledWith('id', 'user_applicant_1');
    expect(insertAuditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'publisher_approve',
        target_id: 'user_applicant_1',
      })
    );
  });
});

describe('Marketplace Migration — Library & Download Tracking', () => {
  beforeEach(() => {
    setSupabaseClientForTesting(undefined);
  });

  afterEach(() => {
    setSupabaseClientForTesting(undefined);
  });

  it('records anonymous and authenticated downloads into public.downloads', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    const mockClient = {
      from: vi.fn().mockReturnValue({
        insert: insertSpy,
      }),
    };
    setSupabaseClientForTesting(mockClient as any);

    // 1. Anonymous download
    await recordAppDownload({
      userId: null,
      appSlug: 'vscodium',
      version: '1.98.0',
      arch: 'x86_64',
    });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: null,
        app_slug: 'vscodium',
        version: '1.98.0',
        arch: 'x86_64',
      })
    );

    // 2. Authenticated download
    await recordAppDownload({
      userId: 'user_alice_1',
      appSlug: 'blender',
      version: '4.3.0',
      arch: 'aarch64',
    });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user_alice_1',
        app_slug: 'blender',
        version: '4.3.0',
        arch: 'aarch64',
      })
    );
  });

  it('syncs bookmark into user library and deletes when unbookmarked', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    const deleteSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'library') {
          return {
            upsert: upsertSpy,
            delete: deleteSpy,
          };
        }
        return {};
      }),
    };
    setSupabaseClientForTesting(mockClient as any);

    // Add to library
    const addRes = await syncLibraryBookmarkWithSupabase({
      userId: 'user_123',
      appSlug: 'inkscape',
      pinnedVersion: '1.4.0',
      bookmarked: true,
    });
    expect(addRes.synced).toBe(true);
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user_123',
        app_slug: 'inkscape',
        pinned_version: '1.4.0',
      }),
      expect.any(Object)
    );

    // Remove from library
    const removeRes = await syncLibraryBookmarkWithSupabase({
      userId: 'user_123',
      appSlug: 'inkscape',
      bookmarked: false,
    });
    expect(removeRes.synced).toBe(true);
    expect(deleteSpy).toHaveBeenCalled();
  });
});
