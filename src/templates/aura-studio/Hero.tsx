// Hero Aura Studio — "belah editorial" (brief §4.2, data-hero-layout="split"): grid asimetris 45/55. Kiri: judul
// KAPITAL Jost tipis (kata muncul bertahap), deskripsi, lalu daftar layanan bergaris rambut (thumbnail, nama, chip
// jumlah, panah bulat). Kanan: kartu foto POTRET tinggi radius 28 yang naik sampai atas halaman (sejajar navigasi),
// dengan chip lokasi, aksi reservasi + ikon bulat (desktop), chip "cari jadwal" (tautan nyata, bukan input), dan dua
// chip kecil di bawah (pesan WhatsApp, media sosial). HP: judul → kartu foto 4:5 → daftar layanan.
import { Instagram, MapPin, Search } from 'lucide-react';
import { Fragment } from 'react';
import { Reveal } from '../shared/Animated';
import { TikTokIcon, WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, isEnabled, resolveAction, splitHighlight, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { usePhotoSet } from '../kit/context';
import type { AuraModel, SocialLink } from './model';
import { heroPicks } from './model';
import { DISPLAY, GLASS, HAIR, INK, MUTED } from './styles';
import { ArrowDot, Chip, SageButton, TextLink } from './ui';

/** Judul dipecah per kata (muncul bertahap 90ms/kata); kata sorotan berwarna aksen-ink. */
function HeroTitle({ title, highlight }: { title: string; highlight: string }) {
  const parts = splitHighlight(title, highlight) ?? [title, '', ''];
  const words = parts.flatMap((part, partIndex) =>
    part
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({ word, accent: partIndex === 1 })),
  );
  return (
    <h1
      className={`${DISPLAY} text-[40px] leading-[0.98] @2xl:text-[56px] @5xl:text-[64px] @6xl:text-[76px] @7xl:text-[88px] [overflow-wrap:anywhere]`}
    >
      {words.map(({ word, accent }, i) => (
        <Fragment key={`${word}-${i}`}>
          {i > 0 && ' '}
          <Reveal as="span" delay={stagger(i, 90, 8)} className={`inline-block ${accent ? 'text-(--tpl-accent-ink)' : ''}`}>
            {word}
          </Reveal>
        </Fragment>
      ))}
    </h1>
  );
}

const SOCIAL_ICON = { instagram: Instagram, tiktok: TikTokIcon } as const;

function SocialDots({ socials, className = '' }: { socials: SocialLink[]; className?: string }) {
  const shown = socials.filter((s) => s.key in SOCIAL_ICON).slice(0, 2);
  if (!shown.length) return null;
  return (
    <span className={`flex items-center gap-1 ${className}`}>
      {shown.map((s) => {
        const Icon = SOCIAL_ICON[s.key as keyof typeof SOCIAL_ICON];
        return (
          <ActionLink
            key={s.key}
            action={{ kind: 'external', href: s.href }}
            aria-label={s.label}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C1C1C] text-white transition-opacity hover:opacity-80"
          >
            <Icon className="h-4 w-4" />
          </ActionLink>
        );
      })}
    </span>
  );
}

