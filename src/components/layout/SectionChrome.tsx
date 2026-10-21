import React from 'react';
import { useSectionSpy } from '../../hooks/useSectionSpy';
import { scrollToSection } from './scroll';

export interface ChromeSection {
  id: string;
  label: string;
  /** Warna latar halaman saat section ini sedang dibaca */
  tone: 'canvas' | 'alt';
}

const TONE_BG: Record<ChromeSection['tone'], string> = {
  canvas: 'var(--site-canvas)',
  alt: 'var(--site-alt)',
};

/**
 * Lapisan transisi antarsection beranda (port SectionChrome BELAJAR CPNS):
 * - latar halaman ber-crossfade halus mengikuti section aktif (section di <main class="page-chrome"> transparan);
 * - indikator titik di kanan layar (hanya ≥ 1280px) yang bisa diklik untuk pindah section.
 * Section yang tidak ada di halaman (disembunyikan admin / kosong) tidak punya titik.
 * Harus dirender di dalam pembungkus `relative isolate` agar lapisan latar (-z-10) tampil di atas latar aplikasi.
 */
export const SectionChrome: React.FC<{ sections: ChromeSection[] }> = ({ sections }) => {
  const { activeId, presentIds } = useSectionSpy(
    sections.map((section) => section.id),
    { sticky: true },
  );
  const shown = sections.filter((section) => presentIds.includes(section.id));
  const active = sections.find((section) => section.id === activeId) ?? sections[0];
  if (!active) return null;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 transition-colors duration-700 ease-out motion-reduce:transition-none"
        style={{ backgroundColor: TONE_BG[active.tone] }}
      />

      {shown.length > 1 && (
        // Titik tetap di posisi lama (pusat 19px / 27px dari tepi kanan) walau anchor kini selebar 28px
        <nav aria-label="Pindah section" className="fixed right-1.25 top-1/2 z-30 hidden -translate-y-1/2 xl:block 2xl:right-3.25">
          <ul className="flex flex-col items-end gap-1.5">
            {shown.map((section) => {
              const current = section.id === active.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    onClick={(event) => {
                      if (scrollToSection(section.id)) event.preventDefault();
                    }}
                    aria-current={current ? 'location' : undefined}
                    // Area klik hanya sebesar titik (28×28) di tepi layar; label melayang di luar alur tata letak,
                    // jadi tidak menangkap klik di atas konten halaman (mis. pratinjau hero)
                    className="group relative flex h-7 w-7 items-center justify-center rounded-full"
                  >
                    <span className="pointer-events-none absolute right-full top-1/2 mr-0.5 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-full bg-fg px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                      {section.label}
                    </span>
                    <span
                      className={`block w-1.5 rounded-full transition-all duration-500 ease-calm ${
                        current ? 'h-6 bg-fg' : 'h-1.5 bg-line-strong group-hover:bg-muted'
                      }`}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
};

export default SectionChrome;
