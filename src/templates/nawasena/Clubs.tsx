// Ekstrakurikuler (kunci `clubs`), pita putih: kepala section, kisi kartu putih radius 8 (4 kolom di layar lebar, 2 di
// tablet, 1 di HP) berisi ikon otomatis dari nama di kotak warna tema muda, kategori (mono), nama serif, keterangan, dan
// jadwal latihan; garis kartu berubah warna saat disorot (tanpa terangkat). HP sempit (< @xl): baris ringkas tanpa
// keterangan. Di bawahnya label "Ekstrakurikuler lainnya" + deretan label persegi dari teks yang dipisah koma/baris baru.
import { Clock } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { tagsOf, type NawasenaModel } from './model';
import { C, CARD, DISPLAY, SECTION_PAD, TYPE_N } from './styles';
import { ClubIcon, SectionHead } from './ui';

export function Clubs({ m }: { m: NawasenaModel }) {
  const { clubs } = m;
  const items = m.items('clubs');
  const moreTitle = text(clubs, 'more_title');
  const more = tagsOf(text(clubs, 'more'));
  return (
    <TemplateSection sectionKey="clubs" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(clubs, 'eyebrow')} number={m.number('clubs')} title={text(clubs, 'title') || 'Ekstrakurikuler'} subtitle={text(clubs, 'subtitle')} />
        <ul className="mt-10 grid gap-3 @2xl:grid-cols-2 @3xl:mt-14 @3xl:gap-4 @5xl:grid-cols-4">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const schedule = field(item, 'schedule');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 60)} className="min-w-0">
                <article className={`flex h-full gap-4 p-4 transition-colors duration-300 hover:ring-(--nw-line) @xl:p-5 @2xl:flex-col @2xl:gap-0 @3xl:p-6 ${CARD.white}`}>
                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-(--nw-tint) text-(--nw-ink)">
                    <ClubIcon name={name} className="h-5 w-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col @2xl:mt-5">
                    {field(item, 'category') && <p className={`${TYPE_N.mono} ${C.muted}`}>{field(item, 'category')}</p>}
                    <h3 className={`mt-1 text-[21px] leading-[1.2] ${C.navy} ${DISPLAY} font-normal @3xl:text-[22px]`}>{name}</h3>
                    {/* HP: baris ringkas (ikon, kategori, nama, jadwal); keterangan mulai @xl agar daftar tidak memanjang */}
                    {field(item, 'text') && <p className={`mt-2 hidden text-[14.5px] leading-relaxed @xl:block ${C.body}`}>{field(item, 'text')}</p>}
                    {schedule && (
                      <p className="mt-auto inline-flex items-center gap-2 pt-2.5 font-mono @xl:pt-4 text-[12.5px] font-medium tracking-[0.04em] text-(--nw-ink)">
                        <Clock aria-hidden className="h-3.5 w-3.5 shrink-0" />
                        {schedule}
                      </p>
                    )}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
        {more.length > 0 && (
          <Reveal delay={120} className="mt-10 border-t border-black/[0.08] pt-6 @3xl:mt-12">
            {moreTitle && <p className={`${TYPE_N.mono} ${C.muted}`}>{moreTitle}</p>}
            <ul className={`flex flex-wrap gap-2 ${moreTitle ? 'mt-3' : ''}`}>
              {more.map((tag, i) => (
                <li key={`${tag}-${i}`} className={`inline-flex min-h-8 items-center rounded-[4px] bg-[#F5F7FB] px-2.5 py-1 text-[13.5px] font-medium ${C.navy}`}>
                  {tag}
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
