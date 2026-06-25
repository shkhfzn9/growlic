'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-cta text-text-dark hover:brightness-105',
  secondary: 'bg-primary text-white hover:brightness-110',
  ghost: 'bg-transparent text-white border-2 border-white hover:bg-white/10',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-7 py-3.5 text-sm',
  lg: 'px-8 py-4 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        font-bold uppercase tracking-[0.05em] rounded-[12px]
        transition-transform duration-200 ease-in-out
        active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer select-none inline-flex items-center justify-center gap-2
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
