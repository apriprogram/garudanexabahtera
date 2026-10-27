// Klien (kunci `clients`) + Tentang kami (kunci `about`).
// Klien: judul mono kecil yang SEKALIGUS H2 + garis ke kanan, lalu kisi sel bergaris tipis (6 kolom layar lebar, 3 di
// tablet, 2 di HP): nama klien Space Grotesk (atau logo abu-abu) + sektor mono. Statis, tanpa marquee.
// Tentang: label bernomor selebar wadah; foto 3:2 di kolom 1-7, H2 + cerita + baris fakta manifest (label kiri, nilai
// mono kanan) + tautan ke proses di kolom 8-12. HP: label → foto → H2 → cerita → fakta → tautan.
import { Fragment } from 'react';
import { Reveal } from '../shared/Animated';
import { ClientLogo } from '../shared/clients';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, paragraphs, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { DermagaModel } from './model';
import { DERMAGA_PHOTOS } from './photos';
import { C, DISPLAY, GRID_GAP, MONO_LABEL, MONO_VALUE, SECTION_PAD, TYPE_D } from './styles';
import { SectionLabel, TextLink } from './ui';

export function Clients({ m }: { m: DermagaModel }) {
  const items = m.items('clients');
  const title = text(m.clients, 'title');
  return (
    <TemplateSection sectionKey="clients" className="pb-4 pt-16 @3xl:pt-20 @5xl:pt-24">
      <div className={CONTAINER}>
        <div className="flex items-center gap-3">
          <h2 className={title ? `min-w-0 text-balance ${MONO_LABEL} ${C.muted}` : 'sr-only'}>{title || 'Klien kami'}</h2>
          {/* HP: judul panjang terbungkus 2 baris → garis disembunyikan supaya tidak menggantung di baris pertama */}
          {title && <span aria-hidden className="hidden h-px min-w-8 flex-1 bg-[#0F1D20]/[0.14] @3xl:block" />}
        </div>
        {/* Tiap sel menggambar garis atas & bawahnya sendiri (-mt-px: baris bertetangga berbagi satu garis), jadi baris
            terakhir yang tidak penuh tetap tertutup dan slot kosong tanpa garis. Garis kiri kolom pertama disembunyikan.
            Warna garis pejal #DDDFE0 (= tinta 14% di atas putih): garis yang bertumpuk tidak menjadi lebih gelap. */}
        <Reveal variant="fade" className="mt-6 overflow-hidden">
          <ul className="-ml-px grid grid-cols-2 pt-px @3xl:grid-cols-3 @5xl:grid-cols-6">
            {items.map((item, i) => {
              const name = field(item, 'name');
              const logo = field(item, 'logo');
              const sector = field(item, 'sector');
              return (
                <li
                  key={`${name}-${i}`}
                  className="-mt-px flex min-h-[112px] min-w-0 flex-col justify-between gap-4 border-y border-l border-[#DDDFE0] px-4 py-5 @3xl:px-5 @3xl:py-6"
                >
                  {hasImage(logo) ? (
                    <ClientLogo name={name} logo={logo} className="h-7" />
                  ) : (
                    <span className={`${DISPLAY} text-[17px] font-medium leading-tight tracking-[-0.02em] ${C.ink} @3xl:text-[18px]`}>{name}</span>
                  )}
                  {sector && (
                    // HP (2 kolom sempit): bagian "Sektor · Kota" ditumpuk per baris supaya titik tidak menggantung di ujung baris
                    <span className={`font-mono text-[12px] leading-snug tracking-[0.01em] ${C.muted}`}>
                      {sector
                        .split('·')
                        .map((part) => part.trim())
                        .filter(Boolean)
                        .map((part, j) => (
                          <Fragment key={`${part}-${j}`}>
                            {j > 0 && (
                              <span aria-hidden className="hidden @3xl:inline">
                                {' · '}
                              </span>
                            )}
                            <span className="block @3xl:inline">{part}</span>
                          </Fragment>
                        ))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </TemplateSection>
  );
}

export function About({ m }: { m: DermagaModel }) {
  const { about } = m;
  const title = text(about, 'title');
  const body = paragraphs(text(about, 'body'));
  const image = text(about, 'image');
  const facts = list(about, 'facts', 6).filter((item) => field(item, 'label') || field(item, 'value'));
  const linkAction = m.linkOr(text(about, 'link_url'), m.sectionAction('process'));
  const eyebrow = text(about, 'eyebrow');
  const withPhoto = hasImage(image);

  return (
    <TemplateSection sectionKey="about" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 ${GRID_GAP}`}>
        {eyebrow && (
          <Reveal variant="fade" className="order-1 @5xl:order-none @5xl:col-span-12 @5xl:row-start-1">
            <SectionLabel label={eyebrow} number={m.number('about')} />
          </Reveal>
        )}
        {withPhoto && (
          // Layar lebar: foto ikut menempel di bawah header selama kolom teks (lebih tinggi) masih digulir
          <Reveal
            variant="fade"
            className={`order-2 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+104px)] @5xl:order-none @5xl:col-span-7 @5xl:row-start-2 @5xl:mt-10 @5xl:self-start ${eyebrow ? 'mt-7' : ''}`}
          >
            <KitPhoto
              src={image}
              alt={DERMAGA_PHOTOS.alt(image, `Kegiatan tim ${m.companyName}`)}
              sizes="(min-width: 1024px) 58vw, 100vw"
              zoom
              className="aspect-[3/2]"
            />
          </Reveal>
        )}
        <div
          className={`order-3 min-w-0 @5xl:order-none @5xl:row-start-2 @5xl:mt-10 ${
            withPhoto ? '@5xl:col-span-5 @5xl:col-start-8' : '@5xl:col-span-8'
          } ${withPhoto ? 'mt-8' : eyebrow ? 'mt-7' : ''}`}
        >
          {title ? (
            // text-pretty (bukan balance): di kolom 5/12 balance memecah "Satu tim untuk / dokumen, / gudang, …", pretty
            // mencegah satu kata menggantung di baris terakhir. Wadah 1024-1151px: kolom 5/12 terlalu sempit untuk 50px →
            // 42px supaya "dokumen, gudang," tetap sebaris.
            <Reveal as="h2" delay={80} className={`max-w-[20ch] ${TYPE_D.h2} text-pretty! ${C.ink} ${withPhoto ? '@5xl:@max-6xl:text-[42px]!' : ''}`}>
              {title}
            </Reveal>
          ) : (
            <h2 className="sr-only">{eyebrow || 'Tentang kami'}</h2>
          )}
          {body.length > 0 && (
            <Reveal delay={160} className={`mt-6 space-y-4 ${TYPE_D.body} ${C.muted} @3xl:text-[16px]`}>
              {body.map((p, i) => (
                <p key={i} className="max-w-[60ch] text-pretty">
                  {p}
                </p>
              ))}
            </Reveal>
          )}
          {facts.length > 0 && (
            <dl className="mt-8 divide-y divide-[#0F1D20]/[0.14] border-y border-[#0F1D20]/[0.14]">
              {facts.map((item, i) => (
                <Reveal key={`${field(item, 'label')}-${i}`} delay={stagger(i, 60)} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
                  <dt className={`text-[14px] ${C.muted}`}>{field(item, 'label')}</dt>
                  <dd className={`ml-auto ${MONO_VALUE} text-right ${C.ink}`}>{field(item, 'value')}</dd>
                </Reveal>
              ))}
            </dl>
          )}
          <TextLink action={linkAction} label={text(about, 'link_label')} className="mt-6" />
        </div>
      </div>
    </TemplateSection>
  );
}
