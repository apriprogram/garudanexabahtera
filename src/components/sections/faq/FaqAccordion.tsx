import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Reveal } from '../../ui/Reveal';
import type { FaqItem } from '../../../content/faq';

interface FaqAccordionProps {
  items: readonly FaqItem[];
  /** Latar section abu (`bg-alt`): pertanyaan tertutup memakai permukaan putih transparan. */
  alt?: boolean;
  /** Level heading pertanyaan (bawaan h3: di bawah H2 section). */
  headingLevel?: 'h2' | 'h3';
  /** Pertanyaan yang terbuka saat pertama tampil (bawaan yang pertama; null = semua tertutup). */
  initialOpen?: number | null;
  className?: string;
}

/**
 * Accordion FAQ bernomor gaya BELAJAR CPNS (satu terbuka; terbuka = putih bergaris, tertutup = abu lembut). Jawaban
 * selalu ada di HTML (juga yang tertutup), jadi terbaca crawler dan sama persis dengan JSON-LD FAQPage.
 */
export const FaqAccordion: React.FC<FaqAccordionProps> = ({ items, alt, headingLevel = 'h3', initialOpen = 0, className = '' }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(initialOpen);
  const baseId = useId();
  // Posisi tombol yang baru diketuk (sebelum jawaban lain menutup), agar barisnya tetap di bawah jari
  const anchorRef = useRef<{ button: HTMLElement; top: number } | null>(null);
  const Heading = headingLevel;

  // Jawaban yang menutup langsung hilang (tanpa transisi), jadi tombol di bawahnya bisa naik. Sebelum digambar,
  // halaman digeser sebesar selisihnya sehingga pertanyaan yang diketuk tidak berpindah di layar.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    anchorRef.current = null;
    if (!anchor) return;
    const shift = anchor.button.getBoundingClientRect().top - anchor.top;
    // `instant`: html memakai scroll-behavior smooth, pergeseran ini tidak boleh terlihat bergulir
    if (Math.abs(shift) >= 1) window.scrollBy({ top: shift, behavior: 'instant' });
  }, [openIndex]);

  return (
    <ul className={`space-y-2.5 ${className}`}>
      {items.map((faq, index) => {
        const open = openIndex === index;
        const buttonId = `${baseId}-q${index}`;
        const panelId = `${baseId}-a${index}`;
        return (
          <li key={`${index}-${faq.question}`}>
            <Reveal delay={Math.min(index, 6) * 0.06}>
              <div
                className={`rounded-[20px] ring-1 ring-inset transition-colors duration-300 motion-reduce:transition-none ${
                  open
                    ? 'bg-surface ring-line'
                    : alt
                      ? 'bg-surface/60 ring-transparent hover:bg-surface hover:ring-line-strong'
                      : 'bg-alt ring-transparent hover:ring-line-strong'
                }`}
              >
                <Heading>
                  <button
                    id={buttonId}
                    type="button"
                    onClick={(event) => {
                      anchorRef.current = { button: event.currentTarget, top: event.currentTarget.getBoundingClientRect().top };
                      setOpenIndex(open ? null : index);
                    }}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="group flex min-h-12 w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left sm:gap-4 sm:px-6 sm:py-5"
                  >
                    <span
                      className={`w-5 shrink-0 font-mono text-xs font-semibold tabular-nums transition-colors sm:w-6 ${
                        open ? 'text-primary' : 'text-subtle'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-[14px] font-semibold leading-snug text-fg sm:text-base">{faq.question}</span>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 motion-reduce:transition-none sm:h-8 sm:w-8 ${
                        open
                          ? 'rotate-45 bg-fg text-white'
                          : 'bg-surface text-fg ring-1 ring-inset ring-line group-hover:text-primary group-hover:ring-line-strong'
                      }`}
                      aria-hidden
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                </Heading>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  // Membuka: 300ms; menutup: seketika (duration-0) agar pertanyaan yang diketuk tidak bergeser
                  className={`grid transition-[grid-template-rows] ease-calm motion-reduce:transition-none ${open ? 'duration-300' : 'duration-0'}`}
                  style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden" inert={!open}>
                    {/* Rata dengan teks pertanyaan: padding tombol + lebar nomor + gap */}
                    <p
                      className={`pb-5 pl-12 pr-4 text-sm leading-relaxed text-muted transition-opacity motion-reduce:transition-none sm:pb-6 sm:pl-[64px] sm:pr-16 sm:text-[15px] ${
                        open ? 'opacity-100 duration-300' : 'opacity-0 duration-0'
                      }`}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </li>
        );
      })}
    </ul>
  );
};

export default FaqAccordion;
