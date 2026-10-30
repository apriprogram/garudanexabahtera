// Cara sewa (kunci `steps`), pita abu: kepala section, lalu langkah berurutan dalam satu baris (layar lebar) yang
// dihubungkan garis 2px — jalur abu + isian biru yang tergambar sekali saat terlihat (1,2 dtk). Tiap langkah: ubin ikon
// putih 52px bercincin (ikon otomatis dari judul: pilih mobil, konfirmasi, serah terima, kembalikan…), nomor mono,
// judul Hanken, satu kalimat. HP: garis waktu tegak (garis di kiri).
import { useRef, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { useSeenOnce } from './hooks';
import { stepIcon } from './icons';
import { pad2, type KemudiModel } from './model';
import { C, MONO_LABEL, SECTION_PAD, TYPE, WRAP } from './styles';
import { AutoIcon, SectionHead } from './ui';

const COLS: Record<number, string> = { 2: '@5xl:grid-cols-2', 3: '@5xl:grid-cols-3', 4: '@5xl:grid-cols-4', 5: '@5xl:grid-cols-5' };

export function Steps({ m }: { m: KemudiModel }) {
  const { steps } = m;
  const items = m.items('steps');
  const motion = useMotionEnabled();
  const ref = useRef<HTMLOListElement>(null);
  const seen = useSeenOnce(ref, motion);
  const n = items.length;

  return (
    <TemplateSection sectionKey="steps" className={`${SECTION_PAD} ${C.grey}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(steps, 'eyebrow')} index={m.index('steps')} title={text(steps, 'title')} subtitle={text(steps, 'subtitle')} srTitle="Cara sewa" tone="grey" />

        <ol ref={ref} data-seen={seen ? 'true' : 'false'} className={`km-steps relative mt-12 grid gap-8 @3xl:mt-14 @5xl:gap-6 ${COLS[n] ?? '@5xl:grid-cols-4'}`}>
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={i * 90} className="relative grid min-w-0 grid-cols-[52px_minmax(0,1fr)] gap-x-4 @5xl:block">
              {/* Garis penghubung ke langkah berikutnya: HP tegak di bawah ubin, layar lebar mendatar di kanan ubin */}
              {i < n - 1 && (
                <span aria-hidden className="km-step-link absolute bottom-[-24px] left-[25px] top-[62px] w-[2px] overflow-hidden rounded-full bg-[#0D1117]/10 @5xl:bottom-auto @5xl:left-[64px] @5xl:right-[-12px] @5xl:top-[25px] @5xl:h-[2px] @5xl:w-auto">
                  <span className="km-step-fill absolute inset-0 rounded-full bg-(--tpl-accent)" style={{ '--km-delay': `${i * 320}ms` } as CSSProperties} />
                </span>
              )}
              <span aria-hidden className="relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-white text-(--km-ink) ring-1 ring-inset ring-[#0D1117]/[0.08]">
                <AutoIcon k={stepIcon(field(item, 'title'))} className="h-[22px] w-[22px]" />
              </span>
              <div className="min-w-0 @5xl:mt-6 @5xl:pr-6">
                <span className={`block ${MONO_LABEL} text-(--km-ink)`}>Langkah {pad2(i + 1)}</span>
                <h3 className={`mt-1.5 ${TYPE.h3} ${C.ink}`}>{field(item, 'title')}</h3>
                {field(item, 'text') && <p className={`mt-1.5 max-w-[34ch] text-[15px] leading-relaxed ${C.muted}`}>{field(item, 'text')}</p>}
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </TemplateSection>
  );
}
