const fs = require('fs');
let content = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

content = content.replace('    signInWithGoogle,\n    loginWithCredentials', '    signInWithGoogle,\n    sandboxLogin,\n    loginWithCredentials');

const handleSandboxImpl = `
  const handleSandboxSubmit = async () => {
    setError(null);
    setLoadingProvider('sandbox');
    try {
      await sandboxLogin();
    } catch (err: any) {
      setError(err?.message || 'Sandbox authentication failed.');
    } finally {
      setLoadingProvider(null);
    }
  };
`;
content = content.replace('  const handleGoogleSubmit = async () => {', handleSandboxImpl + '\n  const handleGoogleSubmit = async () => {');

const sandboxButton = `
        {window.self !== window.top && (
          <div className="pt-2">
            <button
              onClick={handleSandboxSubmit}
              disabled={Boolean(loadingProvider)}
              className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 text-amber-500 font-semibold text-sm transition shadow-md group disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" />
                <span>Sandbox Developer Login (Preview Mode)</span>
              </div>
              {loadingProvider === 'sandbox' ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
            <p className="text-xs text-neutral-500 text-center mt-3">
              Use this sandbox login since Google Auth popups are blocked inside the preview iframe.
            </p>
          </div>
        )}
`;

content = content.replace('        <div className="pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">', sandboxButton + '\n        <div className="pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">');

content = content.replace('useState<\'google\' | \'credentials\' | null>', 'useState<\'google\' | \'credentials\' | \'sandbox\' | null>');

fs.writeFileSync('src/components/AuthModal.tsx', content);
console.log("AuthModal patched");
