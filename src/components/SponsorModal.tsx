import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { AppMetadata } from '../types';

interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  app?: AppMetadata | null;
}

export const SponsorModal: React.FC<SponsorModalProps> = ({ isOpen, onClose, app }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'kofi' | 'upi' | 'gateways'>('kofi');
  const [upiAmount, setUpiAmount] = useState<number>(99);
  const [customUpiId, setCustomUpiId] = useState<string>('putinservai@oksbi');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedUpiLink, setCopiedUpiLink] = useState(false);
  const [copiedKofi, setCopiedKofi] = useState(false);

  const kofiUrl = 'https://ko-fi.com/putinservai';
  const payeeName = encodeURIComponent(app ? `${app.name} Publisher` : 'Niruvi Store');
  const transactionNote = encodeURIComponent(app ? `Support ${app.name} on Niruvi` : 'Niruvi Store Contribution');
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(customUpiId)}&pn=${payeeName}&am=${upiAmount}&cu=INR&tn=${transactionNote}`;
  
  // Safe QR server rendering for instant scanning with PhonePe / GPay / Paytm / BHIM
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiIntentUri)}&bgcolor=0a0a0c&color=ffffff&margin=10`;

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-[#0e0e11] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Coffee className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Support {app ? app.name : 'Niruvi Linux Store'}</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Support via Ko-fi (@putinservai) or direct UPI (0% fees)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 px-4 sm:px-6 bg-neutral-900/30 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('kofi')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'kofi'
                ? 'border-rose-500 text-rose-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-rose-400" />
            <span>Ko-fi (@putinservai)</span>
          </button>

          <button
            onClick={() => setActiveTab('upi')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'upi'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>UPI Instant (India • 0% Fees)</span>
          </button>

          <button
            onClick={() => setActiveTab('gateways')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'gateways'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            <span>Other Gateways</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: KO-FI (PRIMARY GLOBAL / INTERNATIONAL & CARDS) */}
          {activeTab === 'kofi' && (
            <div className="space-y-5">
              {/* Featured Ko-fi Card */}
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-neutral-900/90 to-amber-950/30 border border-rose-500/30 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-md flex-shrink-0">
                      <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center text-rose-400">
                        <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <span>Ko-fi / putinservai</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                          Official Page
                        </span>
                      </h4>
                      <p className="text-xs text-neutral-400">
                        Buy a coffee or support Niruvi Store development
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-black/60 rounded-xl border border-neutral-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="font-mono text-[11px] text-neutral-400 truncate max-w-[260px] sm:max-w-xs">
                      {kofiUrl}
                    </span>
                    <button
                      onClick={() => copyToClipboard(kofiUrl, setCopiedKofi)}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium flex items-center gap-1 transition flex-shrink-0"
                    >
                      {copiedKofi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKofi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Supports <strong>Credit/Debit Cards, Google Pay, Apple Pay & PayPal</strong> worldwide with 0% platform fee for supporters.
                  </p>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
                  <a
                    href={kofiUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-950/50"
                  >
                    <Coffee className="w-4 h-4" />
                    <span>Open Ko-fi.com/putinservai</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => setActiveTab('upi')}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition border border-neutral-700 flex items-center justify-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Switch to UPI (India)</span>
                  </button>
                </div>
              </div>

              {/* Supporter Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1">
                  <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open-Source Development</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Supports hosting the Cloud SQL backend, Linux AppImage packaging, and desktop integration.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1">
                  <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>100% Free & No Ads</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Niruvi Store remains completely free, telemetry-free, and open to all Linux users.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPI INSTANT (INDIA) */}
          {activeTab === 'upi' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 flex items-start gap-3 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-200">Zero API Keys or Gateway Fees Required</p>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5">
                    UPI works directly between bank accounts using Google Pay, PhonePe, Paytm, BHIM, Navi, or any Indian banking app.
                  </p>
                </div>
              </div>

              {/* Amount Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
                  <span>Select Amount in Indian Rupees (INR)</span>
                  <span className="text-neutral-400 text-[11px]">Direct transfer to developer</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[49, 99, 199, 499].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setUpiAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        upiAmount === amt
                          ? 'bg-white text-black border-white shadow-sm'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Code & Direct Scan */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col sm:flex-row items-center gap-6 justify-center">
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
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                      Receiving UPI ID / VPA
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={customUpiId}
                        onChange={(e) => setCustomUpiId(e.target.value)}
                        className="w-full text-xs font-mono bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-neutral-500"
                        placeholder="yourname@upi"
                        title="Enter your custom UPI ID or use default"
                      />
                      <button
                        onClick={() => copyToClipboard(customUpiId, setCopiedUpi)}
                        className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white border border-neutral-700 flex items-center gap-1"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col gap-2">
                    <a
                      href={upiIntentUri}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/10"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Pay ₹{upiAmount} via UPI App</span>
                    </a>

                    <button
                      onClick={() => copyToClipboard(upiIntentUri, setCopiedUpiLink)}
                      className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedUpiLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedUpiLink ? 'Link Copied!' : 'Copy UPI Payment Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Supported Indian Apps */}
              <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-400 flex-wrap">
                <span className="font-semibold text-neutral-300">Supported in:</span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">Google Pay</span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">PhonePe</span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">Paytm</span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">BHIM</span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">CRED</span>
              </div>
            </div>
          )}

          {/* TAB 3: OTHER GATEWAYS & GITHUB */}
          {activeTab === 'gateways' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    <span>GitHub Sponsors</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-pink-950/60 text-pink-300 text-[10px] font-semibold border border-pink-800/60">
                    0% Platform Fee
                  </span>
                </div>
                <p className="text-neutral-400 leading-relaxed text-[11px]">
                  GitHub Sponsors supports direct recurring sponsorship from developers worldwide.
                </p>
                <a
                  href="https://github.com/sponsors"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-700 transition"
                >
                  <span>Explore GitHub Sponsors</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span>Razorpay (India Gateway)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 text-[10px] font-semibold border border-blue-800">
                    India Standard
                  </span>
                </div>
                <p className="text-neutral-400 leading-relaxed text-[11px]">
                  For merchants requiring full invoice generation and recurring auto-debit in India.
                </p>
                <a
                  href="https://razorpay.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
                >
                  <span>Visit Razorpay</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-neutral-800 bg-neutral-900/40 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
            <span>Niruvi Store is 100% Free & Open-Source</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
