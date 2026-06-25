'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[0.7rem] uppercase font-bold text-bg-dark tracking-[0.02em]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          bg-surface border-[1.5px] border-transparent rounded-[10px]
          px-4 py-3 text-sm text-text-dark outline-none
          transition-colors duration-200
          focus:border-primary
          placeholder:text-text-dark/40
          ${error ? 'border-primary' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <span className="text-xs text-primary font-medium">{error}</span>
      )}
    </div>
  );
}
