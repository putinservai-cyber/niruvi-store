import React, { useState } from 'react';
import {
  Heart,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Coffee,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { DEVELOPER_NAME, KOFI_URL, RAZORPAY_URL } from '../config/site';

interface DonatePageProps {
  onBackToStore: () => void;
  onViewRefundPolicy?: () => void;
}

export const Donate: React.FC<DonatePageProps> = ({ onBackToStore }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <article className="max-w-3xl mx-auto space-y-6 py-4 text-neutral-200">
      <div>
        <button
          type="button"
          onClick={onBackToStore}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to App Catalog</span>
        </button>
      </div>

      <header className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-2">
        <div className="inline-flex items-center gap-2 text-rose-400 text-xs font-semibold">
          <Heart className="w-4 h-4 fill-rose-400" aria-hidden="true" />
          <span>Support {DEVELOPER_NAME}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Support &amp; Donate to Niruvi Store
        </h1>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Support Niruvi Store directly using our official secure donation and support platforms below.
          Your contributions help maintain high-speed servers, SHA-256 verification updates, and open-source Linux AppImage tooling.
        </p>
      </header>

      {/* Official Donation Links */}
      <section aria-label="Official donation links" className="grid grid-cols-1 gap-4">
        {/* 1. Ko-fi */}
        <div className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <h2 className="text-base font-bold text-white">Ko-fi</h2>
            </div>
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs sm:text-sm font-mono text-amber-300 hover:underline truncate"
            >
              {KOFI_URL}
            </a>
            <p className="text-xs text-neutral-400">
              Buy a coffee or support monthly creator goals securely via Ko-fi.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopy('kofi', KOFI_URL)}
              aria-label="Copy Ko-fi link"
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedKey === 'kofi' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Open ko-fi.com</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* 2. Razorpay */}
        <div className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
              <h2 className="text-base font-bold text-white">Razorpay Support Page</h2>
            </div>
            <a
              href={RAZORPAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs sm:text-sm font-mono text-sky-400 hover:underline truncate"
            >
              {RAZORPAY_URL}
            </a>
            <p className="text-xs text-neutral-400">
              Contribute via cards, net banking, wallets, and domestic/international payments.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopy('razorpay', RAZORPAY_URL)}
              aria-label="Copy Razorpay link"
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedKey === 'razorpay' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <a
              href={RAZORPAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Open Razorpay Page</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex items-center gap-3 text-xs text-neutral-400">
        <Sparkles className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
        <span>
          Thank you for supporting Niruvi Store! All contributions go directly toward open-source Linux packaging maintenance and community infrastructure.
        </span>
      </div>
    </article>
  );
};
