import React from 'react';

const LogoTicker: React.FC = () => {
  const logos = [
    { name: 'Garuda Nexa', src: '/assets/logo/logogarudanexa.png' },
    { name: 'I-School', src: '/assets/logo/ischool.png' },
    { name: 'I-Santri', src: '/assets/logo/isantri.png' },
    { name: 'Company Profile', src: '/assets/logo/logogarudanexa.png' },
    { name: 'Garuda Village', src: '/assets/logo/logogarudanexa.png' },
    { name: 'Absensi', src: '/assets/logo/logogarudanexa.png' },
    { name: 'POS', src: '/assets/logo/logogarudanexa.png' },
    { name: 'Digital Invitation', src: '/assets/logo/logoweddingputih.png' },
  ];

  // Double the logos for seamless animation
  const tickerLogos = [...logos, ...logos];

  return (
    <div className="absolute bottom-0 left-0 w-full overflow-hidden bg-white/5 backdrop-blur-md py-3 lg:py-6 border-t border-b border-white/5 z-10">
      <div className="flex items-center gap-[60px] lg:gap-[100px] w-max animate-[ticker-scroll_30s_linear_infinite]">
        {tickerLogos.map((logo, index) => (
          <div key={index} className="flex items-center gap-2 lg:gap-3 whitespace-nowrap">
            <img 
              src={logo.src} 
              alt={logo.name} 
              className="h-4 lg:h-6 w-auto opacity-70 brightness-0 invert" 
            />
            <span className="text-white/70 text-xs lg:text-sm font-medium tracking-widest uppercase">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
};

export default LogoTicker;
