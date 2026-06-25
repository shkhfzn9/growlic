'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#C0181A] text-white hover:bg-[#A01416] focus:ring-[#C0181A]/30',
  secondary: 'bg-white text-[#111827] border border-[#E2E6EA] hover:bg-[#F4F6F9] focus:ring-[#E2E6EA]',
  ghost: 'bg-transparent text-[#6B7280] hover:bg-[#F4F6F9] hover:text-[#111827] focus:ring-[#E2E6EA]',
  danger: 'bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20 hover:bg-[#DC2626] hover:text-white focus:ring-[#DC2626]/30',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export default function AdminButton({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  children,
  disabled,
  className = '',
  ...props
}: AdminButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
