// Proses impor (kunci `process`), pita abu. Kiri (kolom 1–5): label, H2, deskripsi, foto 16:10 opsional, catatan bergaris
// aksen. Kanan (kolom 7–12): AKORDEON DI ATAS GARIS ALUR: tiap langkah punya nomor bulat di garis vertikal; garis di
// bawah setiap nomor (lintasan abu + isi warna aksen) menyambung ke nomor berikutnya. Gerak khas: saat daftar masuk
// layar, isi garis turun segmen demi segmen dan nomor berganti dari garis ke penuh (sekali, ±1,4 dtk; nusaniaga.css).
// Akordeon: tombol aria-expanded/aria-controls di dalam <h3>, panel role="region" + aria-labelledby, panel tertutup
// `inert`; satu terbuka (langkah pertama terbuka). HP: label → H2 → deskripsi → akordeon → foto → catatan.
import { ChevronDown, FileText } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled, watchEntrance } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { NusaNiagaModel } from './model';
import { NUSANIAGA_PHOTOS } from './photos';
import { C, DISPLAY, GRID, LINE, PHOTO, SECTION_PAD, TYPE_N } from './styles';
import { PhotoRing, SectionHead } from './ui';

function Lane({ m }: { m: NusaNiagaModel }) {
  const steps = m.items('process');
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const motion = useMotionEnabled();

  // Garis alur terisi sekali saat daftar masuk layar (hanya bila gerak menyala; selain itu garis langsung penuh)
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !motion || el.dataset.lane === 'shown' || document.visibilityState === 'hidden') return;
    return watchEntrance(el, {
      arm: () => {
        el.dataset.lane = 'pending';
      },
      enter: () => {
        el.dataset.lane = 'shown';
      },
    });
  }, [motion]);

  return (
    <ol ref={listRef} className="relative">
      {steps.map((step, i) => {
        const isOpen = open === i;
        const last = i === steps.length - 1;
        const buttonId = `${baseId}-s${i}`;
        const panelId = `${baseId}-p${i}`;
        const duration = field(step, 'duration');
        const body = field(step, 'text');
        const output = field(step, 'output');
        const lane = { '--nn-i': i } as CSSProperties;
        return (
          <li key={`${field(step, 'title')}-${i}`} className="relative pl-16 @3xl:pl-20">
            {!last && (
              <>
                <span aria-hidden className="absolute -bottom-6 left-[19px] top-16 w-0.5 bg-[#141821]/[0.12]" />
                <span aria-hidden style={lane} className="nn-lane-seg absolute -bottom-6 left-[19px] top-16 w-0.5 bg-(--tpl-accent)" />
              </>
            )}
            <span
              aria-hidden
              style={lane}
              className={`nn-node absolute left-0 top-6 flex h-10 w-10 items-center justify-center rounded-full ${DISPLAY} text-[14px] font-bold tabular-nums`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className={last ? '' : `border-b ${LINE}`}>
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="group flex min-h-[88px] w-full items-center gap-4 py-6 text-left"
                >
                  {/* Durasi di kanan judul; di kolom sempit (layar 1024–1279px) pindah ke bawah judul agar judul tidak terlipat */}
                  <span className="flex min-w-0 flex-1 flex-col @xl:flex-row @xl:items-center @xl:gap-4 @5xl:flex-col @5xl:items-start @5xl:gap-1 @7xl:flex-row @7xl:items-center @7xl:gap-4">
                    <span className={`min-w-0 grow ${C.ink} ${TYPE_N.h3}`}>{field(step, 'title')}</span>
                    {duration && <span className={`hidden shrink-0 text-[13.5px] tabular-nums @xl:inline ${C.subtle}`}>{duration}</span>}
                  </span>
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#141821] ring-1 ring-inset ring-[#141821]/[0.12] transition-colors duration-200 group-hover:ring-(--tpl-accent)"
                  >
                    <ChevronDown data-open={isOpen} className="nn-chevron h-4 w-4" strokeWidth={2} />
                  </span>
                </button>
              </h3>
              <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="nn-collapse">
                <div className="overflow-hidden">
                  <div className="pb-7">
                    {duration && <p className={`mb-2 text-[13.5px] tabular-nums @xl:hidden ${C.subtle}`}>{duration}</p>}
                    {body && <p className={`max-w-[60ch] ${TYPE_N.body} ${C.muted}`}>{body}</p>}
                    {output && (
                      <p
                        className={`mt-4 inline-flex min-h-8 items-center gap-2 rounded-full bg-white px-3 py-1 text-[13.5px] font-medium ring-1 ring-inset ring-[#141821]/[0.12] ${C.ink}`}
                      >
                        <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-(--nn-ink)" strokeWidth={1.9} />
                        {output}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Process({ m }: { m: NusaNiagaModel }) {
  const { process } = m;
  const image = text(process, 'image');
  const note = text(process, 'note');
  const title = text(process, 'title');
  const showImage = hasImage(image);

  return (
    <TemplateSection sectionKey="process" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={`${CONTAINER} ${GRID} @5xl:grid-rows-[auto_1fr]`}>
        <SectionHead
          layout="stack"
          eyebrow={text(process, 'eyebrow')}
          title={title}
          srTitle="Proses impor"
          subtitle={text(process, 'subtitle')}
          className="min-w-0 @5xl:col-[1/6] @5xl:row-[1]"
        />
        {/* Tanpa Reveal: garis alur yang terisi adalah gerak masuknya */}
        <div className="mt-8 min-w-0 @5xl:col-[7/13] @5xl:row-[1/3] @5xl:mt-0">
          <Lane m={m} />
        </div>
        {(showImage || note) && (
          <div className="mt-10 min-w-0 @5xl:col-[1/6] @5xl:row-[2] @5xl:self-end">
            {showImage && (
              <Reveal>
                <KitPhoto src={image} alt={NUSANIAGA_PHOTOS.alt(image, title)} fallback="none" className={PHOTO} sizes="(min-width: 1024px) 45vw, 100vw">
                  <PhotoRing />
                </KitPhoto>
              </Reveal>
            )}
            {note && (
              <Reveal delay={showImage ? 120 : 0} className={showImage ? 'mt-6' : ''}>
                <p className={`max-w-[52ch] border-l-[3px] border-(--tpl-accent) pl-4 text-[14px] leading-relaxed ${C.muted}`}>{note}</p>
              </Reveal>
            )}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
