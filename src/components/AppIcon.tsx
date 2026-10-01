import React, { useState } from 'react';

export interface AppIconProps {
  slug: string;
  className?: string;
  iconUrl?: string;
  name?: string;
  brandColor?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  slug,
  className = 'w-7 h-7',
  iconUrl,
  name,
  brandColor,
}) => {
  const [imgError, setImgError] = useState(false);

  const iconAltText = `${name || slug} icon`;

  if (!imgError && iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={iconAltText}
        className={`${className} object-contain drop-shadow-sm`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  }

  return renderFallbackSvg(slug, className, brandColor, name);
};

function renderFallbackSvg(slug: string, className: string, brandColor?: string, name?: string) {
  switch (slug) {
    case 'vscodium':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M16 2L8.5 7.5L3.5 4L2 5.5L6.5 12L2 18.5L3.5 20L8.5 16.5L16 22L22 19V5L16 2Z" fill="#2F80ED" fillOpacity="0.2" stroke="#2F80ED" strokeLinejoin="round" />
          <path d="M16 7L8.5 12L16 17" stroke="#2F80ED" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 5V19" stroke="#60A5FA" />
        </svg>
      );

    case 'blender':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="14" r="5" fill="#EA7600" />
          <circle cx="12" cy="14" r="2.5" fill="#225b99" />
          <path d="M12 9V3" stroke="#EA7600" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M7 11.5L3 8" stroke="#EA7600" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M17 11.5L21 8" stroke="#EA7600" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'krita':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 3.5 1.8 6.58 4.55 8.35.35.23.82.13.98-.27l1.2-3.08a2 2 0 0 1 1.85-1.28h2.84a2 2 0 0 0 1.94-1.52l.86-3.44a4 4 0 0 1 3.88-3.04H21a9.98 9.98 0 0 0-9-7.72z" fill="#3B82F6" />
          <circle cx="7" cy="8" r="1.5" fill="#F43F5E" />
          <circle cx="11.5" cy="6" r="1.5" fill="#10B981" />
          <circle cx="16" cy="8.5" r="1.5" fill="#F59E0B" />
          <path d="M15 15l6 6m-1.5-6.5l3.5 3.5" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'obs-studio':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="10" stroke="#334155" strokeWidth="1.5" fill="#0F172A" />
          <path d="M12 6a6 6 0 0 1 6 6c0 1.66-.67 3.16-1.76 4.24l-3.53-3.53a2 2 0 0 0 .29-.71H17a5 5 0 0 0-5-5V6z" fill="#94A3B8" />
          <path d="M6 12a6 6 0 0 1 6-6v1a5 5 0 0 0-5 5c0 .28.02.56.07.82l-1.07.45V12z" fill="#CBD5E1" />
          <path d="M12 18a6 6 0 0 1-5.2-3l1.73-1A4 4 0 0 0 12 16a4 4 0 0 0 3.46-2l1.74 1A6 6 0 0 1 12 18z" fill="#E2E8F0" />
          <circle cx="12" cy="12" r="2.5" fill="#3B82F6" />
        </svg>
      );

    case 'audacity':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M4 14v-3a8 8 0 0 1 16 0v3" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
          <rect x="2" y="13" width="4" height="7" rx="2" fill="#3B82F6" />
          <rect x="18" y="13" width="4" height="7" rx="2" fill="#3B82F6" />
          <path d="M9 14v-4m3 6V8m3 6v-3" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'obsidian':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M8.5 2.5L18 6.5L21.5 15L14.5 21.5L3 17.5L5.5 8L8.5 2.5Z" fill="#7C3AED" fillOpacity="0.2" stroke="#8B5CF6" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M8.5 2.5L12.5 11L14.5 21.5" stroke="#A78BFA" strokeWidth="1.5" />
          <path d="M18 6.5L12.5 11L3 17.5" stroke="#A78BFA" strokeWidth="1.5" />
          <circle cx="12.5" cy="11" r="1.5" fill="#C4B5FD" />
        </svg>
      );

    case 'keepassxc':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M12 2L4 5V11C4 16.5 7.4 21.7 12 23C16.6 21.7 20 16.5 20 11V5L12 2Z" fill="#059669" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.75" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.5" stroke="#34D399" strokeWidth="1.5" />
          <path d="M12 12.5V17m-1.5 0h3m-1.5-2.5h1.5" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'bruno':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="4" width="18" height="16" rx="4" fill="#D97706" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="1.75" />
          <circle cx="8" cy="10" r="1.5" fill="#FBBF24" />
          <circle cx="16" cy="10" r="1.5" fill="#FBBF24" />
          <path d="M9 15h6" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 3v2m-6 0l1 2m11-2l-1 2" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'vlc':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M10 2H14L18 19H6L10 2Z" fill="#EA580C" />
          <path d="M8.5 12H15.5L16.5 16H7.5L8.5 12Z" fill="#F8FAFC" />
          <rect x="4" y="19" width="16" height="3" rx="1" fill="#EA580C" />
        </svg>
      );

    case 'inkscape':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M4 18L10 4L13 10L16 7L20 18H4Z" stroke="#475569" strokeWidth="1.75" fill="#1E293B" strokeLinejoin="round" />
          <path d="M10 4L13 10" stroke="#94A3B8" strokeWidth="1.5" />
          <path d="M7 21C5 21 4 20 4 18h16c0 2-1 3-3 3H7z" fill="#0284C7" />
          <circle cx="10" cy="4" r="1" fill="#38BDF8" />
        </svg>
      );

    case 'freecad':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="3" width="18" height="18" rx="3" fill="#DC2626" fillOpacity="0.2" stroke="#EF4444" strokeWidth="1.75" />
          <path d="M7 6H17V9H10V11H15V14H10V18H7V6Z" fill="#EF4444" />
          <path d="M18 15L15 18M15 15L18 18" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'supertuxkart':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" stroke="#10B981" strokeWidth="1.75" fill="#064E3B" fillOpacity="0.4" />
          <circle cx="12" cy="12" r="3" stroke="#34D399" strokeWidth="1.5" />
          <path d="M12 3v6m0 6v6M3 12h6m6 0h6" stroke="#10B981" strokeWidth="1.75" />
        </svg>
      );

    case 'vscode':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M16 2L8.5 7.5L3.5 4L2 5.5L6.5 12L2 18.5L3.5 20L8.5 16.5L16 22L22 19V5L16 2Z" fill="#007ACC" fillOpacity="0.2" stroke="#007ACC" strokeLinejoin="round" />
          <path d="M16 7L8.5 12L16 17" stroke="#007ACC" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 5V19" stroke="#3EA6FF" />
        </svg>
      );

    case 'freetube':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="2" y="4" width="20" height="13" rx="3" fill="#FF3E3E" fillOpacity="0.2" stroke="#FF3E3E" strokeWidth="1.75" />
          <path d="M10 7.5l6 3.5l-6 3.5v-7z" fill="#FF3E3E" />
          <path d="M6 20h12" stroke="#FF3E3E" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 17v3" stroke="#FF3E3E" strokeWidth="2" />
        </svg>
      );

    case 'etcher':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" fill="#00A38C" fillOpacity="0.2" stroke="#00A38C" strokeWidth="1.75" />
          <path d="M12 7v7M9.5 11.5l2.5 2.5l2.5-2.5" stroke="#00A38C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="8" y="16" width="8" height="2" rx="0.5" fill="#00A38C" />
        </svg>
      );

    case 'zen':
    case 'zen-browser':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" role="img" aria-label={`${name || slug} icon`}>
          <circle cx="12" cy="12" r="9.5" fill="#EA580C" fillOpacity="0.18" stroke="#F97316" strokeWidth="1.75" />
          <path d="M12 5.5C8.41 5.5 5.5 8.41 5.5 12C5.5 14.1 6.5 15.96 8.05 17.15C9.15 15.65 10.95 14.7 13 14.7C15.9 14.7 18.25 17.05 18.25 19.95C18.42 19.4 18.5 18.75 18.5 18C18.5 14.41 15.59 11.5 12 11.5C9.95 11.5 8.18 12.45 7.05 13.92C7.02 13.3 7 12.66 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12" stroke="#FB923C" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.2" fill="#F97316" />
        </svg>
      );

    case 'libreoffice':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" role="img" aria-label={`${name || slug} icon`}>
          <rect x="4" y="3" width="16" height="18" rx="2" fill="#16A34A" fillOpacity="0.15" stroke="#16A34A" strokeWidth="1.75" />
          <path d="M8 8h8M8 12h8M8 16h5" stroke="#16A34A" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );

    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9.5" fill="#0284C7" fillOpacity="0.15" stroke="#0284C7" strokeWidth="1.75" />
          <path d="M5.5 11.5l12.5-5l-4 13l-3.5-3.5l-2 2l.5-4z" fill="#0284C7" />
        </svg>
      );

    case 'signal':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9.5" fill="#2563EB" fillOpacity="0.15" stroke="#2563EB" strokeWidth="1.75" />
          <path d="M8 12a4 4 0 0 1 8 0c0 2.5-2 4-4 4h-3v-3" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'element':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="4" y="4" width="16" height="16" rx="4" fill="#0DBD8B" fillOpacity="0.15" stroke="#0DBD8B" strokeWidth="1.75" />
          <path d="M8 8h8v8H8z" stroke="#0DBD8B" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="2" fill="#0DBD8B" />
        </svg>
      );

    case 'qbittorrent':
    case 'transmission':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9.5" fill="#2563EB" fillOpacity="0.15" stroke="#2563EB" strokeWidth="1.75" />
          <path d="M12 7v7M9 11l3 3l3-3" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 17h8" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'cemu':
    case 'dolphin-emu':
    case 'rpcs3':
    case 'pcsx2':
    case 'ppsspp':
    case 'retroarch':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="6" width="18" height="12" rx="3" fill="#4F46E5" fillOpacity="0.15" stroke="#4F46E5" strokeWidth="1.75" />
          <path d="M6 12h4M8 10v4" stroke="#4F46E5" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="15.5" cy="11" r="1" fill="#4F46E5" />
          <circle cx="17.5" cy="13" r="1" fill="#4F46E5" />
        </svg>
      );

    case 'appimagelauncher':
    case 'appimageupdater':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="4" width="18" height="16" rx="3" fill="#0284C7" fillOpacity="0.15" stroke="#0284C7" strokeWidth="1.75" />
          <path d="M12 8v8M8 12h8" stroke="#0284C7" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M9 16l3-3l3 3" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'shard':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="1.75" strokeLinejoin="round" />
          <line x1="12" y1="22" x2="12" y2="12" stroke="#10B981" strokeWidth="1.5" />
          <polyline points="21 7 12 12 3 7" stroke="#10B981" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill="#10B981" />
        </svg>
      );

    case 'flare':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M12 2c1 5 6 7 6 12a6 6 0 1 1-12 0c0-5 5-7 6-12z" fill="#F97316" fillOpacity="0.2" stroke="#F97316" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M12 10c0.8 3 3 4.5 3 7a3 3 0 1 1-6 0c0-2.5 2.2-4 3-7z" fill="#F97316" />
        </svg>
      );

    case 'auto-wall':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" fill="#E11D48" fillOpacity="0.15" stroke="#E11D48" strokeWidth="1.75" />
          <path d="M3 9h18M3 15h18M9 3v6M15 9v6M9 15v6" stroke="#E11D48" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );

    case 'pho':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M4 11c0 5 3.5 8 8 8s8-3 8-8H4z" fill="#EA580C" fillOpacity="0.15" stroke="#EA580C" strokeWidth="1.75" />
          <path d="M8 6l8 3M9 4l6 4M7 19h10" stroke="#EA580C" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );

    case 'ktube':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="5" width="18" height="14" rx="4" fill="#EF4444" fillOpacity="0.15" stroke="#EF4444" strokeWidth="1.75" />
          <polygon points="10 8 16 12 10 16 10 8" fill="#EF4444" />
        </svg>
      );

    case 'phoenix-firestorm':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" fill="#E11D48" fillOpacity="0.15" stroke="#E11D48" strokeWidth="1.75" />
          <path d="M12 4c-3 4-1 8-4 10c4 0 5-3 5-3s1 3 5 3c-3-2-1-6-4-10z" fill="#E11D48" />
        </svg>
      );

    case 'arch-deployer':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M12 3L3 21h18L12 3z" fill="#1793D1" fillOpacity="0.15" stroke="#1793D1" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M8 15l4-5l4 5" stroke="#1793D1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'portable-linux-apps':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#059669" fillOpacity="0.2" stroke="#059669" strokeWidth="1.75" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#059669" fillOpacity="0.2" stroke="#059669" strokeWidth="1.75" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#059669" fillOpacity="0.2" stroke="#059669" strokeWidth="1.75" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#059669" fillOpacity="0.2" stroke="#059669" strokeWidth="1.75" />
        </svg>
      );

    case 'appimage-recipes':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z" fill="#2563EB" fillOpacity="0.15" stroke="#2563EB" strokeWidth="1.75" />
          <path d="M8 7h8M8 11h8M8 15h5" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );

    case 'duckstation':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="2" y="6" width="20" height="12" rx="3" fill="#E11D48" fillOpacity="0.15" stroke="#E11D48" strokeWidth="1.75" />
          <circle cx="8" cy="12" r="2.5" stroke="#E11D48" strokeWidth="1.5" />
          <path d="M15 10l2 2l-2 2M17 12h-3" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'jan':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" fill="#6366F1" fillOpacity="0.15" stroke="#6366F1" strokeWidth="1.75" />
          <path d="M9 10a3 3 0 0 1 6 0v4a3 3 0 0 1-6 0" stroke="#6366F1" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.5" fill="#6366F1" />
        </svg>
      );

    case 'anything-llm':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="4" width="18" height="16" rx="3" fill="#0EA5E9" fillOpacity="0.15" stroke="#0EA5E9" strokeWidth="1.75" />
          <path d="M7 9h10M7 12h7M7 15h4" stroke="#0EA5E9" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="17" cy="15" r="1.5" fill="#0EA5E9" />
        </svg>
      );

    case 'helix':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M4 4l16 16M4 20L20 4" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="4" fill="#A855F7" fillOpacity="0.2" stroke="#A855F7" strokeWidth="1.75" />
        </svg>
      );

    case 'darktable':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" fill="#EAB308" fillOpacity="0.15" stroke="#EAB308" strokeWidth="1.75" />
          <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" stroke="#EAB308" strokeWidth="1.2" strokeOpacity="0.7" />
          <circle cx="12" cy="12" r="4" fill="#EAB308" />
        </svg>
      );

    case 'bleachbit':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M19 4L5 18l-2 3l3-2L20 5z" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M14 9l3 3M17 6l3 3" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'claude-desktop-extra':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" fill="#D97706" fillOpacity="0.15" stroke="#D97706" strokeWidth="1.75" />
          <path d="M8 12h8M12 8v8" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'codex-desktop-linux':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" fill="#10A37F" fillOpacity="0.15" stroke="#10A37F" strokeWidth="1.75" />
          <path d="M8 12a4 4 0 0 1 8 0c0 2-2 3-4 4v1M12 19h.01" stroke="#10A37F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'spotify-appimage':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" fill="#1DB954" fillOpacity="0.15" stroke="#1DB954" strokeWidth="1.75" />
          <path d="M7 9.5c3.5-1 7-0.5 10 1M7.5 12.5c3-0.8 6-0.4 8.5 0.8M8 15.5c2.5-0.6 5-0.3 7 0.6" stroke="#1DB954" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );

    case 'deezer-linux':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="14" width="3" height="6" rx="1" fill="#EF5466" />
          <rect x="7.5" y="10" width="3" height="10" rx="1" fill="#EF5466" />
          <rect x="12" y="6" width="3" height="14" rx="1" fill="#EF5466" />
          <rect x="16.5" y="11" width="3" height="9" rx="1" fill="#EF5466" />
          <circle cx="12" cy="12" r="9" stroke="#EF5466" strokeWidth="1.75" fill="#EF5466" fillOpacity="0.1" />
        </svg>
      );

    case 'winampfy':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="4" width="18" height="16" rx="3" fill="#F59E0B" fillOpacity="0.15" stroke="#F59E0B" strokeWidth="1.75" />
          <path d="M13 6l-5 8h4l-2 4l6-8h-4l1-4z" fill="#F59E0B" stroke="#F59E0B" strokeWidth="0.5" />
        </svg>
      );

    case 'localsend':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" fill="#06B6D4" fillOpacity="0.15" stroke="#06B6D4" strokeWidth="1.75" />
          <path d="M12 7l4 4m-4-4l-4 4m4-4v10" stroke="#06B6D4" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'appflowy':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="1.75" />
          <path d="M8 8h8M8 12h5M8 16h8" stroke="#10B981" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );

    case 'anytype':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" fill="#F97316" fillOpacity="0.15" stroke="#F97316" strokeWidth="1.75" />
          <circle cx="8" cy="12" r="2" fill="#F97316" />
          <circle cx="16" cy="12" r="2" fill="#F97316" />
          <path d="M10 12h4" stroke="#F97316" strokeWidth="1.5" />
        </svg>
      );

    case 'logseq':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="9" fill="#14B8A6" fillOpacity="0.15" stroke="#14B8A6" strokeWidth="1.75" />
          <path d="M12 7v5l3 3" stroke="#14B8A6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'marktext':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="4" width="18" height="16" rx="3" fill="#6B7280" fillOpacity="0.15" stroke="#6B7280" strokeWidth="1.75" />
          <path d="M7 15V9l3 3l3-3v6M17 11l-2 3h4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'gittyup':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="6" cy="6" r="3" fill="#EC4899" fillOpacity="0.2" stroke="#EC4899" strokeWidth="1.5" />
          <circle cx="6" cy="18" r="3" fill="#EC4899" fillOpacity="0.2" stroke="#EC4899" strokeWidth="1.5" />
          <circle cx="18" cy="9" r="3" fill="#EC4899" fillOpacity="0.2" stroke="#EC4899" strokeWidth="1.5" />
          <path d="M6 9v6M9 6h4a5 5 0 0 1 5 3" stroke="#EC4899" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );

    case 'tabby':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="2" y="4" width="20" height="16" rx="3" fill="#6366F1" fillOpacity="0.15" stroke="#6366F1" strokeWidth="1.75" />
          <path d="M6 9l4 3l-4 3M12 15h6" stroke="#6366F1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'wezterm':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="4" width="18" height="16" rx="3" fill="#4F46E5" fillOpacity="0.15" stroke="#4F46E5" strokeWidth="1.75" />
          <path d="M7 8l3 8l2-5l2 5l3-8" stroke="#4F46E5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'upscayl':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="#8B5CF6" fillOpacity="0.15" stroke="#8B5CF6" strokeWidth="1.75" />
          <path d="M8 16l4-8l4 8M10 13h4" stroke="#8B5CF6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="17" cy="7" r="1.5" fill="#8B5CF6" />
        </svg>
      );

    case 'cherry-studio':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="8" cy="16" r="4" fill="#F43F5E" fillOpacity="0.2" stroke="#F43F5E" strokeWidth="1.75" />
          <circle cx="16" cy="16" r="4" fill="#F43F5E" fillOpacity="0.2" stroke="#F43F5E" strokeWidth="1.75" />
          <path d="M8 12c2-4 6-6 8-8c-1 3-2 6-4 8" stroke="#F43F5E" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );

    case 'caprine':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="#0084FF" fillOpacity="0.15" stroke="#0084FF" strokeWidth="1.75" />
          <path d="M8 13l3-3l2 2l3-3" stroke="#0084FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );


    default:
      if (name) {
        return (
          <div
            role="img"
            aria-label={`${name} icon`}
            className={`${className} rounded-xl flex items-center justify-center font-bold text-white shadow-inner select-none text-base`}
            style={{ backgroundColor: brandColor || '#3B82F6' }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        );
      }
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="img"
          aria-label={`${slug} icon`}
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
  }
}

