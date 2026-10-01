import React, { useState, useMemo } from 'react';
import {
  Heart,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Coffee,
  CreditCard,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { DEVELOPER_NAME, KOFI_URL, RAZORPAY_URL, UPI_ID } from '../config/site';
import { generateQrMatrix } from '../utils/upiQr';

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

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
    DEVELOPER_NAME
  )}&cu=INR`;

  const qrMatrix = useMemo(() => generateQrMatrix(upiDeepLink), [upiDeepLink]);
  const quietZone = 3;
  const viewBoxSize = qrMatrix.length + quietZone * 2;

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
          Support Niruvi Store directly using the official donation links or by scanning the UPI QR
          code below.
        </p>
      </header>

      {/* Official Donation Links Only */}
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
              <span>Open ko-fi.com/putinservai</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* 2. Razorpay */}
        <div className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
              <h2 className="text-base font-bold text-white">Razorpay</h2>
            </div>
            <a
              href={RAZORPAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs sm:text-sm font-mono text-sky-400 hover:underline truncate"
            >
              {RAZORPAY_URL}
            </a>
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
              <span>Open razorpay.me/@putin</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* 3. UPI ID + Scannable QR Code */}
        <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 w-full md:w-auto min-w-0">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <h2 className="text-base font-bold text-white">UPI (Scan QR or Copy ID)</h2>
            </div>

            <p className="text-xs sm:text-sm font-mono text-emerald-400 select-all truncate">
              {UPI_ID}
            </p>

            <p className="text-xs text-neutral-400">
              Scan the QR code with Google Pay, PhonePe, Paytm, BHIM, or any UPI app.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopy('upi', UPI_ID)}
                aria-label="Copy UPI ID"
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedKey === 'upi' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy UPI ID</span>
                  </>
                )}
              </button>

              <a
                href={upiDeepLink}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pay via UPI App</span>
              </a>
            </div>
          </div>

          {/* Scannable UPI QR Code Box */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="p-3 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-md">
              <svg
                role="img"
                aria-label={`UPI QR Code for ${UPI_ID}`}
                viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                className="w-40 h-40 sm:w-44 sm:h-44 block"
                shapeRendering="crispEdges"
              >
                <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
                {qrMatrix.map((row, rIdx) =>
                  row.map((cell, cIdx) =>
                    cell ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx + quietZone}
                        y={rIdx + quietZone}
                        width={1}
                        height={1}
                        fill="#000000"
                      />
                    ) : null
                  )
                )}
              </svg>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              Scan to Pay · {UPI_ID}
            </span>
          </div>
        </div>
      </section>
    </article>
  );
};
