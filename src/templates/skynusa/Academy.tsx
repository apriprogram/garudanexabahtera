// Kelas terbang gratis (kunci `academy`): panel GELAP radius 24 di dalam gutter halaman (kisi garis putih tipis), kiri
// foto latihan 4:3 dengan chip mint "Gratis untuk pembeli"; kanan label, judul, deskripsi, sesi bernomor 01–04 (judul,
// durasi mono, keterangan) dipisah garis tipis, baris jadwal & lokasi berikon, catatan kuota, dan tombol mint daftar
// kelas (WhatsApp berisi "kelas terbang" bila tautan kosong). HP: foto di atas, lalu teks.
import { CalendarDays, MapPin } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, resolveAction, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { SkyNusaModel } from './model';
import { SKYNUSA_PHOTOS } from './photos';
import { BTN, MONO, TYPE_S } from './styles';
import { ButtonLink, SectionLabel, Toned } from './ui';

export function Academy({ m }: { m: SkyNusaModel }) {
  const { academy } = m;
  const eyebrow = text(academy, 'eyebrow');
  const title = text(academy, 'title');
  const subtitle = text(academy, 'subtitle');
  const badge = text(academy, 'badge');
  const image = text(academy, 'image');
  const sessions = list(academy, 'sessions', 4).filter((item) => field(item, 'title') || field(item, 'text'));
  const info = [
    { key: 'schedule', icon: CalendarDays, label: 'Jadwal', value: text(academy, 'schedule') },
    { key: 'location', icon: MapPin, label: 'Lokasi', value: text(academy, 'location') },
  ].filter((row) => row.value);
  const note = text(academy, 'note');
  const action = resolveAction(text(academy, 'button_url'), m.askAbout('kelas terbang'));
  if (!title && sessions.length === 0) return null;
  const withImage = hasImage(image);

  return (
    <TemplateSection sectionKey="academy" className="bg-white py-4 @3xl:py-8">
      <div className={CONTAINER}>
        <Reveal
          variant="fade"
          data-tpl-tone="inverse"
          className="sn-dark-band relative isolate grid gap-8 overflow-hidden rounded-[24px] p-4 text-white @3xl:p-6 @5xl:grid-cols-12 @5xl:gap-10 @5xl:p-8 @7xl:p-10"
        >
          <div aria-hidden className="sn-grid-dark absolute inset-0 -z-10" />
          {withImage && (
            <div className="relative min-w-0 @5xl:col-span-5">
              <KitPhoto
                src={image}
                alt={SKYNUSA_PHOTOS.alt(image, title || 'Kelas terbang')}
                fallback="none"
                zoom
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="aspect-[4/3] rounded-[16px] @5xl:aspect-auto @5xl:h-full @5xl:min-h-[520px]"
              />
              {badge && <p className={`absolute left-3 top-3 rounded-[8px] bg-(--sn-mint) px-3 py-2 text-[#0E1A1C] ${MONO}`}>{badge}</p>}
            </div>
          )}

          <div className={`min-w-0 px-2 pb-4 @3xl:px-2 @5xl:py-4 ${withImage ? '@5xl:col-span-7' : '@5xl:col-span-12'}`}>
            {eyebrow && <SectionLabel tone="dark">{eyebrow}</SectionLabel>}
            {!withImage && badge && <p className={`mt-3 inline-block rounded-[8px] bg-(--sn-mint) px-3 py-2 text-[#0E1A1C] ${MONO}`}>{badge}</p>}
            {title && (
              <h2 className={`${eyebrow ? 'mt-5' : ''} max-w-[20ch] text-balance text-white ${TYPE_S.h2}`}>
                <Toned title={title} highlight={text(academy, 'highlight')} tone="dark" />
              </h2>
            )}
            {subtitle && <p className={`mt-5 max-w-[56ch] text-white/70 ${TYPE_S.lead}`}>{subtitle}</p>}

            {sessions.length > 0 && (
              <ol className="mt-8 border-t border-white/10">
                {sessions.map((item, i) => (
                  <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i, 70)} className="grid grid-cols-[auto_1fr] gap-x-4 border-b border-white/10 py-4 @2xl:grid-cols-[auto_1fr_auto]">
                    <span className={`pt-0.5 text-(--sn-mint) ${MONO}`}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">
                      {field(item, 'title') && <span className="block text-[16px] font-medium leading-snug text-white">{field(item, 'title')}</span>}
                      {field(item, 'text') && <span className="mt-1 block text-[14px] leading-relaxed text-white/65">{field(item, 'text')}</span>}
                    </span>
                    {field(item, 'meta') && <span className={`col-start-2 mt-2 text-white/60 @2xl:col-start-auto @2xl:mt-0 @2xl:pt-0.5 @2xl:text-right ${MONO}`}>{field(item, 'meta')}</span>}
                  </Reveal>
                ))}
              </ol>
            )}

            {info.length > 0 && (
              <ul className="mt-6 grid gap-3 @2xl:grid-cols-2">
                {info.map(({ key, icon: Icon, label, value }) => (
                  <li key={key} className="flex items-start gap-3">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.06] text-(--sn-mint) ring-1 ring-inset ring-white/10">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-white/55 ${MONO}`}>{label}</span>
                      <span className="mt-1 block text-[14.5px] leading-snug text-white">{value}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {note && <p className="mt-6 text-[13.5px] leading-relaxed text-white/60">{note}</p>}
            <div className="mt-7">
              <ButtonLink action={action} label={text(academy, 'button_label')} variant="mint" className={`${BTN.mint} ${BTN.lg} justify-between`} />
            </div>
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
