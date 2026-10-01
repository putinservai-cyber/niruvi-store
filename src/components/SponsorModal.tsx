import React, { useState } from 'react';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import {
  X,
  Heart,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { AppMetadata } from '../types';

export const RAZORPAY_ME_URL = 'https://razorpay.me/@putin';
export const RAZORPAY_ME_DISPLAY = 'razorpay.me/@putin';

interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  app?: AppMetadata | null;
}

export const SponsorModal: React.FC<SponsorModalProps> = ({ isOpen, onClose, app }) => {
  const [activeTab, setActiveTab] = useState<'razorpay' | 'upi' | 'kofi'>('razorpay');
  const [upiAmount, setUpiAmount] = useState<number | string>(99);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedUpiLink, setCopiedUpiLink] = useState(false);
  const [copiedKofi, setCopiedKofi] = useState(false);
  const [copiedRazorpay, setCopiedRazorpay] = useState(false);

  usePreventBodyScroll(isOpen);

  if (!isOpen) return null;

  const upiId = 'putinservai-1@okhdfcbank';
  const kofiUrl = 'https://ko-fi.com/putinservai';
  const payeeName = encodeURIComponent(app ? `${app.name} Publisher` : 'Niruvi Store');
  const transactionNote = encodeURIComponent(
    app ? `Support ${app.name} on Niruvi` : 'Niruvi Store Contribution'
  );
  const numericAmount = typeof upiAmount === 'string' ? parseFloat(upiAmount) || 0 : upiAmount;
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${payeeName}&am=${numericAmount}&cu=INR&tn=${transactionNote}`;

  // Safe QR server rendering for instant scanning with PhonePe / GPay / Paytm / BHIM
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiIntentUri)}&bgcolor=0a0a0c&color=ffffff&margin=10`;

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-modal-title"
    >
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Heart className="w-5 h-5 text-rose-400 fill-rose-400/20" aria-hidden="true" />
            </div>
            <div>
              <h3 id="sponsor-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                <span>Support {app ? app.name : 'Niruvi Linux Store'}</span>
              </h3>
              <p className="text-xs text-neutral-300">
                Support via {RAZORPAY_ME_DISPLAY}, Instant UPI, or Ko-fi (@putinservai)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close support dialog"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-neutral-400 hover:text-white p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 px-4 sm:px-6 bg-neutral-900/30 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('razorpay')}
            className={`min-h-[44px] py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'razorpay'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span>Razorpay.me (@putin)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            data-tab="upi"
            className={`min-h-[44px] py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'upi'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>UPI Instant (0% Fees)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kofi')}
            className={`min-h-[44px] py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'kofi'
                ? 'border-rose-500 text-rose-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
            <span>Ko-fi (@putinservai)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: RAZORPAY.ME (@PUTIN) */}
          {activeTab === 'razorpay' && (
            <div className="space-y-5 text-xs">
              <div className="p-5 rounded-2xl bg-neutral-950 border border-blue-500/30 shadow-lg space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                      <CreditCard className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        Razorpay.me Direct Link (@putin)
                      </h4>
                      <p className="text-xs text-neutral-300 mt-0.5">
                        Instant UPI, RuPay/Visa/Mastercard Cards &amp; NetBanking via Razorpay.me
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-neutral-200">
                    <span className="font-mono text-xs text-sky-300 truncate select-all">
                      {RAZORPAY_ME_URL}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(RAZORPAY_ME_URL, setCopiedRazorpay)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer border border-neutral-700"
                    >
                      {copiedRazorpay ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Enter any custom contribution amount directly on <strong>{RAZORPAY_ME_DISPLAY}</strong> with instant payment confirmation.
                  </p>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
                  <a
                    id="razorpay-me-link-btn"
                    href={RAZORPAY_ME_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] w-full sm:flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-950/50"
                  >
                    <CreditCard className="w-4 h-4" aria-hidden="true" />
                    <span>Open {RAZORPAY_ME_DISPLAY}</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveTab('upi')}
                    className="min-h-[44px] w-full sm:w-auto py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition border border-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>UPI QR (0% Fee)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span>Open-Source AppImage Hub</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Supports Linux AppImage verification, catalog maintenance, and desktop protocol tools.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>100% Free &amp; No Ads</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Every AppImage in Niruvi Store remains free to download and verify with SHA-256.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPI INSTANT (INDIA) */}
          {activeTab === 'upi' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3 text-xs text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-neutral-200">Zero Gateway Fees — Direct Bank UPI</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Scan with Google Pay, PhonePe, Paytm, BHIM, or use{' '}
                    <a
                      href={RAZORPAY_ME_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 underline hover:text-sky-300"
                    >
                      {RAZORPAY_ME_DISPLAY}
                    </a>
                    .
                  </p>
                </div>
              </div>

              {/* Amount Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
                  <span>Select Amount in Indian Rupees (INR)</span>
                  <span className="text-neutral-400 text-[11px] font-mono tabular-nums">Direct transfer</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[49, 99, 199].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setUpiAmount(amt)}
                      className={`min-h-[40px] py-2 rounded-xl text-xs font-bold border transition cursor-pointer font-mono tabular-nums ${
                        numericAmount === amt
                          ? 'bg-white text-black border-white shadow-sm'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      aria-label="Custom INR amount"
                      value={upiAmount}
                      onChange={(e) => setUpiAmount(e.target.value)}
                      placeholder="Custom"
                      className="w-full h-full min-h-[40px] py-2 pl-6 pr-2 rounded-xl text-xs font-bold border bg-neutral-900 text-neutral-200 border-neutral-800 hover:border-neutral-700 focus:border-emerald-500/50 focus:outline-none transition font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* QR Code & Direct Scan */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center gap-6 justify-center">
                <div className="relative p-2 bg-[#0a0a0c] rounded-xl border border-neutral-700 flex flex-col items-center">
                  <img
                    src={qrCodeUrl}
                    alt="UPI Payment QR Code"
                    className="w-40 h-40 rounded-lg object-contain"
                  />
                  <span className="text-[10px] text-neutral-400 font-mono mt-1">Scan with any UPI App</span>
                </div>

                <div className="space-y-3 text-center sm:text-left flex-1">
                  <div>
                    <span className="text-[11px] text-neutral-400 font-semibold">
                      Receiving UPI ID / VPA
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-full text-xs font-mono bg-black border border-neutral-700 rounded-lg px-3 py-2 text-neutral-200 select-all">
                        {upiId}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(upiId, setCopiedUpi)}
                        className="min-h-[38px] px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white border border-neutral-700 flex items-center gap-1 cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col gap-2">
                    <a
                      href={upiIntentUri}
                      className="min-h-[42px] w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/10"
                    >
                      <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Pay ₹{numericAmount} via UPI App</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiIntentUri, setCopiedUpiLink)}
                      className="min-h-[38px] w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedUpiLink ? (
                        <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>{copiedUpiLink ? 'Link Copied!' : 'Copy UPI Payment Link'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KO-FI */}
          {activeTab === 'kofi' && (
            <div className="space-y-5">
              <div className="relative p-5 rounded-2xl bg-neutral-950 border border-rose-500/30 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                      <Heart className="w-5 h-5 fill-rose-500 text-rose-500" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Ko-fi / putinservai</h4>
                      <p className="text-xs text-neutral-300">
                        International Cards, Apple Pay, Google Pay &amp; PayPal
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="font-mono text-xs text-neutral-300 truncate max-w-[260px] sm:max-w-xs select-all">
                      {kofiUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(kofiUrl, setCopiedKofi)}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition flex-shrink-0 cursor-pointer border border-neutral-700"
                    >
                      {copiedKofi ? (
                        <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>{copiedKofi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
                  <a
                    href={kofiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-950/50"
                  >
                    <Coffee className="w-4 h-4" aria-hidden="true" />
                    <span>Open Ko-fi.com/putinservai</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>

                  <a
                    href={RAZORPAY_ME_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] w-full sm:w-auto py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition border border-neutral-700 flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                    <span>{RAZORPAY_ME_DISPLAY}</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-neutral-800 bg-neutral-900/40 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
            <span>Niruvi Store is 100% Free &amp; Open-Source</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
