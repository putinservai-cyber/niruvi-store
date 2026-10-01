import React from 'react';
import { Receipt, ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react';
import { DEVELOPER_NAME, CONTACT_EMAIL, SUPPORT_EMAIL } from '../config/site';

interface RefundsPageProps {
  onBackToStore: () => void;
}

export const Refunds: React.FC<RefundsPageProps> = ({ onBackToStore }) => {
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
          Last Updated: October 1, 2026
        </span>
      </div>

      <header className="space-y-3 border-b border-neutral-800 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <Receipt className="w-4 h-4" aria-hidden="true" />
          <span>Pricing, Donations &amp; Refunds</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Refund Policy</h1>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Niruvi Store, developed and operated by <strong>{DEVELOPER_NAME}</strong>, provides
          open-source and community Linux <code className="font-mono">.AppImage</code> discovery and
          installation metadata free of charge.
        </p>
      </header>

      <section aria-labelledby="refunds-current-free" className="space-y-3">
        <h2 id="refunds-current-free" className="text-xl font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <span>1. Current Store Status: 100% Free Catalog Downloads</span>
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          All applications indexed in the Niruvi Store catalog are free to browse and download (
          <code className="font-mono">$0.00</code>). No payment, subscription, or credit card is
          required to download any AppImage or use <code className="font-mono">niruvi://</code>{' '}
          links. Because no purchases are required for catalog downloads,{' '}
          <strong>no commercial charges or refunds apply to free catalog downloads</strong>.
        </p>
      </section>

      <section aria-labelledby="refunds-donations" className="space-y-3">
        <h2 id="refunds-donations" className="text-xl font-bold text-white">
          2. Upstream Publisher Sponsorships &amp; Donations
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Some application detail pages include outbound links to official upstream project pages.
          Any voluntary contributions to upstream open-source authors are processed directly by the
          upstream project or their payment platform and are governed by that third party&apos;s own
          refund and donation policies.
        </p>
      </section>

      <section aria-labelledby="refunds-future-paid" className="space-y-3">
        <h2 id="refunds-future-paid" className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-400" aria-hidden="true" />
          <span>3. Support &amp; Billing Inquiries</span>
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          If you have any questions or need assistance from developer{' '}
          <strong>{DEVELOPER_NAME}</strong>, please contact us at{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="underline text-emerald-400 hover:text-emerald-300 font-mono"
          >
            {SUPPORT_EMAIL}
          </a>{' '}
          or{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline text-sky-400 hover:text-sky-300 font-mono"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </article>
  );
};
