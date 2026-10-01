import React from 'react';
import { Receipt, ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react';

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
          Last Updated: [LAST UPDATED DATE]
        </span>
      </div>

      <div
        role="note"
        aria-label="Legal template notice"
        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed"
      >
        <strong>Legal Template Notice:</strong> This Refund Policy is a template tailored to Niruvi
        Store. Replace <code className="font-mono">[OWNER NAME]</code>,{' '}
        <code className="font-mono">[CONTACT EMAIL]</code>,{' '}
        <code className="font-mono">[COUNTRY/JURISDICTION]</code>, and{' '}
        <code className="font-mono">[LAST UPDATED DATE]</code> and have it reviewed by a qualified
        lawyer before enabling commercial transactions.
      </div>

      <header className="space-y-3 border-b border-neutral-800 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          <Receipt className="w-4 h-4" aria-hidden="true" />
          <span>Pricing, Donations &amp; Refunds</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Refund Policy</h1>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Niruvi Store, operated by <strong>[OWNER NAME]</strong>, provides open-source and
          community Linux <code className="font-mono">.AppImage</code> discovery and installation
          metadata free of charge.
        </p>
      </header>

      <section aria-labelledby="refunds-current-free" className="space-y-3">
        <h2 id="refunds-current-free" className="text-xl font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <span>1. Current Store Status: 100% Free Catalog Downloads</span>
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          All applications currently indexed in the static Niruvi Store catalog are free to browse
          and download (<code className="font-mono">$0.00</code>). No payment, subscription, or
          credit card is required to download any AppImage or use <code className="font-mono">niruvi://</code>{' '}
          links. Because no purchases are processed on the static GitHub Pages store,{' '}
          <strong>no commercial charges or refunds apply to free catalog downloads</strong>.
        </p>
      </section>

      <section aria-labelledby="refunds-donations" className="space-y-3">
        <h2 id="refunds-donations" className="text-xl font-bold text-white">
          2. Upstream Publisher Sponsorships &amp; Donations
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Some application detail pages include outbound links to official upstream donation pages
          (such as GitHub Sponsors, Blender Development Fund, KDE e.V., VideoLAN, or Ko-fi). Those
          voluntary contributions are processed directly by the upstream project or their payment
          platform and are governed by that third party&apos;s own refund and donation policies.
        </p>
      </section>

      <section aria-labelledby="refunds-future-paid" className="space-y-3">
        <h2 id="refunds-future-paid" className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-400" aria-hidden="true" />
          <span>3. Policy for Future Paid Apps or Commercial Add-Ons</span>
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          If paid commercial Linux applications or developer support plans are introduced in the
          future, the following refund terms will apply in accordance with applicable consumer
          protection laws in <strong>[COUNTRY/JURISDICTION]</strong>:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm text-neutral-300">
          <li>
            <strong>14-Day Refund Window:</strong> Customers may request a full refund within 14
            calendar days of purchase if a paid AppImage fails to launch on a supported Linux
            distribution meeting the stated host requirements (<code className="font-mono">glibc</code>{' '}
            and <code className="font-mono">FUSE</code>) or if the binary SHA-256 checksum fails
            verification.
          </li>
          <li>
            <strong>Duplicate or Unauthorized Charges:</strong> Any duplicate billing or
            unauthorized transaction will be refunded in full upon verification.
          </li>
          <li>
            <strong>How to Request a Refund:</strong> Email{' '}
            <a
              href="mailto:[CONTACT EMAIL]"
              className="underline text-sky-400 hover:text-sky-300 font-mono"
            >
              [CONTACT EMAIL]
            </a>{' '}
            with your transaction receipt/order ID and a brief description of the issue. Approved
            refunds are returned to the original payment method within 5–10 business days.
          </li>
        </ul>
      </section>
    </article>
  );
};
