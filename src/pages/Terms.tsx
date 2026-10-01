import React from 'react';
import { Scale, ArrowLeft, ShieldAlert, Terminal } from 'lucide-react';

interface TermsPageProps {
  onBackToStore: () => void;
}

export const Terms: React.FC<TermsPageProps> = ({ onBackToStore }) => {
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
        <strong>Legal Template Notice:</strong> These Terms &amp; Conditions are a template tailored
        to Niruvi Store. Replace <code className="font-mono">[OWNER NAME]</code>,{' '}
        <code className="font-mono">[CONTACT EMAIL]</code>,{' '}
        <code className="font-mono">[COUNTRY/JURISDICTION]</code>, and{' '}
        <code className="font-mono">[LAST UPDATED DATE]</code> and consult a qualified lawyer in
        your jurisdiction.
      </div>

      <header className="space-y-3 border-b border-neutral-800 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
          <Scale className="w-4 h-4" aria-hidden="true" />
          <span>Terms of Use &amp; Licensing</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Welcome to Niruvi Store, operated by <strong>[OWNER NAME]</strong>. By accessing this
          static directory or using <code className="font-mono">niruvi://</code> installation links,
          you agree to these Terms &amp; Conditions.
        </p>
      </header>

      <section aria-labelledby="terms-nature" className="space-y-3">
        <h2 id="terms-nature" className="text-xl font-bold text-white">
          1. Static Catalog Directory &amp; Third-Party Software Licenses
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Niruvi Store is a curated catalog index of standalone Linux <code className="font-mono">.AppImage</code>{' '}
          packages. We do not host or modify third-party binary executables; all downloads are
          fetched directly from upstream publisher repositories (such as GitHub Releases or official
          project mirrors).
        </p>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Each listed application is governed by its own upstream license (for example, GPL-3.0,
          MIT, Apache-2.0, MPL-2.0, or proprietary terms as indicated on its detail card). Upstream
          publishers and maintainers are solely responsible for their applications, source code, and
          release binaries.
        </p>
      </section>

      <section aria-labelledby="terms-checksums" className="space-y-3">
        <h2 id="terms-checksums" className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <span>2. Mandatory User Verification of SHA-256 Checksums</span>
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          AppImage binaries execute with your local Linux user privileges. Before making any
          downloaded file executable (<code className="font-mono">chmod +x</code>) or launching it,
          you are responsible for verifying its cryptographic <strong>SHA-256 checksum</strong>{' '}
          against the upstream release digest using <code className="font-mono">sha256sum --check</code>{' '}
          or the Niruvi desktop verifier.
        </p>
      </section>

      <section aria-labelledby="terms-as-is" className="space-y-3">
        <h2 id="terms-as-is" className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <span>3. Disclaimer of Warranties (&ldquo;AS IS&rdquo;) &amp; Limitation of Liability</span>
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          THE NIRUVI STORE WEBSITE, CATALOG METADATA, AND ALL LINKED THIRD-PARTY SOFTWARE ARE
          PROVIDED <strong>&ldquo;AS IS&rdquo;</strong> AND <strong>&ldquo;AS AVAILABLE&rdquo;</strong>,
          WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES
          OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, SECURITY, OR NON-INFRINGEMENT.
        </p>
        <p className="text-sm text-neutral-300 leading-relaxed">
          To the maximum extent permitted by applicable law in <strong>[COUNTRY/JURISDICTION]</strong>,{' '}
          <strong>[OWNER NAME]</strong> and Niruvi Store contributors shall not be liable for any
          direct, indirect, incidental, consequential, or special damages, data loss, or system
          damage arising out of your download, installation, or execution of any third-party
          software indexed in this catalog.
        </p>
      </section>

      <section aria-labelledby="terms-gpl" className="space-y-3">
        <h2 id="terms-gpl" className="text-xl font-bold text-white">
          4. Niruvi Store Source Code License (GPL-3.0)
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Niruvi Store&apos;s own web frontend, catalog schema validators, and build scripts are
          free software licensed under the{' '}
          <strong>GNU General Public License v3.0 (GPL-3.0)</strong>. Third-party application names,
          logos, and trademarks remain the property of their respective owners and are used solely
          for package identification.
        </p>
      </section>

      <section aria-labelledby="terms-law" className="space-y-2 border-t border-neutral-800 pt-6">
        <h2 id="terms-law" className="text-xl font-bold text-white">
          5. Governing Law &amp; Contact
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          These Terms are governed by the laws of <strong>[COUNTRY/JURISDICTION]</strong>. Questions
          or takedown requests may be sent to <strong>[OWNER NAME]</strong> at{' '}
          <a
            href="mailto:[CONTACT EMAIL]"
            className="underline text-sky-400 hover:text-sky-300 font-mono"
          >
            [CONTACT EMAIL]
          </a>
          .
        </p>
      </section>
    </article>
  );
};
