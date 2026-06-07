import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroSettingsProps {
  settings: any;
  heroImages: string[];
  setHeroImages: React.Dispatch<React.SetStateAction<string[]>>;
  heroLogos: {name: string, src: string}[];
  setHeroLogos: React.Dispatch<React.SetStateAction<{name: string, src: string}[]>>;
}

const HeroSettings: React.FC<HeroSettingsProps> = ({ 
  settings, 
  heroImages, 
  setHeroImages,
  heroLogos = [],
  setHeroLogos
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    const newImages = [...heroImages];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    setHeroImages(newImages);
    setDraggedIndex(null);
  };

  const [isHeroDragging, setIsHeroDragging] = useState(false);

  const handleImageUpload = (files: FileList | null) => {
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1080;
            const MAX_HEIGHT = 608;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
            setHeroImages(prev => [...prev, compressedDataUrl]);
          };
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const [logoDraggedIndex, setLogoDraggedIndex] = useState<number | null>(null);
  const [isLogoDragging, setIsLogoDragging] = useState(false);

  const handleLogoUpload = (files: FileList | null) => {
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 200;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
              if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/png', 0.8);
            setHeroLogos(prev => [...prev, { name: file.name.split('.')[0], src: compressedDataUrl }]);
          };
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleLogoDropReorder = (index: number) => {
    if (logoDraggedIndex === null) return;
    const newLogos = [...heroLogos];
    const item = newLogos[logoDraggedIndex];
    newLogos.splice(logoDraggedIndex, 1);
    newLogos.splice(index, 0, item);
    setHeroLogos(newLogos);
    setLogoDraggedIndex(null);
  };

  return (
    <div className="space-y-5 md:space-y-10">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-10">
        {/* Left Column: Text Content */}
        <div className="space-y-3.5 md:space-y-6">
          <div>
            <label className="block text-[11px] md:text-sm font-normal text-blue-400 mb-1.5 md:mb-3">Badge Text</label>
            <input 
              id="hero_badge"
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[11px] md:text-sm"
              placeholder="e.g. JASA PEMBUATAN WEBSITE & APLIKASI"
              defaultValue={settings.hero_badge || ""}
            />
          </div>
          <div>
            <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Main Heading</label>
            <textarea 
              id="hero_title"
              className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-4 text-white outline-none focus:border-blue-500/50 transition-all overflow-hidden min-h-[80px] resize-y text-sm md:text-lg font-semibold"
              placeholder="Enter main hero title..."
              defaultValue={settings.hero_title || ""}
            />
          </div>
          <div>
            <label className="block text-[11px] md:text-sm font-normal text-slate-400 mb-1.5 md:mb-3">Sub-heading Description</label>
            <textarea 
              id="hero_subtitle"
              className="w-full bg-white/5 border border-white/10 rounded-lg md:rounded-2xl px-3 py-2.5 md:px-5 md:py-4 text-white outline-none focus:border-blue-500/50 transition-all overflow-hidden min-h-[100px] resize-y text-[10px] md:text-sm text-slate-400"
              placeholder="Enter supporting description..."
              defaultValue={settings.hero_subtitle || ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:gap-4 pt-0.5 md:pt-2">
            <div>
              <label className="block text-[11px] md:text-sm font-normal text-orange-400 mb-1.5 md:mb-3">Primary Button</label>
              <input id="hero_primary_btn" className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[10px] md:text-sm" defaultValue={settings.hero_primary_btn || "Lihat Produk Kami"} />
            </div>
            <div>
              <label className="block text-[11px] md:text-sm font-normal text-orange-400 mb-1.5 md:mb-3">Secondary Button</label>
              <input id="hero_secondary_btn" className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 md:px-5 md:py-3 text-white outline-none focus:border-blue-500/50 transition-all text-[10px] md:text-sm" defaultValue={settings.hero_secondary_btn || "Hubungi Kami"} />
            </div>
          </div>
        </div>

        {/* Right Column: Multiple Image Slider Settings */}
        <div className="space-y-3.5 md:space-y-6">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] md:text-sm font-normal text-slate-400">Slider Images</label>
            <span className="text-[8px] md:text-[10px] text-slate-500 font-bold">{heroImages.length} IMAGES</span>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-4">
            <AnimatePresence>
              {heroImages.map((src, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <div 
                    className={`aspect-video rounded-lg bg-white/5 border border-white/10 overflow-hidden relative group cursor-move transition-all ${draggedIndex === index ? 'opacity-30 scale-95' : 'opacity-100'}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                  >
                    <img src={src} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setHeroImages(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={10} />
                    </button>
                    <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/50 backdrop-blur-md rounded text-[7px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      #{index + 1}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <label 
              onDragOver={(e) => { e.preventDefault(); setIsHeroDragging(true); }}
              onDragLeave={() => setIsHeroDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsHeroDragging(false);
                handleImageUpload(e.dataTransfer.files);
              }}
              className={`aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 md:gap-3 cursor-pointer group transition-all ${isHeroDragging ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-white/10 bg-white/5 hover:border-blue-500/50'}`}
            >
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
              <div className={`p-1.5 md:p-3 rounded-full transition-all ${isHeroDragging ? 'bg-blue-500/20' : 'bg-white/5 group-hover:bg-blue-500/20'}`}>
                <Plus className={`w-3.5 h-3.5 md:w-6 md:h-6 transition-colors ${isHeroDragging ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-400'}`} />
              </div>
              <span className={`text-[7px] md:text-[10px] font-bold uppercase tracking-widest transition-colors ${isHeroDragging ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`}>
                {isHeroDragging ? 'Drop!' : 'Add'}
              </span>
            </label>
          </div>

          <div className="p-3 md:p-5 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-2.5 md:gap-4">
            <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/20 h-fit">
              <HelpCircle size={12} className="text-blue-400 md:size-[18px]" />
            </div>
            <p className="text-[9px] md:text-xs text-slate-400 leading-relaxed font-medium">
              Images rotate automatically. Recommended: 1920×1080px.
            </p>
          </div>
        </div>
      </div>

      {/* NEW: Logo Gallery Section */}
      <div className="space-y-3.5 md:space-y-6 pt-6 md:pt-10 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm md:text-lg font-normal text-white">Partner Logos</h3>
            <p className="text-[9px] md:text-xs text-slate-500 mt-0.5 md:mt-1 font-medium">Manage logos appearing in "Trusted By" section.</p>
          </div>
          <span className="text-[7px] md:text-[10px] text-slate-400 font-black uppercase tracking-tighter bg-white/5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg">{heroLogos.length} ITEMS</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 md:gap-6">

          <AnimatePresence>
            {heroLogos.map((logo, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="group relative"
              >
                <div 
                  className={`aspect-square rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-center relative overflow-hidden transition-all cursor-move ${logoDraggedIndex === index ? 'opacity-30 scale-95' : 'opacity-100'} group-hover:border-blue-500/50`}
                  draggable
                  onDragStart={() => setLogoDraggedIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleLogoDropReorder(index)}
                >
                  <img src={logo.src} alt={logo.name} className="max-w-full max-h-full object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all pointer-events-none" />
                  <button 
                    onClick={() => setHeroLogos(prev => prev.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 z-10"
                  >
                    <X size={12} />
                  </button>
                </div>
                <input 
                  type="text" 
                  value={logo.name}
                  onChange={(e) => {
                    const newLogos = [...heroLogos];
                    newLogos[index].name = e.target.value;
                    setHeroLogos(newLogos);
                  }}
                  className="w-full mt-3 bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-[10px] text-center text-slate-300 focus:text-white focus:border-blue-500/50 outline-none font-medium uppercase tracking-wider transition-all"
                  placeholder="Nama Logo..."
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <label 
            onDragOver={(e) => { e.preventDefault(); setIsLogoDragging(true); }}
            onDragLeave={() => setIsLogoDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsLogoDragging(false);
              handleLogoUpload(e.dataTransfer.files);
            }}
            className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer group transition-all ${isLogoDragging ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-white/10 bg-white/5 hover:border-blue-500/50'}`}
          >
            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files)} />
            <Plus className={`w-5 h-5 transition-colors ${isLogoDragging ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`} />
            <span className={`text-[10px] font-bold uppercase transition-colors ${isLogoDragging ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`}>
              {isLogoDragging ? 'Drop Now!' : 'Add Logo'}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

// HelpCircle was missing from imports
const HelpCircle = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default HeroSettings;
