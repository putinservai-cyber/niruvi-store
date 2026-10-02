import React from 'react';
import {
  Settings,
  ExternalLink,
  Scale,
  Cookie,
  Receipt,
  FileText,
  Mail,
  Code2,
  Heart,
} from 'lucide-react';
import { NiruviLogo } from './NiruviLogo';
import { DEVELOPER_NAME, CONTACT_EMAIL, SUPPORT_EMAIL } from '../config/site';

export type LegalRoute = 'store' | 'donate' | 'privacy' | 'terms' | 'cookies' | 'refunds';

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
      aria-label="Site footer"
      className="w-full border-t border-neutral-800 bg-neutral-950 mt-16 py-10 text-xs text-neutral-400"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-3">
            <NiruviLogo className="w-7 h-7 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="text-sm font-semibold text-white block">Niruvi Store</span>
              <span className="text-xs text-neutral-400">
                Linux AppImage Catalog · Upstream Author Releases · AppImageHub Feed
              </span>
            </div>
          </div>

          <nav aria-label="Legal and privacy links" className="flex flex-wrap items-center gap-2">
            <a
              href="#/donate"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('donate');
              }}
              aria-current={currentRoute === 'donate' ? 'page' : undefined}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 font-medium transition-colors ${
                currentRoute === 'donate'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
              <span>Donate &amp; Support</span>
            </a>

            <a
              href="#/privacy"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('privacy');
              }}
              aria-current={currentRoute === 'privacy' ? 'page' : undefined}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 font-medium transition-colors ${
                currentRoute === 'privacy'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
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
              className={`min-h-[38px] px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 font-medium transition-colors ${
                currentRoute === 'terms'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
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
              className={`min-h-[38px] px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 font-medium transition-colors ${
                currentRoute === 'cookies'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
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
              className={`min-h-[38px] px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 font-medium transition-colors ${
                currentRoute === 'refunds'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Refund Policy</span>
            </a>

            <button
              type="button"
              onClick={onOpenCookieSettings}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              <span>Cookie Settings</span>
            </button>
          </nav>
        </div>

        {/* Developer & Contact Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 border-t border-neutral-800/80 text-neutral-300">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
            <span>
              Developed &amp; Maintained by{' '}
              <strong className="text-white font-semibold">{DEVELOPER_NAME}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
            <span>
              Contact:{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline text-sky-400 hover:text-sky-300 font-mono"
              >
                {CONTACT_EMAIL}
              </a>
            </span>
          </div>

          <div className="flex items-center gap-2 md:justify-end">
            <Mail className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>
              Support:{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="underline text-emerald-400 hover:text-emerald-300 font-mono"
              >
                {SUPPORT_EMAIL}
              </a>
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-neutral-400 leading-relaxed">
            © {new Date().getFullYear()} Niruvi Store by {DEVELOPER_NAME}. All packages are
            distributed under their respective upstream open-source or publisher licenses. We do not
            sell your personal data.
          </p>
          <div className="flex items-center gap-4 shrink-0">
            <a
              href="https://appimage.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <span>AppImageHub</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
            <a
              href="https://appimage.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <span>AppImage.org</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
