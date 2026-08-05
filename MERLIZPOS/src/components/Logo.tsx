import React from 'react';

interface LogoProps {
  variant?: 'icon' | 'full' | 'banner';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ variant = 'full', className = '', size = 'md' }) => {
  if (variant === 'icon') {
    // Compact Gold Metallic 3-Bar Emblem
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="goldGradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcedb4" />
              <stop offset="35%" stopColor="#e5c158" />
              <stop offset="70%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#8a6100" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" fill="#000000" rx="20" />
          <g fill="url(#goldGradIcon)">
            <polygon points="120,30 120,55 50,125 50,100" />
            <polygon points="150,40 150,65 50,165 50,140" />
            <polygon points="150,85 150,110 80,180 80,155" />
          </g>
        </svg>
      </div>
    );
  }

  // Full Brand Logo with exact branding text
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(212,175,55,0.25)] border border-[#d4af37]/40 shrink-0">
        <img src="/logo.svg" alt="MerLiz Holdings" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-cinzel font-bold text-base sm:text-lg tracking-wider text-gold-gradient leading-tight">
            MerLiz Holdings
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
            (PTY) Ltd
          </span>
        </div>
        <span className="text-[10px] text-gray-400 tracking-wider">Taking you there • Point of Sale Service</span>
      </div>
    </div>
  );
};
