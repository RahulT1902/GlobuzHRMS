import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showTagline = false }) => {
  const sizes = {
    sm: { icon: 24, text: 'text-lg', tagline: 'text-[6px]' },
    md: { icon: 32, text: 'text-2xl', tagline: 'text-[8px]' },
    lg: { icon: 48, text: 'text-4xl', tagline: 'text-[10px]' },
    xl: { icon: 64, text: 'text-5xl', tagline: 'text-[12px]' },
  };

  const current = sizes[size];

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3">
        {/* Stylized Foldable Display Icon */}
        <div 
          className="relative transition-transform hover:scale-105"
          style={{ width: current.icon, height: current.icon }}
        >
          <div className="absolute inset-0 bg-[#009CDE] rounded-lg rotate-12 flex items-center justify-center transform hover:rotate-0 transition-all duration-300">
             <div className="w-[45%] h-[45%] bg-[#B5D333] rounded-sm -rotate-6"></div>
          </div>
          <div className="absolute inset-0 bg-[#009CDE]/40 rounded-lg -rotate-3 -z-10 blur-[2px]"></div>
        </div>

        {/* Brand Text */}
        <div className="flex items-baseline tracking-tight font-black">
          <span className="text-[#009CDE]">Globuz</span>
          <span className="text-[#B5D333]">Inc</span>
        </div>
      </div>

      {showTagline && (
        <div className={`mt-2 flex items-center gap-2 font-bold uppercase tracking-widest text-[#231F20] ${current.tagline}`}>
          <span>Foldable Displays</span>
          <span className="text-[#009CDE] font-black">|</span>
          <span>POSMs</span>
          <span className="text-[#B5D333] font-black">|</span>
          <span>Corporate Gifting</span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
