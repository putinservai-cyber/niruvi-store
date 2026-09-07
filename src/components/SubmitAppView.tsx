import React, { useState } from 'react';
import { AppMetadata, Category, Architecture } from '../types';
import { generateNiruviProtocolUrl } from '../data/apps';
import { saveCustomApp } from '../utils/storage';
import { 
  PlusCircle, 
  Check, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck, 
  Terminal,
  HelpCircle,
  Copy
} from 'lucide-react';

interface SubmitAppViewProps {
  onAppAdded: (app: AppMetadata) => void;
  onNavigateToStore: () => void;
}

export const SubmitAppView: React.FC<SubmitAppViewProps> = ({
  onAppAdded,
  onNavigateToStore,
}) => {
  const [name, setName] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [version, setVersion] = useState('');
  const [category, setCategory] = useState<Exclude<Category, 'All'>>('Development');
  const [size, setSize] = useState('85 MB');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [sha256, setSha256] = useState('');
  const [license, setLicense] = useState('GPL-3.0');
  const [architectures, setArchitectures] = useState<Architecture[]>(['x86_64']);
  const [publisherName, setPublisherName] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [testedUrl, setTestedUrl] = useState(false);
  const [copiedProtocol, setCopiedProtocol] = useState(false);

  // Auto-detect version & arch from AppImage URL
  const handleAutoDetectFromUrl = () => {
    if (!downloadUrl.trim()) return;

    try {
      const parts = downloadUrl.split('/');
      const filename = parts[parts.length - 1] || '';
      
      // Auto detect arch
      if (filename.includes('aarch64') || filename.includes('arm64')) {
        setArchitectures(['aarch64']);
      } else {
        setArchitectures(['x86_64']);
      }

      // Auto detect version: e.g. 1.2.3 or v1.2.3
      const versionMatch = filename.match(/v?(\d+\.\d+(\.\d+)?)/i);
      if (versionMatch && versionMatch[1] && !version) {
        setVersion(versionMatch[1]);
      }

      // Auto detect name
      if (!name) {
        const cleanName = filename
          .replace(/\.appimage$/i, '')
          .replace(/[-_]v?\d+.*$/i, '')
          .replace(/[-_]x86_64.*$/i, '')
          .replace(/[-_]linux.*$/i, '');
        if (cleanName) {
          setName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        }
      }

      setTestedUrl(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchitectureToggle = (arch: Architecture) => {
    if (architectures.includes(arch)) {
      if (architectures.length > 1) {
        setArchitectures(architectures.filter((a) => a !== arch));
      }
    } else {
      setArchitectures([...architectures, arch]);
    }
  };

  // Generate preview metadata
  const previewApp: AppMetadata = {
    id: name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'custom-app',
    name: name || 'My Linux Application',
    tagline: tagline || 'High-performance Linux desktop application distributed via AppImage',
    description: description || 'No detailed description provided.',
    category,
    version: version || '1.0.0',
    releaseDate: new Date().toISOString().split('T')[0],
    size: size || '50 MB',
    architectures,
    license: license || 'GPL-3.0',
    licenseCategory: license.includes('MIT') || license.includes('Apache') || license.includes('BSD') ? 'Permissive' : 'Open Source',
    publisher: {
      name: publisherName || 'Community Contributor',
      website: homepageUrl || undefined,
      verified: false,
    },
    sha256: sha256.trim() || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    downloadUrl: downloadUrl.trim() || 'https://example.com/app.AppImage',
    iconSlug: 'default',
    tags: tagsInput ? tagsInput.split(',').map((t) => t.trim().toLowerCase()) : ['appimage', 'linux'],
    downloadsCount: 1,
    rating: 5.0,
    isUserAdded: true,
  };

  const previewProtocolUrl = generateNiruviProtocolUrl(previewApp);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setValidationError('Please enter an application name.');
      return;
    }

    if (!downloadUrl.trim() || !downloadUrl.startsWith('http')) {
      setValidationError('Please provide a valid HTTP or HTTPS AppImage download URL.');
      return;
    }

    if (!version.trim()) {
      setValidationError('Please enter a version number.');
      return;
    }

    if (sha256.trim() && sha256.trim().length !== 64) {
      setValidationError('SHA-256 hash must be exactly 64 hexadecimal characters if provided.');
      return;
    }

    // Save to local storage and parent state
    saveCustomApp(previewApp);
    onAppAdded(previewApp);

    setSuccessMessage(`Successfully registered "${previewApp.name}" in your store catalog!`);
  };

  const copyProtocol = () => {
    navigator.clipboard.writeText(previewProtocolUrl);
    setCopiedProtocol(true);
    setTimeout(() => setCopiedProtocol(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 md:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <PlusCircle className="w-4 h-4" />
            <span>Developer & Community Submission</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Submit or Test an AppImage
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Test any upstream AppImage binary or GitHub release URL. Validate its parameters, test the generated <code className="text-blue-300 font-mono text-xs">niruvi://install</code> protocol link, and add it directly to your active store catalog.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={onNavigateToStore}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Browse in Store
          </button>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Form and Preview Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6 bg-slate-800/50 border border-slate-700/80 rounded-2xl p-6">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Application Metadata</h3>

            {/* Download URL with Auto-detect */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  AppImage Release / Download URL <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoDetectFromUrl}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-detect from URL</span>
                </button>
              </div>
              <input
                id="submit-download-url"
                type="url"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/releases/download/v1.0.0/App-1.0.0-x86_64.AppImage"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="text-[11px] text-slate-400">
                Direct link to the .AppImage binary hosted on GitHub Releases, GitLab, or developer CDN.
              </p>
            </div>

            {/* Name & Version */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Application Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="submit-app-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. FreeTube, Joplin, PrusaSlicer"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Version <span className="text-rose-400">*</span>
                </label>
                <input
                  id="submit-version"
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. 1.4.2"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Tagline (Short Summary)
              </label>
              <input
                id="submit-tagline"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Privacy-focused open source desktop media client"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Category & License */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Category</label>
                <select
                  id="submit-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Development">Development</option>
                  <option value="Graphics & Design">Graphics & Design</option>
                  <option value="Audio & Video">Audio & Video</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Games">Games</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">License</label>
                <input
                  id="submit-license"
                  type="text"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  placeholder="GPL-3.0, MIT, Apache-2.0"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* SHA-256 Hash & Package Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Cryptographic SHA-256 Checksum
                </label>
                <input
                  id="submit-sha256"
                  type="text"
                  value={sha256}
                  onChange={(e) => setSha256(e.target.value)}
                  placeholder="64-char hexadecimal hash (optional)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Approximate Size</label>
                <input
                  id="submit-size"
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="e.g. 78.4 MB"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Architectures */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Supported Architectures</label>
              <div className="flex gap-2">
                {(['x86_64', 'aarch64', 'armhf'] as Architecture[]).map((arch) => (
                  <button
                    key={arch}
                    type="button"
                    onClick={() => handleArchitectureToggle(arch)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      architectures.includes(arch)
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
                    }`}
                  >
                    {arch}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Description</label>
              <textarea
                id="submit-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive description of the application, key features, and user workflows..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
              />
            </div>

            {/* Publisher & Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Publisher Name</label>
                <input
                  id="submit-publisher"
                  type="text"
                  value={publisherName}
                  onChange={(e) => setPublisherName(e.target.value)}
                  placeholder="Author or Organization"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Project Website</label>
                <input
                  id="submit-homepage"
                  type="url"
                  value={homepageUrl}
                  onChange={(e) => setHomepageUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Tags (comma-separated)</label>
              <input
                id="submit-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="linux, audio, editor, git, open-source"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Persists to local browser session catalog
            </span>
            <button
              id="submit-app-btn"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all hover:scale-[1.01]"
            >
              Add Application to Store
            </button>
          </div>
        </form>

        {/* Live Protocol Preview Column */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white">Live Card Preview</h4>
            
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-white">
                  <Terminal className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h5 className="font-bold text-white text-sm">{previewApp.name}</h5>
                  <p className="text-xs text-slate-400">v{previewApp.version} • {previewApp.publisher.name}</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">{previewApp.tagline}</p>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {previewApp.category}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {previewApp.size}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Generated niruvi:// URI:</span>
                <button
                  type="button"
                  onClick={copyProtocol}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {copiedProtocol ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedProtocol ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px] text-emerald-400 break-all select-all leading-tight">
{previewProtocolUrl}
              </pre>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs text-slate-400">
            <h5 className="font-semibold text-white">Niruvi Protocol Specification</h5>
            <p className="leading-relaxed">
              When launching an install command, Niruvi parses the <code>id</code>, <code>url</code>, <code>version</code>, and <code>sha256</code> query parameters to ensure atomic downloads and bit-for-bit integrity validation before creating desktop entries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
