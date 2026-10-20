import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chip, Field, Input, Notice, PanelHeader, Textarea, cn, FOCUS } from '../../components/admin/ui';

/* Tombol hapus kecil di atas gambar pratinjau (latar solid danger). Selalu tampak di HP, muncul saat hover di desktop. */
const REMOVE_BTN = cn(
  'absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-danger text-white transition-opacity hover:bg-danger-700',
  'max-sm:before:absolute max-sm:before:-inset-2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
  FOCUS,
);

/* Kotak unggah (label) bergaris putus-putus; status seret-lepas → cobalt. */
const dropZoneClass = (active: boolean, shape: string) =>
  cn(
    'group flex cursor-pointer flex-col items-center justify-center gap-1.5 border-2 border-dashed transition-colors duration-150',
    'focus-within:ring-2 focus-within:ring-cobalt',
    shape,
    active ? 'border-cobalt bg-adm-cobalt-soft' : 'border-adm-line-strong hover:border-cobalt hover:bg-adm-hover',
  );

interface HeroSettingsProps {
  /** Respons get_settings (setting_key → setting_value). */
  settings: Record<string, string>;
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
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
        {/* Left Column: Text Content */}
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <Field label="Teks badge" htmlFor="hero_badge">
            <Input
              id="hero_badge"
              type="text"
              placeholder="mis. JASA PEMBUATAN WEBSITE & APLIKASI"
              defaultValue={settings.hero_badge || ""}
            />
          </Field>
          <Field label="Judul utama" htmlFor="hero_title">
            <Textarea
              id="hero_title"
              className="min-h-[80px] resize-y font-semibold sm:text-lg"
              placeholder="Tulis judul utama hero..."
              defaultValue={settings.hero_title || ""}
            />
          </Field>
          <Field label="Subjudul" htmlFor="hero_subtitle">
            <Textarea
              id="hero_subtitle"
              className="min-h-[100px] resize-y"
              placeholder="Tulis deskripsi pendukung..."
              defaultValue={settings.hero_subtitle || ""}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tombol utama" htmlFor="hero_primary_btn">
              <Input id="hero_primary_btn" defaultValue={settings.hero_primary_btn || "Lihat Produk Kami"} />
            </Field>
            <Field label="Tombol kedua" htmlFor="hero_secondary_btn">
              <Input id="hero_secondary_btn" defaultValue={settings.hero_secondary_btn || "Hubungi Kami"} />
            </Field>
          </div>
        </div>

        {/* Right Column: Multiple Image Slider Settings */}
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-adm-fg">Gambar slider</p>
            <Chip className="tabular-nums">{heroImages.length} gambar</Chip>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <AnimatePresence>
              {heroImages.map((src, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <div
                    className={cn(
                      'group relative aspect-video cursor-move overflow-hidden rounded-xl bg-adm-ghost ring-1 ring-inset ring-adm-line transition-opacity duration-150',
                      draggedIndex === index ? 'opacity-30' : 'opacity-100',
                    )}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                  >
                    <img src={src} alt={`Slide ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setHeroImages(prev => prev.filter((_, i) => i !== index))}
                      aria-label={`Hapus slide ${index + 1}`}
                      className={REMOVE_BTN}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                    <div className="absolute bottom-1.5 left-1.5 rounded-md bg-obsidian/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
              className={dropZoneClass(isHeroDragging, 'aspect-video rounded-xl')}
            >
              <input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => handleImageUpload(e.target.files)} />
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                  isHeroDragging ? 'bg-cobalt text-white' : 'bg-adm-ghost text-adm-muted group-hover:bg-adm-cobalt-soft group-hover:text-adm-cobalt-fg',
                )}
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
              <span className={cn('text-xs font-medium transition-colors', isHeroDragging ? 'text-adm-cobalt-fg' : 'text-adm-muted group-hover:text-adm-cobalt-fg')}>
                {isHeroDragging ? 'Lepaskan!' : 'Tambah'}
              </span>
            </label>
          </div>

          <Notice tone="cobalt">Gambar berganti otomatis. Disarankan 1920×1080 px.</Notice>
        </div>
      </div>

      {/* NEW: Logo Gallery Section */}
      <div className="space-y-4 border-t border-adm-line pt-6 sm:pt-8">
        <PanelHeader
          titleAs="h3"
          title="Logo partner"
          subtitle="Atur logo yang tampil di deretan logo partner (logo ticker) website."
          action={<Chip className="tabular-nums">{heroLogos.length} logo</Chip>}
          className="mb-0"
        />

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4 md:grid-cols-6">

          <AnimatePresence>
            {heroLogos.map((logo, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="group relative min-w-0"
              >
                <div
                  className={cn(
                    'relative flex aspect-square cursor-move items-center justify-center overflow-hidden rounded-2xl bg-adm-ghost p-3 ring-1 ring-inset ring-adm-line transition-[opacity,box-shadow] duration-150 group-hover:ring-adm-line-strong sm:p-4',
                    logoDraggedIndex === index ? 'opacity-30' : 'opacity-100',
                  )}
                  draggable
                  onDragStart={() => setLogoDraggedIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleLogoDropReorder(index)}
                >
                  <img src={logo.src} alt={logo.name} className="pointer-events-none max-h-full max-w-full object-contain opacity-60 grayscale transition-all group-hover:opacity-100 group-hover:grayscale-0" />
                  <button
                    type="button"
                    onClick={() => setHeroLogos(prev => prev.filter((_, i) => i !== index))}
                    aria-label={`Hapus ${logo.name || 'logo'}`}
                    className={REMOVE_BTN}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <Input
                  type="text"
                  controlSize="sm"
                  value={logo.name}
                  onChange={(e) => {
                    const newLogos = [...heroLogos];
                    newLogos[index].name = e.target.value;
                    setHeroLogos(newLogos);
                  }}
                  wrapperClassName="mt-2"
                  className="px-2 text-center text-xs font-medium"
                  placeholder="Nama logo..."
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
            className={dropZoneClass(isLogoDragging, 'aspect-square rounded-2xl px-2 text-center')}
          >
            <input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => handleLogoUpload(e.target.files)} />
            <Plus
              className={cn('h-5 w-5 transition-colors', isLogoDragging ? 'text-adm-cobalt-fg' : 'text-adm-subtle group-hover:text-adm-cobalt-fg')}
              strokeWidth={1.75}
              aria-hidden
            />
            <span className={cn('text-xs font-medium transition-colors', isLogoDragging ? 'text-adm-cobalt-fg' : 'text-adm-muted group-hover:text-adm-cobalt-fg')}>
              {isLogoDragging ? 'Lepaskan sekarang!' : 'Tambah logo'}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default HeroSettings;
