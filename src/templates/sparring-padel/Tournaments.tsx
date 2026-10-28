// Turnamen & Sewa Sparring Padel.
// - `tournaments` (pita abu-dingin): kiri kepala section + foto tegak 4:5 (opsional; HP 16:10); kanan daftar acara
//   bergaris tipis: ubin tanggal biru-malam (tanggal Saira, bulan mono neon), H3 nama acara, kategori, biaya · kuota
//   mono, tombol pil "Daftar" yang membuka WhatsApp berisi acara itu; catatan "contoh, dikonfirmasi admin".
// - `rental` (putih): foto tegak 4:5 dengan parallax ringan (SATU-SATUNYA foto parallax di halaman) dan ubin harga 2
//   kolom (ikon otomatis dari nama, harga Saira + satuan), tautan WhatsApp "Tanya stok".
import { ArrowRight, Info } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { RENTAL_MESSAGE, tournamentMessage, type SparringModel } from './model';
import { SPARRING_PHOTOS } from './photos';
import { BTN, C, CARD, DISPLAY, GRID_GAP, MONO, MONO_LABEL, SECTION_PAD, TYPE } from './styles';
import { RentalIcon, SectionHead, TextLink } from './ui';

export function Tournaments({ m }: { m: SparringModel }) {
  const s = m.tournaments;
  const items = m.items('tournaments');
  const image = text(s, 'image');
  const photo = hasImage(image);
  const button = text(s, 'button_label');
  const note = text(s, 'note');
  return (
    <TemplateSection sectionKey="tournaments" className={`${C.band} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className={`grid gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <div className="min-w-0 @5xl:col-span-4">
            <SectionHead eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} srTitle="Turnamen" />
            {photo && (
              <Reveal variant="fade" className="mt-8 @3xl:mt-10">
                <KitPhoto
                  src={image}
                  alt={SPARRING_PHOTOS.alt(image, `Pemain di turnamen ${m.companyName}`)}
                  fallback="none"
                  zoom
                  sizes="(min-width: 1024px) 30vw, 100vw"
                  className="aspect-[16/10] rounded-[14px] @5xl:aspect-[4/5]"
                  imgClassName="object-[50%_60%]"
                />
              </Reveal>
            )}
          </div>
          <div className="min-w-0 @5xl:col-span-8 @5xl:pt-2">
            <ul className={`divide-y divide-[#0A1622]/[0.1] border-y ${C.line}`}>
              {items.map((item, i) => {
                const action = m.waWith(tournamentMessage(m.companyName, item)) ?? m.contactAction;
                const meta = [field(item, 'fee'), field(item, 'slots')].filter(Boolean);
                return (
                  <Reveal
                    as="li"
                    key={`${field(item, 'title')}-${i}`}
                    delay={stagger(i)}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-4 py-5 @3xl:grid-cols-[auto_minmax(0,1fr)_auto] @3xl:gap-x-6 @3xl:py-6"
                  >
                    <p data-tpl-tone="inverse" className="flex h-[68px] w-[68px] flex-col items-center justify-center rounded-[14px] bg-(--sp-night) text-white @3xl:h-[76px] @3xl:w-[76px]">
                      <span className={`${DISPLAY} text-[28px] font-bold italic leading-none tabular-nums @3xl:text-[32px]`}>{field(item, 'day') || '–'}</span>
                      {field(item, 'month') && <span className={`${MONO_LABEL} mt-1 text-[11px] text-(--sp-neon)`}>{field(item, 'month')}</span>}
                    </p>
                    <div className="min-w-0">
                      <h3 className={`${TYPE.h3} ${C.ink}`}>{field(item, 'title')}</h3>
                      {field(item, 'category') && <p className={`mt-1 text-[14.5px] ${C.muted}`}>{field(item, 'category')}</p>}
                      {meta.length > 0 && <p className={`mt-1.5 ${MONO} ${C.ink}`}>{meta.join(' · ')}</p>}
                    </div>
                    {action && button && (
                      <ActionLink
                        action={action}
                        aria-label={`${button} ${field(item, 'title')}`}
                        className={`${BTN.outline} ${BTN.sm} col-span-2 w-full gap-2 @3xl:col-span-1 @3xl:w-auto`}
                      >
                        {button}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                      </ActionLink>
                    )}
                  </Reveal>
                );
              })}
            </ul>
            {note && (
              <p className={`mt-5 flex items-start gap-2 text-[13.5px] leading-snug ${C.muted}`}>
                <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--sp-ink)" />
                {note}
              </p>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

/** Ubin harga sewa. Jumlah ganjil di kisi 2 kolom: ubin terakhir melebar (tanpa sel kosong). */
const TILE = `flex min-w-0 items-center gap-4 p-4 @xl:last:odd:col-span-2 @3xl:p-5 ${CARD.light}`;

export function Rental({ m }: { m: SparringModel }) {
  const s = m.rental;
  const items = m.items('rental');
  const image = text(s, 'image');
  const photo = hasImage(image);
  const link = m.linkOr(text(s, 'link_url'), m.waIntent(RENTAL_MESSAGE));
  return (
    <TemplateSection sectionKey="rental" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className={`grid items-center gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
          {photo && (
            <Reveal variant="fade" className="min-w-0 @5xl:col-span-5">
              <KitPhoto
                src={image}
                alt={SPARRING_PHOTOS.alt(image, `Perlengkapan padel untuk disewa di ${m.companyName}`)}
                fallback="none"
                parallax
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="aspect-[4/3] rounded-[14px] @3xl:aspect-[16/10] @5xl:aspect-[4/5]"
              />
            </Reveal>
          )}
          <div className={`min-w-0 ${photo ? '@5xl:col-span-7 @5xl:pl-4' : '@5xl:col-span-12'}`}>
            <SectionHead eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} srTitle="Sewa & coaching" />
            <ul className={`mt-8 grid gap-3 @xl:grid-cols-2 @3xl:mt-10 ${photo ? '' : '@5xl:grid-cols-3'}`}>
              {items.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'name')}-${i}`} delay={stagger(i)} className={`${TILE} ${photo ? '' : '@5xl:last:odd:col-span-1'}`}>
                  <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--sp-night) text-(--sp-neon)">
                    <RentalIcon name={field(item, 'name')} />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-[14.5px] font-medium leading-snug ${C.muted}`}>{field(item, 'name')}</p>
                    {field(item, 'price') && (
                      <p className={`mt-0.5 ${C.ink}`}>
                        <span className={`${DISPLAY} text-[22px] font-semibold tabular-nums`}>{field(item, 'price')}</span>
                        {field(item, 'unit') && <span className={`ml-1 text-[13.5px] ${C.muted}`}>{field(item, 'unit')}</span>}
                      </p>
                    )}
                  </div>
                </Reveal>
              ))}
            </ul>
            <TextLink
              action={link}
              label={text(s, 'link_label')}
              icon={link?.kind === 'external' && /wa\.me/.test(link.href) ? <WhatsAppIcon className="h-4 w-4 shrink-0" /> : undefined}
              className="mt-6"
            />
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
