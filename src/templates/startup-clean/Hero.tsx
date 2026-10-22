// Hero Startup Clean: terpusat di atas pendar aksen + kisi tipis, lalu panel foto berbingkai dengan dua kartu angka
// kaca. Tanpa foto hero (situs lama menyimpan '') → tanpa panel, kartu angka tampil sebaris di bawah tombol.
import { ArrowRight, CircleCheck, Sparkles } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { photoAlt } from '../shared/assets';
import { CONTAINER } from '../shared/layout';
import type { CompanyProfileModel } from '../shared/model';
import { Photo } from '../shared/Photo';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, isEnabled, list, resolveAction, splitHighlight, text } from '../shared/utils';
import { BTN_PRIMARY, BTN_SECONDARY, H1, LEAD, heroStats } from './styles';
import { Eyebrow, GlassStat } from './ui';

const GLOW = { backgroundImage: 'radial-gradient(60% 55% at 50% 0%, var(--tpl-accent-100), transparent 72%)' };
const GRID = {
  backgroundImage: 'linear-gradient(rgba(18,22,32,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(18,22,32,0.05) 1px, transparent 1px)',
  backgroundSize: '56px 56px',
  maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%)',
  WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%)',
};

export function Hero({ m }: { m: CompanyProfileModel }) {
  const { hero, about, advantages } = m;
  const title = text(hero, 'title') || m.companyName;
  const parts = splitHighlight(title, text(hero, 'highlight'));
  const primary = resolveAction(text(hero, 'primary_url'), m.contactAction);
  const secondaryLabel = text(hero, 'secondary_label');
  const secondary = secondaryLabel ? resolveAction(text(hero, 'secondary_url'), m.servicesAction) : null;
  const eyebrow = text(hero, 'eyebrow');
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const withImage = hasImage(image);
  // Poin & angka dipinjam dari section Cerita / Dampak, hanya bila section itu tampil
  const points = isEnabled(about)
    ? list(about, 'points', 6)
        .map((p) => field(p, 'text'))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const { lead, second } = heroStats(isEnabled(advantages) ? list(advantages, 'stats', 4) : []);

  const leadCard = lead && <GlassStat value={field(lead, 'value')} label={field(lead, 'label')} className="h-full" />;
  const secondCard = second && <GlassStat value={field(second, 'value')} label={field(second, 'label')} className="h-full" />;

  return (
    <TemplateSection sectionKey="hero" className="relative isolate -mt-[68px] overflow-hidden pt-[68px] @3xl:-mt-[80px] @3xl:pt-[80px]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] @5xl:h-[980px]">
        <div className="absolute inset-0" style={GLOW} />
        <div className="absolute inset-0" style={GRID} />
        <div className="absolute -left-40 top-40 h-[380px] w-[380px] rounded-full bg-(--tpl-accent-50) opacity-80 blur-3xl" />
        <div className="absolute -right-32 top-24 h-[320px] w-[320px] rounded-full bg-(--tpl-accent-50) opacity-80 blur-3xl" />
      </div>

      <div className={`${CONTAINER} pb-12 pt-12 text-center @3xl:pb-16 @3xl:pt-20 @5xl:pt-24`}>
        {eyebrow && (
          <Reveal>
            <Eyebrow glass icon={<Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />}>
              {eyebrow}
            </Eyebrow>
          </Reveal>
        )}

        <Reveal as="h1" delay={80} className={`mx-auto mt-6 max-w-[20ch] text-balance [overflow-wrap:anywhere] ${H1}`}>
          {parts ? (
            <>
              {parts[0]}
              {/* Garis bawah aksen per baris (tetap rapi saat sorotan terpotong ke dua baris) */}
              <span className="bg-[linear-gradient(var(--tpl-accent-200),var(--tpl-accent-200))] bg-[length:100%_0.12em] bg-[position:0_94%] bg-no-repeat text-(--tpl-accent-ink) [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                {parts[1]}
              </span>
              {parts[2]}
            </>
          ) : (
            title
          )}
        </Reveal>

        {subtitle && (
          <Reveal as="p" delay={160} className={`mx-auto mt-6 max-w-[60ch] ${LEAD}`}>
            {subtitle}
          </Reveal>
        )}

        {(primary || secondary) && (
          <Reveal delay={240} className="mx-auto mt-9 flex max-w-sm flex-col gap-3 @md:max-w-none @md:flex-row @md:justify-center">
            {primary && (
              <ActionLink action={primary} className={`${BTN_PRIMARY} w-full @md:w-auto`}>
                {text(hero, 'primary_label') || 'Hubungi Kami'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ActionLink>
            )}
            {secondary && (
              <ActionLink action={secondary} className={`${BTN_SECONDARY} w-full @md:w-auto`}>
                {secondaryLabel}
              </ActionLink>
            )}
          </Reveal>
        )}

        {points.length > 0 && (
          <Reveal
            as="ul"
            delay={300}
            className="mx-auto mt-8 flex w-fit max-w-full flex-col items-start gap-y-2.5 @2xl:w-auto @2xl:max-w-3xl @2xl:flex-row @2xl:flex-wrap @2xl:justify-center @2xl:gap-x-6"
          >
            {points.map((point, i) => (
              <li key={i} className="inline-flex items-start gap-2 text-left text-[14px] font-medium text-muted">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-(--tpl-accent-ink)" aria-hidden />
                {point}
              </li>
            ))}
          </Reveal>
        )}

        {withImage ? (
          <div className="relative mx-auto mt-12 max-w-[1200px] @3xl:mt-16 @5xl:mt-20">
            <Reveal variant="scale" delay={320}>
              <div className="rounded-[24px] bg-white/60 p-1.5 ring-1 ring-black/[0.06] backdrop-blur @3xl:rounded-[32px] @3xl:p-2.5">
                <Photo
                  src={image}
                  alt={photoAlt(image, title)}
                  priority
                  sizes="(min-width: 1280px) 1200px, 100vw"
                  position="60% 30%"
                  className="aspect-[4/3] rounded-[18px] @3xl:aspect-[16/9] @3xl:rounded-[24px]"
                />
              </div>
            </Reveal>
            {(leadCard || secondCard) && (
              // HP: dua kartu sebaris menumpang tepi bawah foto (wajah & produk tidak tertutup); @3xl: di sudut foto;
              // @7xl: menjorok keluar tepi panel
              <div className="relative z-10 -mt-7 grid grid-cols-2 gap-2.5 px-3 @3xl:contents">
                {leadCard && (
                  <div className={`min-w-0 @3xl:absolute @3xl:bottom-8 @3xl:left-8 @7xl:-left-10 @7xl:bottom-[18%] ${secondCard ? '' : 'col-span-2 justify-self-center'}`}>
                    <Reveal variant="left" delay={440} className="h-full">
                      {leadCard}
                    </Reveal>
                  </div>
                )}
                {secondCard && (
                  <div className={`min-w-0 @3xl:absolute @3xl:bottom-8 @3xl:right-8 @7xl:-right-10 @7xl:bottom-auto @7xl:top-[16%] ${leadCard ? '' : 'col-span-2 justify-self-center'}`}>
                    <Reveal variant="right" delay={520} className="h-full">
                      {secondCard}
                    </Reveal>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          (leadCard || secondCard) && (
            <Reveal delay={320} className="mx-auto mt-12 flex max-w-xl flex-wrap justify-center gap-3 @3xl:mt-14">
              {leadCard}
              {secondCard}
            </Reveal>
          )
        )}
      </div>
    </TemplateSection>
  );
}
