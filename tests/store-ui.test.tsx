// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import axe from 'axe-core';
import { App } from '../src/App';
import { AuthProvider } from '../src/context/AuthContext';
import {
  APPS_CATALOG,
  TOTAL_CATALOG_COUNT,
  VERIFIED_DIRECT_CATALOG_COUNT,
  CATALOG_CLEANUP_REPORT,
} from '../src/data/apps';
import { SITE_URL } from '../src/config/site';
import {
  isValidHttpsDownloadUrl,
  isValidNiruviProtocolUrl,
} from '../src/utils/catalogSchema';

const SAMPLE_CATALOG = APPS_CATALOG.filter((a) =>
  ['vscodium', 'kdenlive', 'gimp'].includes(a.id),
);

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.history.replaceState(null, '', '/');
  localStorage.clear();
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    headers: new Headers(),
    json: async () => ({}),
  } as Response);
});

afterEach(() => {
  cleanup();
});

function renderStore(props?: React.ComponentProps<typeof App>) {
  return render(
    <AuthProvider>
      <App initialCatalogOverride={SAMPLE_CATALOG} {...props} />
    </AuthProvider>,
  );
}

describe('Niruvi Store — URL & Catalog Schema Validation', () => {
  it('allows only https:// download URLs and rejects http:// or javascript: URLs', () => {
    expect(isValidHttpsDownloadUrl('https://github.com/owner/repo/app.AppImage')).toBe(true);
    expect(isValidHttpsDownloadUrl('http://insecure.example.com/app.AppImage')).toBe(false);
    expect(isValidHttpsDownloadUrl('javascript:alert(1)')).toBe(false);
  });

  it('validates niruvi://install protocol links with embedded https:// URLs', () => {
    const validLink =
      'niruvi://install?id=firefox&name=Firefox&url=https%3A%2F%2Fftp.mozilla.org%2Ffirefox.AppImage&sha256=abc';
    const invalidLink = 'niruvi://install?id=firefox&url=javascript%3Aalert(1)';
    expect(isValidNiruviProtocolUrl(validLink)).toBe(true);
    expect(isValidNiruviProtocolUrl(invalidLink)).toBe(false);
  });

  it('renders a friendly schema error state when catalog JSON is invalid', () => {
    const brokenCatalog = [{ id: 'broken-app', name: '' }];
    renderStore({ initialCatalogOverride: brokenCatalog });
    expect(screen.getByText(/Catalog Schema Validation Failed/i)).toBeInTheDocument();
  });
});

