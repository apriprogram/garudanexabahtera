// Angka perusahaan & perusahaan grup. Angka: pita es biru, empat angka besar (Barlow, menghitung naik) dengan ikon
// garis di atasnya dan garis pemisah tegak (HP 2×2). Perusahaan grup: kartu layanan putih bergaris tipis (referensi
// Pestiva) dengan foto 4:3 di dalam bingkai tipis, LENCANA IKON BULAT warna tema yang menumpang tepi bawah foto,
// label kecil, nama, deskripsi, dan tautan "View detail >" (tautan sendiri, atau formulir kontak dengan unit bisnis
// kartu itu terpilih). Kartu ajakan biru pejal opsional menutup grid.
import { CountUp, Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { useEnquiry } from './context';
import type { PortlineModel } from './model';
import { PORTLINE_PHOTOS } from './photos';
import { C, CARD, LABEL, SECTION_PAD, TYPE_P } from './styles';
import { AutoIcon, Button, SectionHead, SectionLabel, TextLink } from './ui';

export function Stats({ m }: { m: PortlineModel }) {
  const { stats } = m;
  const items = m.items('stats');
  const eyebrow = text(stats, 'eyebrow');
  const title = text(stats, 'title');
  return (
    <TemplateSection sectionKey="stats" className="bg-(--pl-ice) py-14 @3xl:py-18">
      <div className={CONTAINER}>
        {(eyebrow || title) && (
          <div className="mb-10 flex flex-col items-center gap-3 text-center @3xl:mb-12">
            {eyebrow && <SectionLabel>{eyebrow}</SectionLabel>}
            {title ? (
              <h2 className={`${TYPE_P.h2s} ${C.ink}`}>{title}</h2>
            ) : (
              <h2 className="sr-only">{eyebrow}</h2>
            )}
          </div>
        )}
        <dl className={`grid grid-cols-2 ${items.length >= 4 ? '@4xl:grid-cols-4' : items.length === 3 ? '@4xl:grid-cols-3' : ''}`}>
          {items.map((item, i) => (
            <Reveal
              key={`${field(item, 'label')}-${i}`}
              delay={stagger(i)}
              className={`flex min-w-0 flex-col items-center px-3 py-6 text-center @3xl:px-6 @4xl:py-2 ${i % 2 === 1 ? 'border-l border-(--pl-deep)/[0.14]' : ''} ${
                i >= 2 ? 'border-t border-(--pl-deep)/[0.14] @4xl:border-t-0' : ''
              } ${i === 2 ? '@4xl:border-l' : ''}`}
            >
              <dt className={`order-last mt-3 max-w-[22ch] text-[12.5px] font-semibold uppercase leading-snug tracking-[0.1em] ${C.muted}`}>{field(item, 'label')}</dt>
              <dd className="flex flex-col items-center">
                <AutoIcon text={field(item, 'label')} index={i} className="h-9 w-9 text-(--pl-ink) @3xl:h-10 @3xl:w-10" strokeWidth={1.3} />
                <span className={`mt-4 block max-w-full ${TYPE_P.stat} ${C.ink} [overflow-wrap:anywhere]`}>
                  <CountUp value={field(item, 'value')} duration={1700} />
                </span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </TemplateSection>
  );
}

export function Divisions({ m }: { m: PortlineModel }) {
  const { divisions } = m;
  const items = m.items('divisions');
  const { setPrefill } = useEnquiry();
  const ctaTitle = text(divisions, 'cta_title');
  const ctaUrl = text(divisions, 'cta_url');
  const ctaAction = m.linkOr(ctaUrl, m.startAction);
  return (
    <TemplateSection sectionKey="divisions" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(divisions, 'eyebrow')} title={text(divisions, 'title')} subtitle={text(divisions, 'subtitle')} />
        <ul className="mt-10 grid gap-5 @2xl:grid-cols-2 @3xl:mt-14 @5xl:grid-cols-3 @5xl:gap-6">
          {items.map((item, i) => {
            const name = field(item, 'name');
            const image = field(item, 'image');
            const url = field(item, 'url');
            const action = m.linkOr(url, m.contactAction ?? m.waAction);
            const badge = (
              <span
                aria-hidden
                className="flex h-14 w-14 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent) ring-[5px] ring-white"
              >
                <AutoIcon text={name} index={i} className="h-6 w-6" strokeWidth={1.7} />
              </span>
            );
            return (
              <Reveal as="li" key={`${name}-${i}`} delay={stagger(i)} className="min-w-0">
                <article className={`group flex h-full flex-col p-2 ${CARD}`}>
                  {hasImage(image) ? (
                    <div className="relative">
                      <KitPhoto
                        src={image}
                        alt={PORTLINE_PHOTOS.alt(image, name)}
                        fallback="none"
                        zoom
                        sizes="(min-width: 1024px) 31vw, (min-width: 672px) 46vw, 92vw"
                        className="aspect-[4/3] rounded-[5px]"
                        imgClassName="transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
                      />
                      <span className="absolute -bottom-7 right-5">{badge}</span>
                    </div>
                  ) : (
                    <span className="px-4 pt-4">{badge}</span>
                  )}
                  <div className={`flex flex-1 flex-col px-4 pb-4 ${hasImage(image) ? 'pt-6' : 'pt-5'}`}>
                    {field(item, 'label') && <p className={`${LABEL} text-(--pl-ink)`}>{field(item, 'label')}</p>}
                    <h3 className={`mt-2 ${TYPE_P.h3} ${C.ink}`}>{name}</h3>
                    {field(item, 'description') && <p className={`mt-2.5 ${TYPE_P.body} ${C.body}`}>{field(item, 'description')}</p>}
                    <div className="mt-auto pt-4">
                      <TextLink
                        action={action}
                        label={field(item, 'link_label') || m.ui.learnMore}
                        ariaLabel={`${field(item, 'link_label') || m.ui.learnMore}: ${name}`}
                        onNavigate={() => {
                          if (!url && action?.kind === 'section' && action.target === 'contact') setPrefill({ unit: name });
                        }}
                      />
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
          {ctaTitle && (
            <Reveal as="li" delay={stagger(items.length)} className="min-w-0">
              <div data-tpl-tone="inverse" className="relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-[8px] bg-(--pl-band) p-7 text-white @3xl:p-8">
                <div aria-hidden className="pl-dots pointer-events-none absolute -right-4 -top-4 h-32 w-40 text-white/25" />
                <h3 className={`relative max-w-[18ch] ${TYPE_P.h3l}`}>{ctaTitle}</h3>
                {text(divisions, 'cta_text') && <p className="relative mt-3 max-w-[42ch] text-[15px] leading-relaxed text-white/85">{text(divisions, 'cta_text')}</p>}
                <div className="relative mt-auto pt-6">
                  <Button
                    action={ctaAction}
                    label={text(divisions, 'cta_label')}
                    variant="white"
                    onNavigate={() => {
                      if (!ctaUrl && ctaAction?.kind === 'section' && ctaAction.target === 'contact') setPrefill({ type: '', unit: '' });
                    }}
                  />
                </div>
              </div>
            </Reveal>
          )}
        </ul>
      </div>
    </TemplateSection>
  );
}
