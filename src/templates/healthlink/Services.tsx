// Layanan (kunci `services`) + Cara konsultasi (kunci `steps`).
// Layanan: kartu putih besar di kanvas, 2 kolom di HP (seperti ubin aplikasi) → 3 kolom; kotak ikon tint 52px (ikon
// otomatis dari judul), judul, satu kalimat, dan label kapsul (harga/keterangan). Seluruh kartu = satu tautan (isian
// sendiri, atau tujuan otomatis dari ikon).
// Cara konsultasi: pita putih; langkah bernomor (lingkaran warna tema + garis penghubung) di kiri, foto tegak di kanan
// dengan kartu percakapan yang menimpanya: kepala dokter (inisial, bukan foto), tiga gelembung chat. Gerak khas:
// gelembung muncul berurutan dengan titik "mengetik" di antaranya, sekali saat terlihat (./healthlink.css).
import { useRef, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER, SECTION_GAP } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { usePlayOnce } from './hooks';
import { isOnline, pad2, type HealthLinkModel } from './model';
import { HEALTHLINK_PHOTOS } from './photos';
import { C, CARD, CARD_HOVER, CHIP, DISPLAY, SECTION_PAD, TYPE_H } from './styles';
import { IconTile, SectionHead, StatusDot } from './ui';

