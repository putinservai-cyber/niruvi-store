import React from 'react';
import { withBaseUrl } from '../config/site';

interface NiruviLogoProps {
  className?: string;
  size?: number | string;
  withBackground?: boolean;
}

export const NiruviLogo: React.FC<NiruviLogoProps> = ({
  className = '',
  size = 32,
  withBackground = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${
        withBackground ? 'bg-black rounded-xl border border-white/15 shadow-sm' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={withBaseUrl('niruvi-icon.png')}
        alt="Niruvi Logo"
        className="w-full h-full object-contain p-0.5"
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
    </div>
  );
};
