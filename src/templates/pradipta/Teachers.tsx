// Guru & tenaga kependidikan (kunci `teachers`): kepala section dengan deskripsi + tombol (bawaan WhatsApp sekolah) di
// kanan, lalu kartu putih: foto persegi radius 14 yang membesar pelan saat disorot (kosong → ubin inisial langit), nama,
// dan jabatan. HP: dua kolom.
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { PradiptaModel } from './model';
import { PRADIPTA_PHOTOS } from './photos';
import { BAND, C, SECTION_PAD, ZOOM, cardOn } from './styles';
import { Head, Initials, PersonName, PillLink } from './ui';

export function Teachers({ m }: { m: PradiptaModel }) {
  const { teachers } = m;
  const tone = m.tone('teachers');
  const items = m.items('teachers');
  const action = m.linkOr(
    text(teachers, 'button_url'),
    m.waWith(`Halo ${m.companyName}, saya ingin bertanya kepada wali kelas.`) ?? m.contactAction,
  );
  const button = <PillLink action={action} label={text(teachers, 'button_label')} variant={tone === 'sky' ? 'light' : 'soft'} className="w-full @xl:w-auto" />;
  return (
    <TemplateSection sectionKey="teachers" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={CONTAINER}>
        <Head
          sectionKey="teachers"
          eyebrow={text(teachers, 'eyebrow')}
          title={text(teachers, 'title')}
          fallback="Guru"
          subtitle={text(teachers, 'subtitle')}
          tone={tone}
          subtitleRight
          aside={text(teachers, 'button_label') && action ? button : undefined}
        />
        <ul className="mt-10 grid grid-cols-2 gap-3 @3xl:mt-12 @3xl:gap-4 @5xl:grid-cols-4">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const photo = field(item, 'photo');
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 70)} className={`group flex flex-col p-2 ${cardOn(tone)}`}>
                {hasImage(photo) ? (
                  <div className="overflow-hidden rounded-[14px]">
                    <KitPhoto
                      src={photo}
                      alt={PRADIPTA_PHOTOS.alt(photo, `Foto ${name}`)}
                      fallback="none"
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      position="50% 25%"
                      className={`aspect-square ${ZOOM}`}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-[14px] bg-(--pd-sky2)">
                    <Initials name={name} className="h-20 w-20 bg-white text-[26px]" />
                  </div>
                )}
                <div className="p-3 pb-2">
                  <h3 className={`text-[15.5px] font-semibold leading-snug @3xl:text-[16.5px] ${C.ink}`}>
                    <PersonName name={name} />
                  </h3>
                  {field(item, 'role') && <p className={`mt-1 text-pretty text-[13.5px] leading-snug @3xl:text-[14px] ${C.muted}`}>{field(item, 'role')}</p>}
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}
