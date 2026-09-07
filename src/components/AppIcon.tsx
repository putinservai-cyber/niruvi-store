import React from 'react';

interface AppIconProps {
  slug: string;
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ slug, className = 'w-7 h-7' }) => {
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

    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
  }
};
