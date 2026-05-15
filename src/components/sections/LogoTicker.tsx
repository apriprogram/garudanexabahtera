import React from 'react';

const LogoTicker: React.FC = () => {
  const [logos, setLogos] = React.useState<{ name: string, src: string }[]>([
    { name: 'Garuda Nexa', src: '/assets/logo/logogarudanexa.png' },
    { name: 'I-School', src: '/assets/logo/ischool.png' },
    { name: 'I-Santri', src: '/assets/logo/isantri.png' },
    { name: 'Company Profile', src: '/assets/logo/logogarudanexa.png' },
    { name: 'Garuda Village', src: '/assets/logo/logogarudanexa.png' },
    { name: 'Absensi', src: '/assets/logo/logogarudanexa.png' },
    { name: 'POS', src: '/assets/logo/logogarudanexa.png' },
    { name: 'Digital Invitation', src: '/assets/logo/logoweddingputih.png' },
  ]);

  React.useEffect(() => {
    const fetchLogos = async () => {
      try {
        const response = await fetch('/api.php?action=get_settings');
        const data = await response.json();
        if (data.hero_logos) {
          const parsedLogos = JSON.parse(data.hero_logos);
          if (parsedLogos.length > 0) {
            setLogos(parsedLogos);
          }
        }
      } catch (error) {
        console.error('Error fetching partner logos:', error);
      }
    };
    fetchLogos();
  }, []);

  // Triple the logos to ensure a seamless infinite loop without gaps
  const tickerLogos = [...logos, ...logos, ...logos];

  return (
    <div className="absolute bottom-0 left-0 w-full overflow-hidden bg-white/5 backdrop-blur-md py-3 lg:py-6 border-t border-b border-white/5 z-10">
      <div className="flex items-center gap-[60px] lg:gap-[100px] w-max animate-ticker">
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
        .animate-ticker {
          animation: ticker-scroll 25s linear infinite;
        }
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }
      `}} />
    </div>
  );
};

export default LogoTicker;
