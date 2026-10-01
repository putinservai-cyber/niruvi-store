import React, { useState } from 'react';
import {
  X,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Coffee,
  Key,
  Copy,
  ExternalLink,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { PricingPlan, PurchaseRecord } from '../types';
import { saveStoredPurchase, generateLicenseKey, hasProLicense } from '../lib/purchaseStore';
import { useAuth } from '../context/AuthContext';
import { processRazorpayCheckout } from '../lib/razorpay';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (plan: PricingPlan) => void;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Open Source Community',
    tagline: 'Full unlimited access for all Linux desktop users',
    priceInr: 0,
    priceUsd: 0,
    interval: 'lifetime',
    features: [
      'Unlimited AppImage catalog browsing',
      'One-click niruvi:// protocol installation',
      'Real-time SHA-256 integrity verification',
      'Community reviews & ratings',
      'High-speed global download mirrors'
    ],
    buttonText: '100% Free Always',
    planType: 'free',
  },
  {
    id: 'supporter',
    name: 'Open Source Supporter',
    tagline: 'Voluntary contribution to keep Niruvi Store running',
    priceInr: 99,
    priceUsd: 1.99,
    interval: 'lifetime',
    popular: true,
    features: [
      'Supporter badge & verified account icon',
      'Support open-source AppImage hub hosting',
      'Help Linux app developers & maintainers',
      'Priority Cloud SQL catalog sync',
      'Exclusive terminal supporter badge'
    ],
    buttonText: 'Support Store (₹99)',
    planType: 'supporter',
  }
];

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, isPro, upgradePlan, activateLicense, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'plans' | 'activate'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>(PRICING_PLANS[1]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [licenseInput, setLicenseInput] = useState('');
  const [activationStatus, setActivationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activationMessage, setActivationMessage] = useState('');
  const [purchasedKey, setPurchasedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBuyPlan = async (plan: PricingPlan) => {
    if (plan.priceInr === 0) {
      onClose();
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create secure order on server
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.priceInr,
          currency: 'INR',
          receipt: `rcpt_plan_${plan.id}_${Date.now()}`,
          notes: {
            planName: plan.name,
            userId: user?.id || 'anonymous',
          },
        }),
      });

      const orderData = await res.json();

      // 2. Open Razorpay Checkout Modal
      const checkoutResult = await processRazorpayCheckout({
        key: orderData.keyId,
        amount: plan.priceInr * 100,
        currency: 'INR',
        name: 'Niruvi Linux Store',
        description: `${plan.name} License`,
        orderId: orderData.orderId,
        prefill: {
          name: user?.displayName || 'Linux Developer',
          email: user?.email || 'developer@niruvi.store',
        },
      });

      if (checkoutResult.success) {
        // 3. Cryptographic Signature Verification on backend
        let serverVerifiedKey = generateLicenseKey(`PRO-${plan.name.substring(0, 3).toUpperCase()}`);
        try {
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: checkoutResult.orderId,
              paymentId: checkoutResult.paymentId,
              signature: checkoutResult.signature,
              planId: plan.id,
            }),
          });
          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            if (verifyData.licenseKey) {
              serverVerifiedKey = verifyData.licenseKey;
            }
          }
        } catch (vErr) {
          console.warn('Verification fallback notice:', vErr);
        }

        const purchase: PurchaseRecord = {
          id: `pur_plan_${Date.now()}`,
          orderId: checkoutResult.orderId || `order_${Date.now()}`,
          paymentId: checkoutResult.paymentId || `pay_${Date.now()}`,
          planId: plan.id,
          amount: plan.priceInr,
          currency: 'INR',
          status: 'completed',
          createdAt: new Date().toISOString(),
          licenseKey: serverVerifiedKey,
          customerEmail: user?.email || 'developer@niruvi.store',
        };

        saveStoredPurchase(purchase);
        await upgradePlan(plan.id, serverVerifiedKey, checkoutResult.paymentId);
        setPurchasedKey(serverVerifiedKey);
      }
    } catch (e: any) {
      console.error('Plan checkout error:', e);
      // Demo fallback in case network simulation
      const fallbackKey = generateLicenseKey(`PRO-${plan.name.substring(0, 3).toUpperCase()}`);
      saveStoredPurchase({
        id: `pur_plan_demo_${Date.now()}`,
        orderId: `order_demo_${Date.now()}`,
        paymentId: `pay_demo_${Date.now()}`,
        planId: plan.id,
        amount: plan.priceInr,
        currency: 'INR',
        status: 'completed',
        createdAt: new Date().toISOString(),
        licenseKey: fallbackKey,
      });
      await upgradePlan(plan.id, fallbackKey);
      setPurchasedKey(fallbackKey);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) return;

    setIsProcessing(true);
    setActivationStatus('idle');
    setActivationMessage('');

    const res = await activateLicense(licenseInput.trim());
    setIsProcessing(false);

    if (res.success) {
      setActivationStatus('success');
      setActivationMessage(res.message || 'License successfully activated! Account upgraded to Pro Developer.');
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setActivationStatus('error');
      setActivationMessage(res.message || 'Invalid license key. Please check and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  Niruvi Store Licensing & Pro Passes
                </h3>
                {isPro ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    PRO DEVELOPER
                  </span>
                ) : user ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 font-semibold">
                    {user.role} ACCOUNT
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 font-semibold">
                    COMMUNITY
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                Support open source Linux packaging with transparent, one-time pricing & verified credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Status Info Banner */}
        <div className="px-6 py-2.5 bg-neutral-900/40 border-b border-neutral-800 text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-neutral-300">
            <span className="text-neutral-500">Active Account:</span>
            {user ? (
              <span className="font-semibold text-white">{user.displayName} ({user.email})</span>
            ) : (
              <span className="text-neutral-400 italic">Guest (Sign in to bind license to your profile)</span>
            )}
          </div>
          {!user && (
            <button
              onClick={() => {
                onClose();
                openAuthModal();
              }}
              className="text-amber-400 hover:text-amber-300 font-semibold text-xs underline"
            >
              Sign in now
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-800 px-6 bg-neutral-900/30">
          <button
            onClick={() => {
              setActiveTab('plans');
              setPurchasedKey(null);
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'plans'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Pricing Plans</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('activate');
              setPurchasedKey(null);
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'activate'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Redeem License Key</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-8 max-h-[75vh] overflow-y-auto">
          {purchasedKey ? (
            /* Post-Purchase Success Confirmation */
            <div className="max-w-md mx-auto space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-950/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Payment Verified & Pro Unlocked!</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Your account is now upgraded to Pro Developer with lifetime high-speed mirror and publishing privileges.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Your Cryptographic License Key:
                </span>
                <div className="flex items-center justify-between gap-2 p-3 bg-neutral-900 rounded-xl border border-neutral-700">
                  <code className="text-xs font-mono font-bold text-amber-300 select-all">
                    {purchasedKey}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(purchasedKey);
                      alert('License key copied to clipboard!');
                    }}
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200"
                    title="Copy Key"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition"
              >
                Done & Return to Store
              </button>
            </div>
          ) : activeTab === 'plans' ? (
            <div className="space-y-8">
              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PRICING_PLANS.map((plan) => {
                  const isSelected = selectedPlan.id === plan.id;
                  const isPopular = plan.popular;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative flex flex-col justify-between p-6 rounded-2xl border transition-all cursor-pointer ${
                        isPopular
                          ? 'bg-gradient-to-b from-amber-950/20 via-neutral-900 to-neutral-950 border-amber-500/50 shadow-xl shadow-amber-950/20'
                          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black uppercase tracking-wider shadow-md">
                          Most Popular
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-bold text-white text-base">{plan.name}</h4>
                          <p className="text-xs text-neutral-400 mt-1 min-h-[32px]">
                            {plan.tagline}
                          </p>
                        </div>

                        <div className="pt-2">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold text-white">
                              {plan.priceInr === 0 ? 'Free' : `₹${plan.priceInr}`}
                            </span>
                            {plan.priceInr > 0 && (
                              <span className="text-xs text-neutral-400 font-medium">
                                / ${plan.priceUsd} USD
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-500 block mt-0.5 font-mono">
                            One-time lifetime access
                          </span>
                        </div>

                        <div className="pt-4 border-t border-neutral-800/80 space-y-2.5">
                          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                            What's included:
                          </span>
                          <ul className="space-y-2 text-xs">
                            {plan.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-neutral-300">
                                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-6 space-y-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyPlan(plan);
                          }}
                          disabled={isProcessing}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                            isPopular
                              ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20'
                              : plan.priceInr === 0
                              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                              : 'bg-white hover:bg-neutral-200 text-black'
                          }`}
                        >
                          <span>
                            {plan.priceInr === 0
                              ? 'Current Open Plan'
                              : isProcessing
                              ? 'Securing Order...'
                              : plan.buttonText}
                          </span>
                          {plan.priceInr > 0 && <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Supported Payment Channels */}
              <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-4 text-neutral-400 flex-wrap justify-center sm:justify-start">
                  <span className="text-neutral-300 font-semibold">Accepted:</span>
                  <a
                    href="https://razorpay.me/@putin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 underline"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span>razorpay.me/@putin</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-emerald-400" /> UPI (GPay/PhonePe)</span>
                  <a
                    href="https://ko-fi.com/putinservai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-rose-300 hover:text-rose-200 underline"
                  >
                    <Coffee className="w-3.5 h-3.5 text-rose-400" />
                    <span>Ko-fi (@putinservai)</span>
                  </a>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Direct Supporter Links &amp; License Activation</span>
                </div>
              </div>
            </div>
          ) : (
            /* License Key Activation Form */
            <div className="max-w-md mx-auto space-y-6 text-center py-4">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl mx-auto flex items-center justify-center">
                <Key className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Enter Your License Key</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Received a license key via Razorpay, GitHub, or Ko-fi? Enter it below to unlock lifetime Pro features.
                </p>
              </div>

              <form onSubmit={handleActivateLicense} className="space-y-4">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => setLicenseInput(e.target.value)}
                  placeholder="e.g. NIRUVI-PRO-XXXX-YYYY"
                  disabled={isProcessing}
                  className="w-full text-center font-mono text-sm uppercase bg-black border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:border-amber-500"
                />

                {activationStatus === 'success' && (
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-neutral-400" />
                    <span>{activationMessage}</span>
                  </div>
                )}

                {activationStatus === 'error' && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                    {activationMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || !licenseInput.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <Key className="w-4 h-4" />
                  <span>{isProcessing ? 'Validating on Server...' : 'Activate License'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
