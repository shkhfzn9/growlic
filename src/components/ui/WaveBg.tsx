import React from 'react';

interface WaveBgProps {
  children: React.ReactNode;
  className?: string;
}

export default function WaveBg({ children, className = '' }: WaveBgProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-bg-dark to-bg-darker" />
      <svg
        className="absolute bottom-0 left-0 w-full h-[40%] opacity-100"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,154.7C672,149,768,171,864,186.7C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          fill="#C0181A"
          fillOpacity="0.15"
        />
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
