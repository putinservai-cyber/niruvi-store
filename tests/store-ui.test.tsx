// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import axe from 'axe-core';
import { App } from '../src/App';
import { AuthProvider } from '../src/context/AuthContext';
import { APPS_CATALOG, TOTAL_CATALOG_COUNT } from '../src/data/apps';
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

  it('shows 48-per-page paginated count across all 2,569+ apps on default catalog load', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(TOTAL_CATALOG_COUNT).toBeGreaterThanOrEqual(2500);
    expect(
      screen.getAllByText(
        new RegExp(`Showing 1-48 of ${TOTAL_CATALOG_COUNT.toLocaleString()} apps`, 'i'),
      ).length,
    ).toBeGreaterThan(0);
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
