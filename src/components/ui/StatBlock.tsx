import React from 'react';

interface StatBlockProps {
  value: string | number;
  label: string;
  valueColor?: 'white' | 'gold';
  className?: string;
}

export default function StatBlock({
  value,
  label,
  valueColor = 'white',
  className = '',
}: StatBlockProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <span
        className={`
          font-black leading-none
          text-[clamp(2.5rem,5vw,4rem)]
          ${valueColor === 'gold' ? 'text-cta' : 'text-white'}
        `}
      >
        {value}
      </span>
      <span className="text-[0.85rem] uppercase tracking-[0.08em] opacity-75 text-white mt-1">
        {label}
      </span>
    </div>
  );
}
