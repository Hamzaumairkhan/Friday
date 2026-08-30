import { useState } from 'react';

const PALETTES = [
  { bg: 'bg-[#00261D]', text: 'text-[#BBEAD5]', border: 'border-[#00261D]/30' },
  { bg: 'bg-emerald-800', text: 'text-emerald-100', border: 'border-emerald-900' },
  { bg: 'bg-teal-800', text: 'text-teal-100', border: 'border-teal-900' },
  { bg: 'bg-slate-800', text: 'text-slate-100', border: 'border-slate-900' },
  { bg: 'bg-stone-800', text: 'text-amber-100', border: 'border-stone-900' },
  { bg: 'bg-cyan-900', text: 'text-cyan-100', border: 'border-cyan-950' },
];

function getPalette(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

function getInitials(name = '') {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function UserAvatar({
  src,
  name = 'User',
  size = 'md', // xs (24px), sm (32px), md (40px), lg (48px), xl (64px)
  className = '',
}) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs font-bold',
    lg: 'w-12 h-12 text-sm font-bold',
    xl: 'w-16 h-16 text-lg font-bold',
  };

  const palette = getPalette(name);
  const initials = getInitials(name);
  const dimensionClass = sizeClasses[size] || sizeClasses.md;

  const isValidHttp = typeof src === 'string' && src.startsWith('http') && !src.includes('dicebear.com');

  if (isValidHttp && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setImgError(true)}
        className={`${dimensionClass} rounded-full object-cover border border-black/10 shadow-2xs shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dimensionClass} rounded-full ${palette.bg} ${palette.text} ${palette.border} border flex items-center justify-center font-bold tracking-wider select-none shrink-0 shadow-2xs ${className}`}
      title={name}
    >
      <span>{initials}</span>
    </div>
  );
}
