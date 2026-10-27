// Guru & tenaga kependidikan (kunci `teachers`), pita putih: kepala section lalu kartu guru (4 kolom di layar lebar).
// Ada guru berfoto → kartu potret 4:5 radius 8 (2 kolom di HP); yang tanpa foto mendapat kotak navy berisi inisial serif
// putih dan garis pendek warna terang tema agar baris tetap rata. TIDAK ada foto sama sekali (demo sengaja memakai inisial:
// nama fiktif tidak ditempel pada wajah foto stok) → kartu ringkas bergaris tipis: kotak inisial navy 56px + nama serif +
// jabatan, jadi section tidak terisi blok navy besar yang tampak seperti tempat foto kosong.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { NawasenaModel } from './model';
import { NAWASENA_PHOTOS } from './photos';
import { C, CARD, DISPLAY, SECTION_PAD } from './styles';
import { PersonName, SectionHead } from './ui';

/** Inisial tanpa gelar akademik di depan (Dra., Drs., Dr., Ir., H., Hj.). */
const nameInitials = (name: string) => initials(name.replace(/^((dra?s?|dr|ir|hj?|prof)\.?\s+)+/i, '').replace(/,.*$/, ''), '?');

export function Teachers({ m }: { m: NawasenaModel }) {
  const { teachers } = m;
  const items = m.items('teachers');
  const anyPhoto = items.some((item) => hasImage(field(item, 'photo')));
  return (
    <TemplateSection sectionKey="teachers" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(teachers, 'eyebrow')} number={m.number('teachers')} title={text(teachers, 'title') || 'Guru'} subtitle={text(teachers, 'subtitle')} />
        {anyPhoto ? (
          <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 @3xl:mt-14 @3xl:gap-x-4 @5xl:grid-cols-4">
            {items.map((item, i) => {
              const name = field(item, 'name');
              const photo = field(item, 'photo');
              return (
                <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 70)} className="min-w-0">
                  {hasImage(photo) ? (
                    <KitPhoto
                      src={photo}
                      alt={NAWASENA_PHOTOS.alt(photo, `Foto ${name}`)}
                      sizes="(min-width: 1024px) 22vw, 46vw"
                      className="aspect-[4/5] rounded-[8px]"
                    />
                  ) : (
                    <div aria-hidden data-tpl-tone="inverse" className="flex aspect-[4/5] flex-col items-center justify-center rounded-[8px] bg-(--nw-navy)">
                      <span className={`text-[36px] leading-none text-white ${DISPLAY} font-normal @3xl:text-[48px]`}>{nameInitials(name)}</span>
                      <span className="mt-4 h-px w-6 bg-(--nw-bright)" />
                    </div>
                  )}
                  <h3 className={`mt-4 text-[18px] leading-tight ${C.navy} ${DISPLAY} font-normal @3xl:text-[21px]`}>
                    <PersonName name={name} />
                  </h3>
                  {field(item, 'role') && <p className={`mt-1.5 text-[14px] leading-snug ${C.muted}`}>{field(item, 'role')}</p>}
                </Reveal>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-10 grid gap-3 @2xl:grid-cols-2 @3xl:mt-14 @3xl:gap-4 @5xl:grid-cols-4">
            {items.map((item, i) => {
              const name = field(item, 'name');
              return (
                <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 70)} className="min-w-0">
                  <div className={`flex h-full items-start gap-4 p-5 @3xl:p-6 ${CARD.white}`}>
                    <span aria-hidden data-tpl-tone="inverse" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] bg-(--nw-navy)">
                      <span className={`text-[21px] leading-none text-white ${DISPLAY} font-normal`}>{nameInitials(name)}</span>
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <h3 className={`text-[19px] leading-tight ${C.navy} ${DISPLAY} font-normal`}>
                        <PersonName name={name} />
                      </h3>
                      {field(item, 'role') && <p className={`mt-1.5 text-[14px] leading-snug ${C.muted}`}>{field(item, 'role')}</p>}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </TemplateSection>
  );
}
