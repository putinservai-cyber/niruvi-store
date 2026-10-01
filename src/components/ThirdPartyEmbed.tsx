import React, { useState, useEffect } from 'react';
import { ShieldAlert, ExternalLink, Eye } from 'lucide-react';
import { getStoredConsent } from './CookieConsent';
import { sanitizeUrl, sanitizeText } from '../utils/sanitize';

interface ThirdPartyEmbedProps {
  type: 'image' | 'iframe';
  src: string;
  altOrTitle: string;
  caption?: string;
  className?: string;
}

export const ThirdPartyEmbed: React.FC<ThirdPartyEmbedProps> = ({
  type,
  src,
  altOrTitle,
  caption,
  className = '',
}) => {
  const safeSrc = sanitizeUrl(src);
  const safeAlt = sanitizeText(altOrTitle, 200) || 'Application media preview';

  const isLocalAsset = safeSrc.startsWith(window.location.origin) || src.startsWith('/');
  const [hasConsented, setHasConsented] = useState<boolean>(() => {
    if (isLocalAsset) return true;
    return Boolean(getStoredConsent()?.externalMedia);
  });

  useEffect(() => {
    const onConsentChange = () => {
      if (getStoredConsent()?.externalMedia) {
        setHasConsented(true);
      }
    };
    window.addEventListener('niruvi-consent-updated', onConsentChange);
    return () => window.removeEventListener('niruvi-consent-updated', onConsentChange);
  }, []);

  if (!safeSrc) return null;

  let providerHost = 'external host';
  try {
    providerHost = new URL(safeSrc).hostname;
  } catch {
    providerHost = 'third-party host';
  }

  if (!hasConsented && !isLocalAsset) {
    return (
      <div
        className={`p-5 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-3 ${className}`}
        role="region"
        aria-label={`Blocked external media from ${providerHost}`}
      >
        <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-5 h-5 text-amber-400" aria-hidden="true" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h4 className="text-xs font-bold text-white">
            External Media Blocked for Privacy ({providerHost})
          </h4>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Loading &ldquo;{safeAlt}&rdquo; connects directly to <strong>{providerHost}</strong>,
            which will receive your IP address, browser User-Agent, and request headers.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setHasConsented(true)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Load External Media from {providerHost}</span>
          </button>
          <a
            href="#/privacy"
            className="min-h-[44px] px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-medium text-xs inline-flex items-center gap-1 transition-colors"
          >
            <span>Privacy Details</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  if (type === 'iframe') {
    return (
      <figure className="space-y-2">
        <iframe
          src={safeSrc}
          title={safeAlt}
          className={`w-full aspect-video rounded-xl border border-neutral-800 ${className}`}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
        />
        {caption && <figcaption className="text-xs text-neutral-400">{sanitizeText(caption, 200)}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className="space-y-2">
      <img
        src={safeSrc}
        alt={safeAlt}
        className={`rounded-xl border border-neutral-800 ${className}`}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
      {caption && <figcaption className="text-xs text-neutral-400">{sanitizeText(caption, 200)}</figcaption>}
    </figure>
  );
};
