import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  fallback?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
};

export default function Avatar({ src, alt = '', size = 'md', fallback, className = '' }: AvatarProps) {
  const initials = fallback || alt.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`
          rounded-full object-cover border-2 border-white/30
          ${sizeStyles[size]}
          ${className}
        `}
      />
    );
  }

  return (
    <div
      className={`
        rounded-full bg-primary/20 border-2 border-white/30
        flex items-center justify-center font-bold text-white
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {initials}
    </div>
  );
}
