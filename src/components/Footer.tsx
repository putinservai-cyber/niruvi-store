import React from 'react';
import { ShieldCheck, Settings, ExternalLink, Scale, Cookie, Receipt, FileText } from 'lucide-react';
import { NiruviLogo } from './NiruviLogo';

export type LegalRoute = 'store' | 'privacy' | 'terms' | 'cookies' | 'refunds';

interface FooterProps {
  currentRoute: string;
  onNavigate: (route: LegalRoute) => void;
  onOpenCookieSettings: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  currentRoute,
  onNavigate,
  onOpenCookieSettings,
}) => {
  return (
    <footer
      role="contentinfo"
      aria-label="Site footer and data collection summary"
      className="border-t border-neutral-800 bg-neutral-950/90 mt-16 py-12 text-xs text-neutral-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Top Row: Brand + Legal Navigation + Cookie Settings */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <NiruviLogo className="w-7 h-7" />
            <div>
              <span className="text-sm font-bold text-white block">Niruvi Linux Store</span>
              <span className="text-xs text-neutral-400">
                Static AppImage Directory • Cryptographic SHA-256 Verification • GPL-3.0 Licensed
              </span>
            </div>
          </div>

          <nav aria-label="Legal and privacy links" className="flex flex-wrap items-center gap-2">
            <a
              href="#/privacy"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('privacy');
              }}
              aria-current={currentRoute === 'privacy' ? 'page' : undefined}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border inline-flex items-center gap-1.5 font-semibold transition-colors ${
                currentRoute === 'privacy'
                  ? 'bg-white text-black border-white'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Privacy Policy</span>
            </a>

            <a
              href="#/terms"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('terms');
              }}
              aria-current={currentRoute === 'terms' ? 'page' : undefined}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border inline-flex items-center gap-1.5 font-semibold transition-colors ${
                currentRoute === 'terms'
                  ? 'bg-white text-black border-white'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
              }`}
            >
              <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Terms &amp; Conditions</span>
            </a>

            <a
              href="#/cookies"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('cookies');
              }}
              aria-current={currentRoute === 'cookies' ? 'page' : undefined}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border inline-flex items-center gap-1.5 font-semibold transition-colors ${
                currentRoute === 'cookies'
                  ? 'bg-white text-black border-white'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
              }`}
            >
              <Cookie className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cookie Policy</span>
            </a>

            <a
              href="#/refunds"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('refunds');
              }}
              aria-current={currentRoute === 'refunds' ? 'page' : undefined}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border inline-flex items-center gap-1.5 font-semibold transition-colors ${
                currentRoute === 'refunds'
                  ? 'bg-white text-black border-white'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Refund Policy</span>
            </a>

            <button
              type="button"
              onClick={onOpenCookieSettings}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 inline-flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              <span>Cookie Settings</span>
            </button>
          </nav>
        </div>

        {/* STEP 4: Compact "What User Data We Collect" Footer Summary Table */}
        <section
          aria-labelledby="footer-data-summary-heading"
          className="p-4 sm:p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="footer-data-summary-heading"
              className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>What User Data We Collect — Summary</span>
            </h2>
            <span className="text-xs font-semibold text-emerald-400">
              We do not sell your personal data.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-white">
                  <th scope="col" className="py-2 pr-4 font-semibold">Data</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Why</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Where Stored</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">How Long</th>
                  <th scope="col" className="py-2 font-semibold">Who Can See It</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70 text-neutral-300">
                <tr>
                  <td className="py-2 pr-4 font-medium text-white">IP &amp; Request Logs</td>
                  <td className="py-2 pr-4">Static site delivery &amp; security</td>
                  <td className="py-2 pr-4">GitHub Pages CDN</td>
                  <td className="py-2 pr-4">Transient per GitHub policy</td>
                  <td className="py-2">GitHub, Inc.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-white">Consent &amp; Bookmarks</td>
                  <td className="py-2 pr-4">Remember choices &amp; starred apps</td>
                  <td className="py-2 pr-4">Browser localStorage</td>
                  <td className="py-2 pr-4">Until cleared by you</td>
                  <td className="py-2">Only you on your device</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-white">Search &amp; Filters</td>
                  <td className="py-2 pr-4">Filter catalog &amp; shareable URLs</td>
                  <td className="py-2 pr-4">URL query string in memory</td>
                  <td className="py-2 pr-4">Current session only</td>
                  <td className="py-2">Only you</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom Row: Copyright & Upstream Attribution */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-neutral-800/80 text-neutral-400">
          <p>
            Store code licensed under{' '}
            <a
              href="https://www.gnu.org/licenses/gpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-neutral-200 hover:text-white inline-flex items-center gap-1"
            >
              <span>GPL-3.0</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
            . Individual AppImage packages are provided &ldquo;as is&rdquo; under their respective
            publisher licenses.
          </p>
          <p className="font-mono">
            Contact:{' '}
            <a href="mailto:[CONTACT EMAIL]" className="underline text-neutral-200 hover:text-white">
              [CONTACT EMAIL]
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
