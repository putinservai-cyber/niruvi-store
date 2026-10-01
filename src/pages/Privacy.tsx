import React, { useState } from 'react';
import { ShieldCheck, Trash2, Check, ArrowLeft, Settings } from 'lucide-react';
import { CONSENT_STORAGE_KEY } from '../components/CookieConsent';

interface PrivacyPageProps {
  onBackToStore: () => void;
  onOpenCookieSettings: () => void;
}

export const Privacy: React.FC<PrivacyPageProps> = ({
  onBackToStore,
  onOpenCookieSettings,
}) => {
  const [clearedSuccess, setClearedSuccess] = useState(false);

  const handleClearAllLocalData = () => {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      localStorage.removeItem('niruvi_installed_apps');
      localStorage.removeItem('niruvi_bookmarked_apps');
      localStorage.removeItem('niruvi_custom_apps');
      setClearedSuccess(true);
      setTimeout(() => setClearedSuccess(false), 4000);
    } catch (err) {
      console.warn('Failed to clear local storage:', err);
    }
  };

  return (
    <article className="max-w-4xl mx-auto space-y-8 py-4 text-neutral-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToStore}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to App Catalog</span>
        </button>

        <span className="text-xs font-mono text-neutral-400">
          Last Updated: [LAST UPDATED DATE]
        </span>
      </div>

      {/* Template Legal Review Banner */}
      <div
        role="note"
        aria-label="Legal template notice"
        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed"
      >
        <strong>Legal Template Notice:</strong> This Privacy Policy is a plain-English template
        tailored to Niruvi Store&apos;s static GitHub Pages architecture. Replace bracketed
        placeholders (<code className="font-mono">[OWNER NAME]</code>,{' '}
        <code className="font-mono">[CONTACT EMAIL]</code>,{' '}
        <code className="font-mono">[COUNTRY/JURISDICTION]</code>,{' '}
        <code className="font-mono">[LAST UPDATED DATE]</code>) and have this document reviewed by a
        qualified legal professional for compliance with GDPR/UK GDPR, India&apos;s Digital Personal
        Data Protection (DPDP) Act 2023, and CCPA/CPRA.
      </div>

      <header className="space-y-3 border-b border-neutral-800 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Privacy &amp; Data Transparency</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Niruvi Store (<code className="font-mono text-sky-400">https://niruvi-store.runs-on.dev</code>, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), operated by{' '}
          <strong>[OWNER NAME]</strong> under the laws of <strong>[COUNTRY/JURISDICTION]</strong>,
          is a static, open-source Linux AppImage directory hosted on GitHub Pages. We designed
          Niruvi Store to work without mandatory user accounts, tracking pixels, or advertising
          networks.
        </p>
        <p className="text-sm font-bold text-emerald-400">
          We do not sell, rent, or trade your personal data to any third party.
        </p>
      </header>

      {/* STEP 4: What User Data We Collect Table */}
      <section aria-labelledby="what-data-we-collect" className="space-y-4">
        <h2 id="what-data-we-collect" className="text-xl font-bold text-white">
          1. What User Data We Collect
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          The table below lists every category of data processed when you browse Niruvi Store, why
          it is processed, where it lives, how long it is kept, and who has access to it:
        </p>

        <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/60">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950 text-white">
                <th scope="col" className="p-3.5 font-bold">Data</th>
                <th scope="col" className="p-3.5 font-bold">Why</th>
                <th scope="col" className="p-3.5 font-bold">Where Stored</th>
                <th scope="col" className="p-3.5 font-bold">How Long</th>
                <th scope="col" className="p-3.5 font-bold">Who Can See It</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              <tr>
                <td className="p-3.5 font-semibold text-white">
                  IP Address &amp; HTTP Request Logs (User-Agent, Referrer, Timestamp)
                </td>
                <td className="p-3.5">
                  Delivering static HTML/CSS/JS files over HTTPS and DDoS/security mitigation
                </td>
                <td className="p-3.5">
                  GitHub Pages / Fastly CDN infrastructure (GitHub, Inc.)
                </td>
                <td className="p-3.5">
                  Transient CDN logs per GitHub&apos;s Privacy Statement
                </td>
                <td className="p-3.5">
                  GitHub, Inc. (infrastructure host). Not accessible to [OWNER NAME].
                </td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">
                  Cookie / Privacy Consent Preference (<code className="font-mono">niruvi_cookie_consent_v1</code>)
                </td>
                <td className="p-3.5">
                  Remembers your Accept, Reject, or custom consent settings
                </td>
                <td className="p-3.5">
                  Your browser&apos;s <code className="font-mono">localStorage</code> (on your device only)
                </td>
                <td className="p-3.5">
                  Until you clear browser data or click &ldquo;Clear Local Data&rdquo; below
                </td>
                <td className="p-3.5">
                  Only you on your local device
                </td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">
                  App Bookmarks, Installed Tracker &amp; Custom Test Entries
                </td>
                <td className="p-3.5">
                  Lets you bookmark apps and test custom AppImage metadata locally
                </td>
                <td className="p-3.5">
                  Your browser&apos;s <code className="font-mono">localStorage</code> (on your device only)
                </td>
                <td className="p-3.5">
                  Until you remove them or clear browser storage
                </td>
                <td className="p-3.5">
                  Only you on your local device
                </td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">
                  Search Queries &amp; Category Filters
                </td>
                <td className="p-3.5">
                  Filters the static JSON catalog in your browser memory and updates the shareable URL
                </td>
                <td className="p-3.5">
                  Browser memory &amp; URL query string (not logged to a backend database)
                </td>
                <td className="p-3.5">
                  Current browsing session only
                </td>
                <td className="p-3.5">
                  Only you (and anyone with whom you manually share a filtered URL)
                </td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold text-white">
                  App Submission / Test Form Inputs
                </td>
                <td className="p-3.5">
                  Validates AppImage parameters and saves to your local test catalog after explicit consent
                </td>
                <td className="p-3.5">
                  Your browser&apos;s <code className="font-mono">localStorage</code> (or GitHub API if you import a public repo URL)
                </td>
                <td className="p-3.5">
                  Until cleared by you
                </td>
                <td className="p-3.5">
                  Only you (unless you publicly submit a pull request or issue on GitHub)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Third-Party Services & External Downloads */}
      <section aria-labelledby="third-party-services" className="space-y-3">
        <h2 id="third-party-services" className="text-xl font-bold text-white">
          2. Third-Party Hosts, Downloads &amp; Embeds
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Niruvi Store self-hosts its application catalog metadata and UI icons. We do{' '}
          <strong>not</strong> load Google Fonts, third-party analytics scripts, or unconsented
          iframes on page load. Third-party connections occur only in the following situations:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm text-neutral-300">
          <li>
            <strong>GitHub Pages (Hosting Provider):</strong> Serves the static web application.
            Governed by the{' '}
            <a
              href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-sky-400 hover:text-sky-300"
            >
              GitHub Privacy Statement
            </a>
            .
          </li>
          <li>
            <strong>Direct AppImage Downloads (GitHub Releases, GitLab Releases, Publisher Mirrors):</strong>{' '}
            When you click an external download link or trigger <code className="font-mono">niruvi://install</code>,
            your browser or desktop client connects directly to the upstream release host (such as{' '}
            <code className="font-mono">github.com</code> or the publisher&apos;s HTTPS domain) to download the binary.
          </li>
          <li>
            <strong>GitHub / GitLab Auto-Importer (Submit App Page):</strong> Only when you paste a
            repository URL and click &ldquo;Import Release&rdquo;, your browser queries the public
            GitHub or GitLab REST API directly to prefill release metadata.
          </li>
          <li>
            <strong>Click-to-Load External Media:</strong> Any external screenshot or video preview
            is blocked by default behind a privacy placeholder that names the host and only loads
            after you explicitly opt in.
          </li>
        </ul>
      </section>

      {/* User Rights & Instant Data Controls */}
      <section aria-labelledby="user-privacy-rights" className="space-y-4">
        <h2 id="user-privacy-rights" className="text-xl font-bold text-white">
          3. Your Privacy Rights (GDPR, UK GDPR, India DPDP Act &amp; CCPA)
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Depending on your jurisdiction, you have the right to access, correct, delete, or export
          your data, and to withdraw consent at any time without penalty:
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm text-neutral-300">
          <li>
            <strong>Right to Withdraw Consent:</strong> Click &ldquo;Cookie Settings&rdquo; below or
            in the site footer at any time to change or revoke your storage and media preferences.
          </li>
          <li>
            <strong>Right to Erasure / Deletion:</strong> Because your bookmarks, installed app
            records, and consent choices are stored locally in your browser, you can erase them
            instantly using the button below.
          </li>
          <li>
            <strong>Right to Access &amp; Portability:</strong> You can inspect or export your
            locally added catalog JSON entries using the &ldquo;Export JSON&rdquo; tool in the
            navigation bar.
          </li>
        </ul>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onOpenCookieSettings}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <span>Open Cookie &amp; Consent Settings</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllLocalData}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 border border-rose-700/60 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-400" aria-hidden="true" />
            <span>Delete All Local Browser Data Now</span>
          </button>
        </div>

        {clearedSuccess && (
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>All Niruvi Store local browser storage items have been permanently deleted.</span>
          </p>
        )}
      </section>

      {/* Contact */}
      <section aria-labelledby="privacy-contact" className="space-y-2 border-t border-neutral-800 pt-6">
        <h2 id="privacy-contact" className="text-xl font-bold text-white">
          4. Contact &amp; Data Protection Inquiries
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          For any privacy questions, data subject requests, or security disclosures, please contact{' '}
          <strong>[OWNER NAME]</strong> at{' '}
          <a
            href="mailto:[CONTACT EMAIL]"
            className="underline text-sky-400 hover:text-sky-300 font-mono"
          >
            [CONTACT EMAIL]
          </a>{' '}
          (Jurisdiction: <strong>[COUNTRY/JURISDICTION]</strong>).
        </p>
      </section>
    </article>
  );
};
