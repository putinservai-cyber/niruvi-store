import React, { useState, useEffect, useRef } from 'react';
import { Shield, Settings, X, Check } from 'lucide-react';

export const CONSENT_STORAGE_KEY = 'niruvi_cookie_consent_v1';
export const CONSENT_VERSION = '1.0';

export interface ConsentPreferences {
  version: string;
  timestamp: string;
  essential: true;
  preferences: boolean;
  externalMedia: boolean;
  analytics: boolean;
}

export function getStoredConsent(): ConsentPreferences | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentPreferences;
    if (!parsed || parsed.version !== CONSENT_VERSION || !parsed.timestamp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredConsent(
  choices: Pick<ConsentPreferences, 'preferences' | 'externalMedia' | 'analytics'>,
): ConsentPreferences {
  const record: ConsentPreferences = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    essential: true,
    preferences: Boolean(choices.preferences),
    externalMedia: Boolean(choices.externalMedia),
    analytics: Boolean(choices.analytics),
  };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent('niruvi-consent-updated', { detail: record }));
  } catch {
    // Ignore localStorage quota/privacy restrictions
  }
  return record;
}

interface CookieConsentProps {
  isOpen?: boolean;
  onCloseManage?: () => void;
  onNavigateLegal?: (route: 'privacy' | 'cookies' | 'terms' | 'refunds') => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({
  isOpen = false,
  onCloseManage,
  onNavigateLegal,
}) => {
  const [consent, setConsent] = useState<ConsentPreferences | null>(() => getStoredConsent());
  const [isManaging, setIsManaging] = useState(false);

  // Unchecked by default when user has not yet consented (no pre-ticked boxes!)
  const [prefStorage, setPrefStorage] = useState(false);
  const [externalMedia, setExternalMedia] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  const manageDialogRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getStoredConsent();
      setPrefStorage(current ? current.preferences : false);
      setExternalMedia(current ? current.externalMedia : false);
      setAnalytics(current ? current.analytics : false);
      setIsManaging(true);
    }
  }, [isOpen]);

  useEffect(() => {
    const onUpdate = () => setConsent(getStoredConsent());
    window.addEventListener('niruvi-consent-updated', onUpdate);
    return () => window.removeEventListener('niruvi-consent-updated', onUpdate);
  }, []);

  useEffect(() => {
    if (!isManaging) return;
    firstActionRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsManaging(false);
        onCloseManage?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isManaging, onCloseManage]);

  const handleAcceptAll = () => {
    const saved = saveStoredConsent({
      preferences: true,
      externalMedia: true,
      analytics: true,
    });
    setConsent(saved);
    setIsManaging(false);
    onCloseManage?.();
  };

  const handleRejectNonEssential = () => {
    const saved = saveStoredConsent({
      preferences: false,
      externalMedia: false,
      analytics: false,
    });
    setConsent(saved);
    setIsManaging(false);
    onCloseManage?.();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = saveStoredConsent({
      preferences: prefStorage,
      externalMedia,
      analytics,
    });
    setConsent(saved);
    setIsManaging(false);
    onCloseManage?.();
  };

  const openManageView = () => {
    const current = getStoredConsent();
    // Explicitly never pre-tick non-essential checkboxes before prior consent
    setPrefStorage(current ? current.preferences : false);
    setExternalMedia(current ? current.externalMedia : false);
    setAnalytics(current ? current.analytics : false);
    setIsManaging(true);
  };

  // Hide banner if user already made a choice and isn't explicitly opening "Cookie settings"
  if (consent && !isManaging && !isOpen) {
    return null;
  }

  return (
    <section
      aria-label="Cookie and local storage consent"
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none"
    >
      <div
        ref={manageDialogRef}
        role={isManaging ? 'dialog' : 'region'}
        aria-modal={isManaging ? 'true' : undefined}
        aria-labelledby="cookie-consent-heading"
        className="pointer-events-auto max-w-4xl mx-auto bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 sm:p-6 text-neutral-100"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <h2 id="cookie-consent-heading" className="text-base font-bold text-white">
                Privacy &amp; Browser Storage Choices
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1 leading-relaxed">
                Niruvi Store is a static Linux application catalog hosted on GitHub Pages. We do{' '}
                <strong>not</strong> use tracking cookies or load third-party analytics by default.
                You can choose whether to allow optional local preferences (such as bookmarks) or
                external media embeds. Read our{' '}
                <a
                  href="#/privacy"
                  onClick={() => onNavigateLegal?.('privacy')}
                  className="underline text-sky-400 hover:text-sky-300 font-medium"
                >
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a
                  href="#/cookies"
                  onClick={() => onNavigateLegal?.('cookies')}
                  className="underline text-sky-400 hover:text-sky-300 font-medium"
                >
                  Cookie Policy
                </a>
                .
              </p>
            </div>
          </div>

          {isManaging && (
            <button
              type="button"
              onClick={() => {
                setIsManaging(false);
                onCloseManage?.();
              }}
              aria-label="Close cookie settings dialog"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {isManaging && (
          <form onSubmit={handleSaveCustom} className="mt-5 pt-4 border-t border-neutral-800 space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                Granular Storage &amp; Embed Categories (Unchecked by Default)
              </legend>

              {/* Strictly Necessary */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <input
                  id="consent-essential"
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 w-4 h-4 rounded border-neutral-600 accent-sky-400"
                />
                <div className="text-xs">
                  <label htmlFor="consent-essential" className="font-bold text-white block">
                    Strictly Necessary Consent Record (Always Active)
                  </label>
                  <p className="text-neutral-300 mt-0.5">
                    Stores your privacy choice (<code className="font-mono">niruvi_cookie_consent_v1</code>) with a timestamp and version in browser localStorage so we do not ask you on every page view.
                  </p>
                </div>
              </div>

              {/* Local Preferences */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <input
                  id="consent-preferences"
                  type="checkbox"
                  checked={prefStorage}
                  onChange={(e) => setPrefStorage(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-neutral-600 accent-sky-400 cursor-pointer"
                />
                <div className="text-xs">
                  <label htmlFor="consent-preferences" className="font-bold text-white block cursor-pointer">
                    Local App Bookmarks &amp; Library State (Optional)
                  </label>
                  <p className="text-neutral-300 mt-0.5">
                    Saves bookmarked AppImages and locally tested custom catalog entries in your browser&apos;s <code className="font-mono">localStorage</code>. Never leaves your device.
                  </p>
                </div>
              </div>

              {/* External Media */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <input
                  id="consent-external-media"
                  type="checkbox"
                  checked={externalMedia}
                  onChange={(e) => setExternalMedia(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-neutral-600 accent-sky-400 cursor-pointer"
                />
                <div className="text-xs">
                  <label htmlFor="consent-external-media" className="font-bold text-white block cursor-pointer">
                    Third-Party Screenshots &amp; Video Embeds (Optional)
                  </label>
                  <p className="text-neutral-300 mt-0.5">
                    Allows loading external publisher screenshots or videos without clicking a placeholder first. Loading external media shares your IP address with the media host.
                  </p>
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <input
                  id="consent-analytics"
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-neutral-600 accent-sky-400 cursor-pointer"
                />
                <div className="text-xs">
                  <label htmlFor="consent-analytics" className="font-bold text-white block cursor-pointer">
                    Optional Anonymous Diagnostics (Currently Inactive)
                  </label>
                  <p className="text-neutral-300 mt-0.5">
                    Reserved for future opt-in usage telemetry. No analytics scripts are currently loaded on this static site.
                  </p>
                </div>
              </div>
            </fieldset>

            {consent && (
              <p className="text-xs text-neutral-400 font-mono">
                Last saved choice: {new Date(consent.timestamp).toLocaleString()} (Schema v{consent.version})
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>Save Selected Choices</span>
              </button>
            </div>
          </form>
        )}

        {/* Equal visual weight buttons: Accept All / Reject Non-Essential / Manage Choices */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            ref={firstActionRef}
            type="button"
            onClick={handleRejectNonEssential}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            Reject Non-Essential
          </button>

          {!isManaging && (
            <button
              type="button"
              onClick={openManageView}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Manage Choices</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAcceptAll}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            Accept All
          </button>
        </div>
      </div>
    </section>
  );
};