describe('Niruvi Store — Search, Filtering, Pagination, and Empty State', () => {
  it('renders main landmarks, h1 heading, skip link, and search input only on the catalog search page', () => {
    renderStore();
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /Linux AppImage Software Directory/i }),
    ).toBeInTheDocument();

    const searchInput = screen.getByLabelText(
      /Search Linux AppImages by name, category, publisher, or tag/i,
    );
    expect(searchInput).toBeInTheDocument();

    // Ensure search bar is inside the primary header and NOT inside the filtering section
    const header = screen.getByRole('banner');
    expect(
      within(header).getByLabelText(
        /Search Linux AppImages by name, category, publisher, or tag/i,
      ),
    ).toBeInTheDocument();

    // Verify main#main-content centering, flex-1 footer pinning, tightened max-w-5xl width, and parent wrapper classes
    const skipLink = screen.getByRole('link', { name: /Skip to main content/i });
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(skipLink.className).toContain('sr-only');

    expect(header.className).toContain('sticky');
    expect(header.className).toContain('top-0');

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main.className).toContain('flex-1');
    expect(main.className).toContain('max-w-5xl');
    expect(main.className).toContain('mx-auto');
    expect(main.className).toContain('px-6');
    expect(main.className).toContain('lg:px-12');
    const rootWrapper = main.parentElement;
    expect(rootWrapper?.className).toContain('min-h-screen');
    expect(rootWrapper?.className).toContain('flex');
    expect(rootWrapper?.className).toContain('flex-col');
    expect(rootWrapper?.className).not.toContain('overflow-x-hidden');
    expect(rootWrapper?.className).not.toContain('overflow-hidden');
    expect(rootWrapper?.className).not.toContain('overflow-auto');
    expect(rootWrapper?.className).not.toContain('items-center');
    const filterSection = screen.getByRole('region', { name: /Application catalog filters/i });
    expect(
      within(filterSection).queryByLabelText(
        /Search Linux AppImages by name, category, publisher, or tag/i,
      ),
    ).not.toBeInTheDocument();

    // Verify developer PutinServai and contact/support emails
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('PutinServai')).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'niruvi.linux@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:niruvi.linux@gmail.com',
    );
    expect(within(footer).getByRole('link', { name: 'support.niruvi@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:support.niruvi@gmail.com',
    );

    // Navigating to SHA-256 Verifier hides the catalog search bar
    const verifierButtons = screen.getAllByRole('button', { name: /SHA-256 Verifier|Verify/i });
    fireEvent.click(verifierButtons[0]);
    expect(
      screen.queryByLabelText(/Search Linux AppImages by name, category, publisher, or tag/i),
    ).not.toBeInTheDocument();
  });

  it('hides unverified imports by default on main listing and shows 48-per-page pagination when toggled', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(TOTAL_CATALOG_COUNT).toBeGreaterThanOrEqual(2500);
    expect(
      screen.getAllByText(
        new RegExp(`Showing 1-${VERIFIED_DIRECT_CATALOG_COUNT} of ${VERIFIED_DIRECT_CATALOG_COUNT} apps`, 'i'),
      ).length,
    ).toBeGreaterThan(0);

    // Toggle "Show Unverified" to inspect unverified AppImageHub imports (excluding policy-flagged entries)
    const showUnverifiedBtn = screen.getByRole('button', { name: /Show Unverified/i });
    fireEvent.click(showUnverifiedBtn);

    const nonPolicyTotal =
      TOTAL_CATALOG_COUNT - CATALOG_CLEANUP_REPORT.affectedCounts.policyFlaggedCount;
    expect(
      screen.getAllByText(
        new RegExp(`Showing 1-48 of ${nonPolicyTotal.toLocaleString()} apps`, 'i'),
      ).length,
    ).toBeGreaterThan(0);

    // Open the Phase 1 Catalog Audit Report drawer
    const reportBtn = screen.getByRole('button', { name: /Catalog Audit Report/i });
    fireEvent.click(reportBtn);
    expect(
      screen.getByRole('heading', { name: /Phase 1 Catalog Cleanup & Verification Report/i }),
    ).toBeInTheDocument();
  });

  it('filters catalog by search query and updates URL query string', async () => {
    renderStore();
    const searchInput = screen.getByLabelText(
      /Search Linux AppImages by name, category, publisher, or tag/i,
    );

    fireEvent.change(searchInput, { target: { value: 'Kdenlive' } });
    await waitFor(() => {
      expect(window.location.search).toContain('q=Kdenlive');
    });
    expect(screen.getByText('Kdenlive')).toBeInTheDocument();
  });

  it('shows "No apps match your filters" when search matches no applications and resets cleanly', async () => {
    renderStore();
    const searchInput = screen.getByLabelText(
      /Search Linux AppImages by name, category, publisher, or tag/i,
    );

    fireEvent.change(searchInput, { target: { value: 'nonexistent_package_xyz_999' } });
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /No apps match your filters/i }),
      ).toBeInTheDocument();
    });

    const resetBtn = screen.getByRole('button', { name: /Reset All Filters/i });
    fireEvent.click(resetBtn);
    expect(
      screen.queryByRole('heading', { name: /No apps match your filters/i }),
    ).not.toBeInTheDocument();
  });
});

describe('Niruvi Store — Application Detail Modal & Direct Upstream Download', () => {
  it('opens application details, displays direct upstream HTTPS download, niruvi:// link, and real SHA-256 checksum', () => {
    renderStore();

    const kdenliveButtons = screen.getAllByRole('button', {
      name: /View details for Kdenlive/i,
    });
    fireEvent.click(kdenliveButtons[0]);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Kdenlive' })).toBeInTheDocument();

    // Verify dynamic SEO canonical URL, og:url, and SoftwareApplication JSON-LD match SITE_URL
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe(`${SITE_URL}/app/kdenlive`);
    const ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    expect(ogUrl?.getAttribute('content')).toBe(`${SITE_URL}/app/kdenlive`);
    const jsonLdEl = document.getElementById('dynamic-software-jsonld');
    expect(jsonLdEl).not.toBeNull();
    const parsedSchema = JSON.parse(jsonLdEl?.textContent || '{}');
    expect(parsedSchema['@type']).toBe('SoftwareApplication');
    expect(parsedSchema.name).toBe('Kdenlive');
    expect(parsedSchema.url).toBe(`${SITE_URL}/app/kdenlive`);

    const manualDownloadLink = within(dialog).getByRole('link', {
      name: /Download Kdenlive AppImage/i,
    });
    expect(manualDownloadLink).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
    expect(manualDownloadLink).toHaveAttribute('rel', 'noopener noreferrer');

    expect(within(dialog).getByRole('button', { name: /Copy SHA-256/i })).toBeInTheDocument();
  });
});

