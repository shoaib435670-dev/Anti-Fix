import React from 'react';

interface AntiFixLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'splash';
  showTagline?: boolean;
}

export const AntiFixLogo: React.FC<AntiFixLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = false,
}) => {
  const sizeMap = {
    sm: 'w-24 h-14',
    md: 'w-36 h-20',
    lg: 'w-48 h-28',
    xl: 'w-64 h-36',
    splash: 'w-72 h-44 sm:w-96 sm:h-56',
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
      <div className={`relative ${sizeMap[size]}`}>
        <img
          src="/logo.svg"
          alt="AntiFix Official Logo"
          className="w-full h-full object-contain filter drop-shadow-md"
        />
      </div>
      {showTagline && (
        <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-400 mt-1 uppercase font-mono">
          Your PDF. Your Control.
        </span>
      )}
    </div>
  );
};
