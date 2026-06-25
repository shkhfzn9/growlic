import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.10)]
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
