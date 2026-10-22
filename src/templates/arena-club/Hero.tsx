// Hero Arena Club — "banner terpusat" (brief §4.1, data-hero-layout="banner"): foto mengisi banner selebar CONTAINER
// (tidak menembus tepi layar) dengan radius besar; judul putih Urbanist TIPIS terpusat DI ATAS foto, scrim navy
// atas + tengah + bawah agar teks ≥ 4,5:1; kiri-bawah bukti sosial (teks + 3 foto pelatih bertumpuk), kanan-bawah
// tautan sosial. HP: banner tetap foto (tinggi ±4:5) dengan judul di atas foto, tombol penuh lebar, bukti sosial di
// dalam banner; tautan sosial pindah ke footer.
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, resolveAction, splitHighlight, text } from '../shared/utils';
import { KitAvatar, KitPhoto } from '../kit/Photo';
import type { ArenaModel } from './model';
import { ARENA_PHOTOS } from './photos';
import { BTN, TYPE_A } from './styles';
import { PillLink } from './ui';

function Proof({ m, className = '' }: { m: ArenaModel; className?: string }) {
  const proofText = text(m.hero, 'proof_text');
  const photos = m.proofPhotos;
  if (!proofText && photos.length === 0) return null;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {proofText && <p className="max-w-[24ch] text-left text-[13px] leading-snug text-white/90">{proofText}</p>}
      {photos.length > 0 && (
        <ul className="flex shrink-0 -space-x-2.5 rounded-full bg-white/15 p-1 ring-1 ring-inset ring-white/25 backdrop-blur-md" aria-label="Pelatih kami">
          {photos.map((person, i) => (
            <Reveal as="li" key={`${person.photo}-${i}`} variant="fade" delay={360 + stagger(i, 90)} className="relative">
              <KitAvatar name={person.name} photo={person.photo} sizes="36px" className="h-9 w-9 ring-2 ring-white" />
              {person.name && <span className="sr-only">{person.name}</span>}
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Hero({ m }: { m: ArenaModel }) {
  const { hero } = m;
  const eyebrow = text(hero, 'eyebrow');
  const title = text(hero, 'title') || m.companyName;
  const parts = splitHighlight(title, text(hero, 'highlight'));
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const primary = resolveAction(text(hero, 'primary_url'), m.bookAction);
  const secondary = resolveAction(text(hero, 'secondary_url'), m.membershipAction);
  const primaryLabel = text(hero, 'primary_label');
  const secondaryLabel = text(hero, 'secondary_label');

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="banner" className="pt-2 @3xl:pt-3">
      <div className={CONTAINER}>
        <div
          data-tpl-tone="inverse"
          className="relative isolate flex min-h-[560px] flex-col overflow-hidden rounded-[24px] bg-[#0E1B2E] text-white @3xl:min-h-[600px] @3xl:rounded-[32px] @5xl:min-h-[max(560px,min(78svh,720px))]"
        >
          {hasImage(image) && (
            <KitPhoto
              src={image}
              alt={ARENA_PHOTOS.alt(image, `Suasana ${m.companyName}`)}
              priority
              parallax={5}
              fallback="none"
              position="32% 45%"
              sizes="(min-width: 1680px) 1552px, 100vw"
              className="absolute inset-0"
            />
          )}
          {/* Scrim navy: rata (lebih pekat di HP), lingkaran lembut di belakang judul, atas & bawah */}
          <div aria-hidden className="absolute inset-0 bg-[#0E1B2E]/45 @3xl:bg-[#0E1B2E]/35" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_62%_at_50%_44%,rgba(14,27,46,0.55),rgba(14,27,46,0)_74%)]"
          />
          <div aria-hidden className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-[#0E1B2E]/40 to-transparent" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-[#0E1B2E]/80 to-transparent" />

          <div className="relative flex flex-1 flex-col items-center justify-center px-5 pb-8 pt-12 text-center @3xl:px-12 @3xl:pb-6 @3xl:pt-16 @5xl:pb-10">
            {eyebrow && (
              <Reveal variant="fade">
                <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#0E1B2E]/40 px-3.5 py-1.5 text-[13px] font-medium text-white ring-1 ring-inset ring-white/25 backdrop-blur-md">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--tpl-accent)" />
                  <span className="truncate">{eyebrow}</span>
                </p>
              </Reveal>
            )}
            <Reveal as="h1" delay={80} className={`${eyebrow ? 'mt-5 @3xl:mt-6' : ''} max-w-[18ch] text-balance ${TYPE_A.h1}`}>
              {parts ? (
                <>
                  {parts[0]}
                  <span className="underline decoration-(--tpl-accent) decoration-2 underline-offset-[0.16em] [text-decoration-skip-ink:none] @3xl:decoration-[3px]">
                    {parts[1]}
                  </span>
                  {parts[2]}
                </>
              ) : (
                title
              )}
            </Reveal>
            {subtitle && (
              <Reveal as="p" delay={160} className="mt-5 max-w-[56ch] text-pretty text-[15px] leading-relaxed text-white @3xl:mt-6 @3xl:text-[17px]">
                {subtitle}
              </Reveal>
            )}
            {((primary && primaryLabel) || (secondary && secondaryLabel)) && (
              <Reveal
                delay={240}
                className="mt-8 flex w-full flex-col items-stretch gap-3 @xl:w-auto @xl:flex-row @xl:items-center @xl:justify-center"
              >
                <PillLink action={primary} label={primaryLabel} className={`${BTN.accent} ${BTN.lg}`} />
                <PillLink action={secondary} label={secondaryLabel} className={`${BTN.ghostLight} ${BTN.lg}`} />
              </Reveal>
            )}
            <Reveal delay={320} variant="fade" className="mt-8 @3xl:hidden">
              <Proof m={m} className="justify-center" />
            </Reveal>
          </div>

          <div className="relative hidden items-end justify-between gap-6 px-8 pb-7 @3xl:flex @5xl:px-10 @5xl:pb-8">
            <Proof m={m} />
            {m.socials.length > 0 && (
              <ul className="flex flex-wrap justify-end gap-x-5 gap-y-1" aria-label="Media sosial">
                {m.socials.map((social) => (
                  <li key={social.key}>
                    <ActionLink
                      action={{ kind: 'external', href: social.href }}
                      className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium text-white/90 transition-colors hover:text-white"
                    >
                      {social.label}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
