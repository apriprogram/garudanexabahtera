// Program keahlian / jurusan (kunci `programs`): kartu abu kebiruan membulat (referensi Porsche/Bose): chip tinta
// berisi ikon + kode, tombol bulat "tanya program ini" (WhatsApp dengan nama program), nama program (H3), deskripsi,
// chip kompetensi, dan keterangan kelas di kaki kartu. Garis tepi berubah ke warna tema saat disorot (tanpa bayangan).
// SMA: ganti label/judul menjadi "Peminatan" dan isi MIPA, IPS, Bahasa; ikon ikut otomatis.
import { ArrowUpRight, Users } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import type { CakrawalaModel } from './model';
import { C, SECTION_PAD, TYPE_C } from './styles';
import { SectionHead, TitleIcon } from './ui';

/** "Web, Aplikasi mobile" → ["Web", "Aplikasi mobile"] (maks. 6). */
const chips = (raw: string) =>
  (raw || '')
    .split(/[,;•·|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);

export function Programs({ m }: { m: CakrawalaModel }) {
  const { programs } = m;
  const items = list(programs, 'items', 9).filter((item) => field(item, 'name') || field(item, 'code'));
  if (items.length === 0) return null;
  const note = text(programs, 'note');

  return (
    <TemplateSection sectionKey="programs" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(programs, 'eyebrow')} title={text(programs, 'title')} subtitle={text(programs, 'subtitle')} />
        <ul className="mt-10 grid gap-3 @2xl:grid-cols-2 @3xl:mt-14 @5xl:grid-cols-3 @3xl:gap-4">
          {items.map((item, i) => {
            const code = field(item, 'code');
            const name = field(item, 'name') || code;
            const subject = code && name !== code ? `${name} (${code})` : name;
            const link = m.waWith(`Halo ${m.companyName}, saya ingin bertanya tentang program ${subject}.`);
            const ask = link ?? m.ppdbAction;
            return (
              <Reveal
                as="li"
                key={`${code}-${name}-${i}`}
                delay={stagger(i, 70)}
                className="group/card flex flex-col rounded-[22px] bg-[#F3F6FA] p-5 ring-1 ring-inset ring-transparent transition-colors duration-300 hover:ring-(--ck-line) @3xl:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-9 items-center gap-2 rounded-full bg-[#0D1830] pl-1 pr-3.5 text-[13px] font-semibold tracking-[0.04em] text-white">
                    <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.12] text-(--ck-bright)">
                      <TitleIcon title={`${code} ${name}`} index={i} className="h-4 w-4" />
                    </span>
                    {code || 'Program'}
                  </span>
                  {ask && (
                    <ActionLink
                      action={ask}
                      aria-label={`Tanya tentang program ${subject}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0D1830] ring-1 ring-inset ring-black/[0.08] transition-colors hover:bg-(--tpl-accent) hover:text-(--tpl-on-accent)"
                    >
                      <ArrowUpRight aria-hidden className="h-4 w-4" />
                    </ActionLink>
                  )}
                </div>
                <h3 className={`mt-6 text-balance ${C.ink} ${TYPE_C.h3}`}>{name}</h3>
                {field(item, 'description') && <p className={`mt-2 ${TYPE_C.body} ${C.muted}`}>{field(item, 'description')}</p>}
                {chips(field(item, 'skills')).length > 0 && (
                  <ul aria-label={`Kompetensi ${code || name}`} className="mt-5 flex flex-wrap gap-1.5">
                    {chips(field(item, 'skills')).map((skill) => (
                      <li key={skill} className={`rounded-full bg-white px-3 py-1 text-[12.5px] font-medium ring-1 ring-inset ring-black/[0.06] ${C.ink}`}>
                        {skill}
                      </li>
                    ))}
                  </ul>
                )}
                {field(item, 'meta') && <div aria-hidden className="min-h-6 flex-1" />}
                {field(item, 'meta') && (
                  <p className={`flex items-center gap-2 border-t border-black/[0.07] pt-4 text-[13px] font-medium ${C.muted}`}>
                    <Users aria-hidden className="h-4 w-4 text-(--ck-ink)" strokeWidth={1.8} />
                    {field(item, 'meta')}
                  </p>
                )}
              </Reveal>
            );
          })}
        </ul>
        {note && <p className={`mt-6 max-w-[70ch] text-[13.5px] ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