export function Services({ m }: { m: HealthLinkModel }) {
  const { services } = m;
  const items = m.items('services');
  return (
    <TemplateSection sectionKey="services" className={`${C.canvas} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead
          center
          eyebrow={text(services, 'eyebrow')}
          title={text(services, 'title')}
          subtitle={text(services, 'subtitle')}
          srTitle={text(services, 'eyebrow') || 'Layanan'}
        />
        <ul className={`${SECTION_GAP} mx-auto grid max-w-[1200px] grid-cols-2 gap-3 @3xl:grid-cols-3 @3xl:gap-4 @6xl:gap-5`}>
          {items.map((item, i) => {
            const title = field(item, 'title');
            const action = m.itemAction(title, field(item, 'link_url'));
            const body = (
              <>
                <IconTile title={title} className="h-[52px] w-[52px] @3xl:h-14 @3xl:w-14" iconClassName="h-[26px] w-[26px] @3xl:h-7 @3xl:w-7" />
                <h3 className={`mt-4 ${C.ink} ${TYPE_H.h3}`}>{title}</h3>
                {field(item, 'text') && <p className={`mt-1.5 flex-1 ${TYPE_H.small} ${C.muted} @3xl:text-[15px] @3xl:leading-relaxed`}>{field(item, 'text')}</p>}
                {field(item, 'meta') && (
                  <span className={`${CHIP} mt-4 self-start bg-[#F5F7FA] text-[12px] text-[#0E1B2B] @3xl:text-[12.5px]`}>{field(item, 'meta')}</span>
                )}
              </>
            );
            const box = `flex h-full flex-col p-4 @3xl:p-6 ${CARD}`;
            return (
              <Reveal as="li" key={`${title}-${i}`} variant="scale" delay={stagger(i, 60)} className="min-w-0">
                {action ? (
                  <ActionLink action={action} className={`${box} ${CARD_HOVER}`}>
                    {body}
                  </ActionLink>
                ) : (
                  <div className={box}>{body}</div>
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </TemplateSection>
  );
}

/** Kartu ilustrasi percakapan: kepala dokter + tiga gelembung (pasien, dokter, pasien) dengan titik mengetik. */
function ChatCard({ m }: { m: HealthLinkModel }) {
  const { steps } = m;
  const ref = useRef<HTMLDivElement>(null);
  const play = usePlayOnce(ref);
  const name = text(steps, 'chat_doctor_name');
  const role = text(steps, 'chat_doctor_role');
  const note = text(steps, 'chat_note');
  // [teks, dari pasien?, mulai titik mengetik (ms), gelembung muncul (ms)]
  const bubbles = (
    [
      [text(steps, 'chat_patient'), true, 0, 200],
      [text(steps, 'chat_doctor'), false, 650, 1350],
      [text(steps, 'chat_reply'), true, 1750, 2350],
    ] as const
  ).filter(([value]) => value);
  if (!name && bubbles.length === 0) return null;

  return (
    <div ref={ref} data-play={play} className="hl-chat relative rounded-[24px] bg-white p-4 ring-1 ring-inset ring-[#0E1B2B]/[0.08] @3xl:p-5">
      <div className="flex items-center gap-3 border-b border-[#0E1B2B]/[0.08] pb-3.5">
        <span aria-hidden className={`${DISPLAY} flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-(--hl-tint) text-[15px] font-bold text-(--hl-tint-ink)`}>
          {initials(name.replace(/^dr\.?\s+/i, ''), 'DR')}
        </span>
        <span className="min-w-0 flex-1">
          {name && <span className={`block truncate text-[15px] font-semibold ${C.ink}`}>{name}</span>}
          {role && (
            <span className={`mt-0.5 flex items-center gap-1.5 text-[12.5px] ${C.muted}`}>
              <StatusDot online={isOnline(role)} />
              <span className="truncate">{role}</span>
            </span>
          )}
        </span>
      </div>
      <ul aria-label={note || 'Contoh percakapan'} className="mt-3.5 space-y-2.5">
        {bubbles.map(([value, fromPatient, typeAt, at], i) => (
          <li
            key={i}
            className={`grid ${fromPatient ? 'justify-items-end' : 'justify-items-start'}`}
            style={{ '--hl-at': `${at}ms`, '--hl-type-at': `${typeAt}ms`, '--hl-type': `${Math.max(300, at - typeAt)}ms` } as CSSProperties}
          >
            {i > 0 && (
              <span aria-hidden className={`hl-typing col-start-1 row-start-1 flex h-9 items-center gap-1 self-center rounded-full px-3.5 ${fromPatient ? 'bg-(--hl-tint)' : 'bg-[#F5F7FA]'}`}>
                <i className="block h-1.5 w-1.5 rounded-full bg-[#4A5869]" />
                <i className="block h-1.5 w-1.5 rounded-full bg-[#4A5869]" />
                <i className="block h-1.5 w-1.5 rounded-full bg-[#4A5869]" />
              </span>
            )}
            <p
              className={`hl-bubble col-start-1 row-start-1 max-w-[85%] text-pretty px-3.5 py-2.5 text-[14.5px] leading-snug ${
                fromPatient ? 'rounded-[18px] rounded-br-[6px] bg-(--hl-solid) text-white' : `rounded-[18px] rounded-bl-[6px] bg-[#F5F7FA] ${C.ink}`
              }`}
            >
              <span className="sr-only">{fromPatient ? 'Pasien: ' : 'Dokter: '}</span>
              {value}
            </p>
          </li>
        ))}
      </ul>
      {note && <p className={`mt-3.5 text-center text-[12px] ${C.muted}`}>{note}</p>}
    </div>
  );
}

export function Steps({ m }: { m: HealthLinkModel }) {
  const { steps } = m;
  const items = m.items('steps');
  const image = text(steps, 'image');
  const withPhoto = hasImage(image);
  return (
    <TemplateSection sectionKey="steps" className={`bg-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-8`}>
        <div className="min-w-0 @5xl:col-span-5">
          <SectionHead eyebrow={text(steps, 'eyebrow')} title={text(steps, 'title')} subtitle={text(steps, 'subtitle')} srTitle={text(steps, 'eyebrow') || 'Cara konsultasi'} />
          {items.length > 0 && (
            <ol className="mt-8 space-y-1 @3xl:mt-10">
              {items.map((item, i) => (
                <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i)} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < items.length - 1 && <span aria-hidden className="absolute bottom-0 left-5 top-12 w-0.5 -translate-x-1/2 rounded-full bg-(--hl-tint)" />}
                  <span aria-hidden className={`${DISPLAY} flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--hl-solid) text-[15px] font-bold tabular-nums text-white`}>
                    {pad2(i + 1)}
                  </span>
                  <span className="min-w-0 pt-1.5">
                    <h3 className={`${C.ink} ${TYPE_H.h3}`}>{field(item, 'title')}</h3>
                    {field(item, 'text') && <p className={`mt-1 ${TYPE_H.body} ${C.muted}`}>{field(item, 'text')}</p>}
                  </span>
                </Reveal>
              ))}
            </ol>
          )}
        </div>
        <div className="relative min-w-0 @5xl:col-span-6 @5xl:col-start-7">
          {withPhoto && (
            <KitPhoto
              src={image}
              alt={HEALTHLINK_PHOTOS.alt(image, 'Dokter melayani konsultasi online lewat panggilan video')}
              sizes="(min-width: 1024px) 45vw, 100vw"
              zoom
              imgClassName="object-[55%_50%] @5xl:object-[55%_18%]"
              className="aspect-[4/3] rounded-[28px] @3xl:aspect-[16/10] @5xl:ml-auto @5xl:aspect-square @5xl:w-[88%]"
            />
          )}
          {/* HP: kartu menimpa tepi bawah foto. Layar lebar: kartu di kiri ATAS (menutupi rak), layar laptop dengan pasien
              di tengah-kiri foto dan wajah dokter di kanan tetap terlihat */}
          <div className={withPhoto ? 'relative -mt-16 px-3 @3xl:mx-auto @3xl:max-w-[440px] @5xl:absolute @5xl:left-0 @5xl:top-6 @5xl:mt-0 @5xl:w-[min(360px,58%)] @5xl:max-w-none @5xl:px-0' : ''}>
            <ChatCard m={m} />
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