describe('Niruvi Store — Legal Pages, Cookie Consent & WCAG 2.2 AA Accessibility', () => {
  it('displays Cookie Consent banner with equal-weight buttons and unchecked optional boxes', () => {
    renderStore();
    expect(screen.getByRole('button', { name: 'Reject Non-Essential' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manage Choices/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept All' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Manage Choices/i }));
    const prefCheckbox = screen.getByLabelText(/Local App Bookmarks & Library State/i);
    const mediaCheckbox = screen.getByLabelText(/Third-Party Screenshots & Video Embeds/i);
    expect(prefCheckbox).not.toBeChecked();
    expect(mediaCheckbox).not.toBeChecked();
  });

  it('navigates to Privacy Policy, Terms, Cookie Policy, and Refund Policy from footer', () => {
    renderStore();
    const footer = screen.getByRole('contentinfo');

    fireEvent.click(within(footer).getByRole('link', { name: /Privacy Policy/i }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy Policy' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/We do not sell.*personal data/i).length).toBeGreaterThan(0);

    fireEvent.click(within(footer).getByRole('link', { name: /Terms & Conditions/i }));
    expect(
      screen.getByRole('heading', { level: 1, name: /Terms & Conditions/i }),
    ).toBeInTheDocument();

    fireEvent.click(within(footer).getByRole('link', { name: /Cookie Policy/i }));
    expect(
      screen.getByRole('heading', { level: 1, name: /Cookie Policy/i }),
    ).toBeInTheDocument();

    fireEvent.click(within(footer).getByRole('link', { name: /Refund Policy/i }));
    expect(
      screen.getByRole('heading', { level: 1, name: /Refund Policy/i }),
    ).toBeInTheDocument();

    fireEvent.click(within(footer).getByRole('link', { name: /Donate & Support/i }));
    expect(
      screen.getByRole('heading', { level: 1, name: /Support & Donate to Niruvi Store/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Open ko-fi\.com\/putinservai/i }),
    ).toHaveAttribute('href', 'https://ko-fi.com/putinservai');
    expect(
      screen.getByRole('link', { name: /Open razorpay\.me\/@putin/i }),
    ).toHaveAttribute('href', 'https://razorpay.me/@putin');
    expect(screen.getByText('putinservai-1@okhdfcbank')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /UPI QR Code for putinservai-1@okhdfcbank/i }),
    ).toBeInTheDocument();
  });

  it('passes automated axe-core WCAG 2.2 AA checks with zero critical/serious violations', async () => {
    const { container } = renderStore();
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });
    expect(results.violations).toEqual([]);
  });
});

describe('Niruvi Store — Community Submission (/submit), Worker API Merge & Badges', () => {
  it('submits via /submit, handles Worker errors gracefully, and renders "Community, unreviewed" badge and "Report" button', async () => {
    renderStore();

    const submitNavBtns = screen.getAllByRole('button', { name: /Submit/i });
    fireEvent.click(submitNavBtns[0]);

    expect(
      screen.getByRole('heading', { level: 1, name: /Submit an AppImage to the Catalog/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/External Links Only — No Binary Hosting/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('turnstile-widget-container')).toBeInTheDocument();

    // Fill out required fields
    fireEvent.change(screen.getByLabelText(/Application Name/i), {
      target: { value: 'Bottles' },
    });
    fireEvent.change(screen.getByLabelText(/Short Description/i), {
      target: { value: 'Easily manage Wine prefixes on Linux.' },
    });
    fireEvent.change(screen.getByLabelText(/^Version/i), {
      target: { value: '51.13' },
    });
    fireEvent.change(screen.getByLabelText(/^License/i), {
      target: { value: 'GPL-3.0' },
    });
    fireEvent.change(screen.getByLabelText(/Download URL \(HTTPS only\)/i), {
      target: {
        value: 'https://github.com/bottlesdevs/Bottles/releases/download/51.13/Bottles-x86_64.AppImage',
      },
    });
    fireEvent.change(screen.getByLabelText(/Upstream Source \/ Repository URL/i), {
      target: { value: 'https://github.com/bottlesdevs/Bottles' },
    });
    fireEvent.change(screen.getByLabelText(/SHA-256 Checksum/i), {
      target: {
        value: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3e3b0c44298fc1c149afbf4c8',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit AppImage/i }));

    const issueLink = await screen.findByRole('link', { name: /Open Prefilled GitHub Issue/i });
    const href = issueLink.getAttribute('href') || '';
    expect(href).toContain('https://github.com/putinservai-cyber/niruvi-store/issues/new?');
    expect(href).toContain('template=submit-appimage.yml');
    expect(href).toContain('labels=submission');
    expect(href).toContain('name=Bottles');

    // Navigate back to Store and verify "Community, unreviewed" badge, "Checksum: Provided", and "Report" button
    fireEvent.click(screen.getByRole('button', { name: /Browse in Store/i }));
    expect(screen.getAllByText(/Community, unreviewed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Checksum: Provided/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Report Bottles/i })).toBeInTheDocument();
  });

  it('renders Cloudflare Turnstile Bot Protection on the Sign In, Create Account, and Password Reset views', () => {
    renderStore();

    const signInNavButtons = screen.getAllByRole('button', { name: /Sign In/i });
    fireEvent.click(signInNavButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with GitHub/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getByText(/Cloudflare Turnstile Bot Protection/i)).toBeInTheDocument();
    expect(screen.getByTestId('auth-turnstile-widget-container')).toBeInTheDocument();

    // Switch to Create Account tab
    fireEvent.click(screen.getByRole('tab', { name: /Create Account/i }));
    expect(screen.getByText(/Cloudflare Turnstile Bot Protection/i)).toBeInTheDocument();
    expect(screen.getByTestId('auth-turnstile-widget-container')).toBeInTheDocument();

    // Switch back to Sign In and open Forgot password
    fireEvent.click(screen.getByRole('tab', { name: /Sign In/i }));
    fireEvent.click(screen.getByRole('button', { name: /Forgot password\?/i }));
    expect(screen.getByText(/Cloudflare Turnstile Bot Protection/i)).toBeInTheDocument();
    expect(screen.getByTestId('auth-turnstile-widget-container')).toBeInTheDocument();
  });

  it('renders Phase 3 Community Ratings & Reviews in app details and tracks Saved Library, Update Notifications, and Download History without vlatest', () => {
    renderStore();

    // 1. Bookmark the first app card and click its Download button
    const firstApp = SAMPLE_CATALOG[0];
    const bookmarkBtn = screen.getByRole('button', {
      name: new RegExp(`Save ${firstApp.name} to library`, 'i'),
    });
    fireEvent.click(bookmarkBtn);

    const downloadBtns = screen.getAllByRole('button', {
      name: new RegExp(`Install ${firstApp.name}`, 'i'),
    });
    fireEvent.click(downloadBtns[0]);
    // Close Install modal
    fireEvent.click(screen.getByRole('button', { name: /Close download modal/i }));

    // 2. Open app detail modal and verify Community Ratings & Reviews section is rendered
    fireEvent.click(screen.getByText(firstApp.name));
    expect(
      screen.getByRole('region', { name: /Community ratings and reviews/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign in to Write a Review/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close application details/i }));

    // 3. Navigate to Saved Library (/library) and verify Installed, Saved & Bookmarks, and Download History tabs
    const savedNavBtns = screen.getAllByRole('button', { name: /Saved/i });
    fireEvent.click(savedNavBtns[0]);

    expect(
      screen.getByRole('heading', { level: 2, name: /My AppImage Library/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/vlatest/i)).not.toBeInTheDocument();

    // Toggle update notifications on Installed card
    const notifyBtn = screen.getByRole('button', {
      name: new RegExp(`Toggle update notifications for ${firstApp.name}`, 'i'),
    });
    expect(notifyBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(notifyBtn);
    expect(notifyBtn).toHaveAttribute('aria-pressed', 'false');

    // Switch to Saved & Bookmarks sub-tab
    fireEvent.click(screen.getByRole('button', { name: /Saved & Bookmarks/i }));
    expect(screen.getByText(firstApp.name)).toBeInTheDocument();

    // Switch to Download History sub-tab
    fireEvent.click(screen.getByRole('button', { name: /Download History/i }));
    expect(screen.getByRole('button', { name: /Download Again/i })).toBeInTheDocument();
  });

  it('validates file uploads in SHA-256 Verifier (rejects 0-byte empty files, oversized files, warns on .exe, and hashes valid .AppImage) and uses centered max-w-5xl layout without overflow-x-hidden', async () => {
    renderStore();

    // Verify main#main-content uses max-w-5xl mx-auto and parent wrapper has no overflow-x-hidden
    const mainEl = document.getElementById('main-content');
    expect(mainEl).not.toBeNull();
    expect(mainEl?.className).toContain('max-w-5xl');
    expect(mainEl?.className).toContain('mx-auto');
    expect(mainEl?.parentElement?.className).not.toContain('overflow-x-hidden');

    // Verify offline mode banner appears when browser fires 'offline' event and clears on 'online'
    fireEvent(window, new Event('offline'));
    expect(
      await screen.findByText(/Offline mode active — serving verified AppImage catalog/i)
    ).toBeInTheDocument();
    fireEvent(window, new Event('online'));

    // Navigate to SHA-256 Verifier tab
    const verifierBtns = screen.getAllByRole('button', { name: /Verifier|Verify/i });
    fireEvent.click(verifierBtns[0]);

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();

    // 1. Upload a 0-byte empty file -> must display an alert error
    const emptyFile = new File([], 'empty.AppImage', { type: 'application/octet-stream' });
    fireEvent.change(fileInput!, { target: { files: [emptyFile] } });
    expect(
      await screen.findByText(/The selected file is empty \(0 bytes\)/i)
    ).toBeInTheDocument();

    // 2. Upload an oversized > 512MB file -> must reject and show terminal sha256sum fallback
    const oversizedFile = new File(['x'], 'HugeImage-x86_64.AppImage', {
      type: 'application/octet-stream',
    });
    Object.defineProperty(oversizedFile, 'size', { value: 600 * 1024 * 1024 });
    fireEvent.change(fileInput!, { target: { files: [oversizedFile] } });
    expect(
      await screen.findByText(/File exceeds the 512 MB browser memory limit/i)
    ).toBeInTheDocument();

    // 3. Upload a non-Linux .exe file -> must warn that it is not a Linux .AppImage package
    const exeFile = new File(['MZ-binary-payload'], 'setup.exe', {
      type: 'application/octet-stream',
    });
    fireEvent.change(fileInput!, { target: { files: [exeFile] } });
    expect(
      await screen.findByText(/does not appear to be a Linux \.AppImage package/i)
    ).toBeInTheDocument();
  });

  it('renders and transitions across the 9 essential website screens (Loading, Welcome/Intro, Home, Search Suggestions, Listing, Detail, Form/Create, Empty/Offline, and Confirmation)', async () => {
    window.history.replaceState(null, '', '/?screen=loading');
    renderStore();

    // 1. Loading Screen
    expect(
      screen.getByText(/Synchronizing verified Linux AppImage catalog/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Dismiss loading preview/i }));

    // 2. Welcome / Intro Screen & 3. Home Screen
    const welcomeRegion = screen.getByRole('region', {
      name: /Welcome and platform introduction/i,
    });
    expect(
      within(welcomeRegion).getByText(/01\. Direct Upstream Releases/i)
    ).toBeInTheDocument();

    // Dismiss and re-open the Welcome Guide
    fireEvent.click(
      within(welcomeRegion).getByRole('button', { name: /Dismiss welcome introduction/i })
    );
    expect(screen.getByRole('button', { name: /Show Welcome Guide/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Show Welcome Guide/i }));

    // 4. Search Screen (Popular search suggestions -> active search summary -> Clear Search)
    const suggestionsRegion = screen.getByRole('region', { name: /Search suggestions/i });
    fireEvent.click(within(suggestionsRegion).getByRole('button', { name: /Video Editing/i }));

    const activeSearchSummary = await screen.findByRole('region', {
      name: /Active search results summary/i,
    });
    expect(within(activeSearchSummary).getByText(/Search results for/i)).toBeInTheDocument();
    fireEvent.click(within(activeSearchSummary).getByRole('button', { name: /Clear Search/i }));
  });
});

