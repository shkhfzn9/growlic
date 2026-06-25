import React from 'react';

type BadgeVariant = 'primary' | 'gold' | 'white' | 'dark';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary text-white',
  gold: 'bg-cta text-text-dark',
  white: 'bg-white text-primary',
  dark: 'bg-bg-dark text-white',
};

export default function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-1 rounded-full
        text-[0.7rem] font-bold uppercase tracking-wide
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