export function Hero({ m, onCategory }: { m: AuraModel; onCategory: (category: string | null) => void }) {
  const photos = usePhotoSet();
  const { hero, contact } = m;
  const title = text(hero, 'title') || m.companyName;
  const subtitle = text(hero, 'subtitle');
  const image = text(hero, 'image');
  const location = text(hero, 'eyebrow');
  const hours = isEnabled(contact) ? text(contact, 'hours') : '';
  const listTitle = text(hero, 'list_title');
  const bookingLabel = text(hero, 'booking_label');
  const chatLabel = text(hero, 'chat_label');
  const socialLabel = text(hero, 'social_label');
  const picks = m.servicesOn ? heroPicks(m.treatments, 3) : [];
  const allAction: LinkAction | null = resolveAction(text(hero, 'secondary_url'), m.servicesAction);
  const secondaryLabel = text(hero, 'secondary_label');
  const socials = m.socials.filter((s) => s.key in SOCIAL_ICON);
  const showSocialChip = !!socialLabel && socials.length > 0;
  const showChatChip = !!chatLabel && !!m.waAction;

  return (
    <TemplateSection sectionKey="hero" data-hero-layout="split" className="pb-16 @3xl:pb-20 @5xl:pb-24">
      <div className={CONTAINER}>
        <div className="grid gap-8 @5xl:grid-cols-[45fr_55fr] @5xl:grid-rows-[auto_1fr] @5xl:gap-x-6 @5xl:gap-y-12">
          {/* Judul */}
          <div className="pt-8 @3xl:pt-12 @5xl:col-start-1 @5xl:row-start-1 @5xl:pt-14 @7xl:pt-20">
            <HeroTitle title={title} highlight={text(hero, 'highlight')} />
            {subtitle && (
              <Reveal delay={420}>
                <p className={`mt-6 max-w-[44ch] text-[15px] leading-relaxed ${MUTED} @3xl:text-[16px] @5xl:mt-8`}>{subtitle}</p>
              </Reveal>
            )}
            {m.reserveAction && (
              <Reveal delay={500} className="mt-7 @5xl:hidden">
                <SageButton action={m.reserveAction}>{m.reserveLabel}</SageButton>
              </Reveal>
            )}
          </div>

          {/* Kartu foto potret */}
          <div className="relative @5xl:col-start-2 @5xl:row-span-2 @5xl:row-start-1 @5xl:-mt-[72px] @5xl:min-h-[clamp(640px,calc(100svh-var(--tpl-sticky-top,0px)-32px),880px)]">
            <KitPhoto
              src={image}
              alt={photos.alt(image, `Suasana ${m.companyName}`)}
              priority
              zoom
              sizes="(min-width: 1024px) 55vw, 100vw"
              position="50% 32%"
              className="relative aspect-[4/5] w-full rounded-[24px] @3xl:aspect-[5/4] @5xl:aspect-auto @5xl:h-full @5xl:rounded-[28px]"
            >
              {/* Chip lokasi */}
              {(location || hours) && (
                <Reveal variant="fade" delay={400} className="absolute left-3 top-3 max-w-[calc(100%-24px)] @3xl:left-4 @3xl:top-4 @5xl:max-w-[50%]">
                  <p className={`flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 ${GLASS}`}>
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                      <MapPin className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 leading-tight">
                      {location && <span className={`block truncate text-[12px] font-medium ${INK}`}>{location}</span>}
                      {hours && <span className={`block truncate text-[11px] ${MUTED}`}>{hours}</span>}
                    </span>
                  </p>
                </Reveal>
              )}

              {/* Aksi kanan-atas (desktop): reservasi + ikon bulat */}
              <div className="absolute right-4 top-4 hidden items-center gap-2 @5xl:flex">
                {m.reserveAction && (
                  <ActionLink
                    action={m.reserveAction}
                    className="inline-flex h-10 items-center rounded-full bg-(--tpl-accent) px-5 text-[12px] font-medium uppercase tracking-[0.12em] text-(--tpl-on-accent) ring-1 ring-inset ring-black/10 transition-colors hover:bg-(--tpl-accent-hover)"
                  >
                    {m.reserveLabel}
                  </ActionLink>
                )}
                {m.waAction && (
                  <ActionLink
                    action={m.waAction}
                    aria-label="Kirim pesan WhatsApp"
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${INK} ${GLASS} transition-colors hover:bg-white`}
                  >
                    <WhatsAppIcon className="h-[18px] w-[18px]" />
                  </ActionLink>
                )}
                {m.instagram && (
                  <ActionLink
                    action={{ kind: 'external', href: m.instagram.href }}
                    aria-label="Instagram"
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${INK} ${GLASS} transition-colors hover:bg-white`}
                  >
                    <Instagram className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </ActionLink>
                )}
              </div>

              {/* Chip "cari jadwal" = tautan reservasi (bukan kolom isian) */}
              {bookingLabel && m.reserveAction && (
                <Reveal
                  variant="fade"
                  delay={520}
                  className="absolute inset-x-3 top-[58%] @3xl:inset-x-auto @3xl:left-1/2 @3xl:w-[min(460px,70%)] @3xl:-translate-x-1/2"
                >
                  <ActionLink
                    action={m.reserveAction}
                    aria-label={`${bookingLabel}, reservasi`}
                    className={`group flex h-14 items-center gap-3 rounded-full pl-5 pr-2 ${GLASS} transition-colors hover:bg-white`}
                  >
                    <Search className={`h-4 w-4 shrink-0 ${INK}`} strokeWidth={1.75} aria-hidden />
                    <span className={`min-w-0 flex-1 truncate text-[14px] ${INK}`}>{bookingLabel}</span>
                    <ArrowDot size="h-10 w-10" />
                  </ActionLink>
                </Reveal>
              )}

              {/* Dua chip bawah: pesan & media sosial */}
              {(showChatChip || showSocialChip) && (
                <Reveal variant="fade" delay={640} className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 @3xl:inset-x-4 @3xl:bottom-4">
                  {showChatChip ? (
                    <ActionLink
                      action={m.waAction}
                      className={`flex h-12 min-w-0 items-center gap-2.5 rounded-full pl-1.5 pr-4 ${GLASS} transition-colors hover:bg-white`}
                    >
                      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                        <WhatsAppIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 leading-tight">
                        <span className={`block truncate text-[13px] font-medium ${INK}`}>{chatLabel}</span>
                        <span className={`hidden truncate text-[11px] ${MUTED} @xl:block`}>Balas cepat lewat WhatsApp</span>
                      </span>
                    </ActionLink>
                  ) : (
                    <span />
                  )}
                  {showSocialChip && (
                    <div className={`flex h-12 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-4 ${GLASS}`}>
                      <SocialDots socials={socials} />
                      <span className={`text-[13px] font-medium ${INK}`}>{socialLabel}</span>
                    </div>
                  )}
                </Reveal>
              )}
            </KitPhoto>
          </div>

          {/* Daftar layanan bergaris rambut */}
          {picks.length > 0 && (
            <div className="@5xl:col-start-1 @5xl:row-start-2 @5xl:self-end">
              <Reveal delay={300} className="flex items-center gap-3">
                {listTitle && <p className={`text-[13px] font-medium ${INK}`}>{listTitle}</p>}
                <Chip>{m.treatments.length} perawatan</Chip>
              </Reveal>
              <ul className={`mt-4 border-t ${HAIR}`}>
                {picks.map((t, i) => (
                  <Reveal as="li" key={t.index} delay={360 + stagger(i)} className={`border-b ${HAIR}`}>
                    <ActionLink
                      action={{ kind: 'section', target: 'services' }}
                      onNavigate={() => onCategory(t.category || null)}
                      className="group flex min-h-[68px] items-center gap-4 py-3"
                    >
                      {hasImage(t.image) ? (
                        <KitPhoto src={t.image} alt="" sizes="48px" className="h-12 w-12 shrink-0 rounded-[12px]" />
                      ) : (
                        <span aria-hidden className="h-12 w-12 shrink-0 rounded-[12px] bg-(--tpl-accent-200)" />
                      )}
                      <span className={`min-w-0 flex-1 truncate text-[14px] ${INK} @3xl:text-[15px]`}>{t.title}</span>
                      {t.count && <Chip>{t.count}</Chip>}
                      <ArrowDot tone="line" className="group-hover:bg-(--tpl-accent) group-hover:text-(--tpl-on-accent) group-hover:ring-transparent" />
                    </ActionLink>
                  </Reveal>
                ))}
              </ul>
              {secondaryLabel && (
                <TextLink action={allAction} className="mt-3">
                  {secondaryLabel}
                </TextLink>
              )}
            </div>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
