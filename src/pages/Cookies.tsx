import React from 'react';
import { Cookie, ArrowLeft, Settings } from 'lucide-react';
import { CONSENT_STORAGE_KEY } from '../components/CookieConsent';

interface CookiesPageProps {
  onBackToStore: () => void;
  onOpenCookieSettings: () => void;
}

export const Cookies: React.FC<CookiesPageProps> = ({
  onBackToStore,
  onOpenCookieSettings,
}) => {
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

      <div
        role="note"
        aria-label="Legal template notice"
        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed"
      >
        <strong>Legal Template Notice:</strong> This Cookie &amp; Storage Policy is a template
        tailored to Niruvi Store&apos;s actual browser storage usage. Replace{' '}
        <code className="font-mono">[OWNER NAME]</code>,{' '}
        <code className="font-mono">[CONTACT EMAIL]</code>,{' '}
        <code className="font-mono">[COUNTRY/JURISDICTION]</code>, and{' '}
        <code className="font-mono">[LAST UPDATED DATE]</code> and consult a qualified lawyer.
      </div>

      <header className="space-y-3 border-b border-neutral-800 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
          <Cookie className="w-4 h-4" aria-hidden="true" />
          <span>Cookie &amp; Browser Storage Transparency</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Cookie Policy</h1>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Niruvi Store (<code className="font-mono text-sky-400">https://niruvi-store.runs-on.dev</code>), operated by <strong>[OWNER NAME]</strong>, is a static web application
          hosted on GitHub Pages.{' '}
          <strong>
            We do not set any advertising, cross-site tracking, or third-party analytics HTTP
            cookies.
          </strong>{' '}
          Instead, we use standard browser <code className="font-mono">localStorage</code> strictly
          on your own device to remember your privacy choices and optional local app bookmarks.
        </p>
      </header>

      <section aria-labelledby="storage-inventory" className="space-y-4">
        <h2 id="storage-inventory" className="text-xl font-bold text-white">
          1. Complete Inventory of Browser Storage Items Used
        </h2>

        <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/60">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950 text-white">
                <th scope="col" className="p-3.5 font-bold">Key Name</th>
                <th scope="col" className="p-3.5 font-bold">Mechanism</th>
                <th scope="col" className="p-3.5 font-bold">Category</th>
                <th scope="col" className="p-3.5 font-bold">Purpose</th>
                <th scope="col" className="p-3.5 font-bold">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              <tr>
                <td className="p-3.5 font-mono text-white">{CONSENT_STORAGE_KEY}</td>
                <td className="p-3.5">localStorage</td>
                <td className="p-3.5 text-emerald-400 font-semibold">Strictly Necessary</td>
                <td className="p-3.5">
                  Stores your consent decision (Accept / Reject / Custom), schema version, and ISO
                  timestamp so the banner does not reappear on every page refresh.
                </td>
                <td className="p-3.5">Until cleared or updated</td>
              </tr>
              <tr>
                <td className="p-3.5 font-mono text-white">niruvi_bookmarked_apps</td>
                <td className="p-3.5">localStorage</td>
                <td className="p-3.5 text-sky-400 font-semibold">Functional / Preferences</td>
                <td className="p-3.5">
                  Stores the list of AppImage IDs you star/bookmark for quick access in &ldquo;My
                  Library&rdquo;.
                </td>
                <td className="p-3.5">Until you unbookmark or clear storage</td>
              </tr>
              <tr>
                <td className="p-3.5 font-mono text-white">niruvi_installed_apps</td>
                <td className="p-3.5">localStorage</td>
                <td className="p-3.5 text-sky-400 font-semibold">Functional / Preferences</td>
                <td className="p-3.5">
                  Tracks which AppImages you marked as installed locally so the UI can show
                  version/install badges.
                </td>
                <td className="p-3.5">Until removed in My Library or cleared</td>
              </tr>
              <tr>
                <td className="p-3.5 font-mono text-white">niruvi_custom_apps</td>
                <td className="p-3.5">localStorage</td>
                <td className="p-3.5 text-sky-400 font-semibold">Functional / Preferences</td>
                <td className="p-3.5">
                  Stores custom AppImage metadata entries you test on the &ldquo;Submit App&rdquo;
                  page locally in your browser.
                </td>
                <td className="p-3.5">Until cleared by user</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="cookies-third-party" className="space-y-3">
        <h2 id="cookies-third-party" className="text-xl font-bold text-white">
          2. Third-Party Cookies &amp; External Resources
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          We self-host our UI typography and catalog icons so no third-party font CDNs (such as
          Google Fonts) are contacted when you load Niruvi Store. External connections to{' '}
          <code className="font-mono">github.com</code> or{' '}
          <code className="font-mono">gitlab.com</code> occur only when you explicitly download a
          release binary or opt in to load external media.
        </p>
      </section>

      <section aria-labelledby="cookies-manage" className="space-y-4 border-t border-neutral-800 pt-6">
        <h2 id="cookies-manage" className="text-xl font-bold text-white">
          3. How to Change or Withdraw Your Consent
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          You can review, change, or withdraw your storage and external-media consent at any time
          using the button below or the &ldquo;Cookie Settings&rdquo; link in the footer of every
          page.
        </p>
        <button
          type="button"
          onClick={onOpenCookieSettings}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span>Manage Cookie &amp; Storage Settings</span>
        </button>
      </section>
    </article>
  );
};
