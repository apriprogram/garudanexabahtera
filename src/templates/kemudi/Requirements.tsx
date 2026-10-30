// Syarat sewa (kunci `requirements`), pita abu: kepala section, lalu TAB bersegmen "Lepas kunci | Dengan sopir"
// (role=tablist, panah kiri/kanan, Home/End; ibu jari biru bergeser seperti kontrol bersegmen). Panel: kiri (7 kolom)
// kartu dokumen putih 2×2 (ikon otomatis dari nama dokumen: KTP, SIM, deposit, jadwal, rute…; judul; satu kalimat),
// daftar aturan bercentang, dan baris jujur bergembok "Dokumen dicek langsung saat serah terima; website tidak
// mengunggah atau menyimpan dokumen Anda." Kanan (9-12): foto tab 4:5 radius 24 (berganti pudar 300 ms). HP: tab
// selebar layar, foto 16:10 di atas kartu. Tab tanpa dokumen & aturan → tidak ditampilkan.
import { CircleCheck, Lock } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { docIcon } from './icons';
import { requirementLists, type KemudiModel } from './model';
import { KEMUDI_PHOTOS } from './photos';
import { C, CARD, SECTION_PAD, TYPE, WRAP } from './styles';
import { AutoIcon, SectionHead } from './ui';

export function Requirements({ m }: { m: KemudiModel }) {
  const { requirements } = m;
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const tabs = (['self', 'driver'] as const)
    .map((key) => ({
      key,
      label: text(requirements, `${key}_label`) || (key === 'self' ? 'Lepas kunci' : 'Dengan sopir'),
      image: text(requirements, `${key}_image`),
      ...requirementLists(requirements, key),
    }))
    .filter((tab) => tab.docs.length + tab.rules.length > 0);
  if (tabs.length === 0) return null;
  const index = Math.min(active, tabs.length - 1);
  const tab = tabs[index];
  const note = text(requirements, 'note');
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;
  const select = (i: number) => {
    const next = (i + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };
  const photos = tabs.filter((t) => hasImage(t.image));

  return (
    <TemplateSection sectionKey="requirements" className={`${SECTION_PAD} ${C.grey}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(requirements, 'eyebrow')} index={m.index('requirements')} title={text(requirements, 'title')} subtitle={text(requirements, 'subtitle')} srTitle="Syarat sewa" tone="grey" />

        <Reveal className={`mt-10 grid gap-6 @3xl:mt-12 @3xl:gap-8 ${photos.length > 0 ? '@5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr]' : ''}`}>
          {tabs.length > 1 && (
            <div
              role="tablist"
              aria-label="Jenis layanan"
              onKeyDown={onKeyDown}
              className="km-seg relative grid w-full rounded-[14px] bg-white p-1 ring-1 ring-inset ring-[#0D1117]/[0.08] @xl:w-[360px] @xl:justify-self-start @5xl:col-span-8 @5xl:row-start-1"
              style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`, '--seg-i': index, '--seg-n': tabs.length } as CSSProperties}
            >
              <span aria-hidden className="km-seg-thumb pointer-events-none absolute bottom-1 left-1 top-1 rounded-[10px] bg-(--tpl-accent)" />
              {tabs.map((t, i) => {
                const selected = i === index;
                return (
                  <button
                    key={t.key}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    id={tabId(i)}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={panelId}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(i)}
                    className={`relative z-10 h-11 min-w-0 truncate rounded-[10px] px-4 text-[14.5px] font-semibold transition-colors duration-200 ${
                      selected ? 'text-(--tpl-on-accent)' : 'text-[#0D1117]/75 hover:text-[#0D1117]'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}

          {photos.length > 0 && (
            <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] bg-[#E6EAF0] @5xl:col-span-4 @5xl:col-start-9 @5xl:row-span-2 @5xl:row-start-1 @5xl:aspect-auto @5xl:min-h-[440px]">
              {tabs.map((t, i) =>
                hasImage(t.image) ? (
                  <div key={t.key} aria-hidden={i === index ? undefined : true} data-active={i === index ? 'true' : 'false'} className="km-tab-img absolute inset-0">
                    <KitPhoto
                      src={t.image}
                      alt={i === index ? KEMUDI_PHOTOS.alt(t.image, `Foto ${t.label}`) : ''}
                      sizes="(min-width: 1024px) 30vw, 100vw"
                      fallback="none"
                      className="absolute inset-0"
                      imgClassName={t.key === 'self' ? 'object-[50%_45%]' : 'object-[55%_50%]'}
                    />
                  </div>
                ) : null,
              )}
            </div>
          )}

          <div
            key={tab.key}
            id={panelId}
            role={tabs.length > 1 ? 'tabpanel' : undefined}
            aria-labelledby={tabs.length > 1 ? tabId(index) : undefined}
            className={`km-panel min-w-0 ${photos.length > 0 ? (tabs.length > 1 ? '@5xl:col-span-8 @5xl:row-start-2' : '@5xl:col-span-8 @5xl:row-span-2 @5xl:row-start-1') : ''}`}
          >
            {tab.docs.length > 0 && (
              <ul className="grid gap-3 @2xl:grid-cols-2 @3xl:gap-4">
                {tab.docs.map((doc, i) => (
                  <li key={`${field(doc, 'title')}-${i}`} className={`flex min-w-0 gap-4 p-5 @3xl:p-6 ${CARD}`}>
                    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-(--tpl-accent-50) text-(--km-ink)">
                      <AutoIcon k={docIcon(field(doc, 'title'))} className="h-[22px] w-[22px]" />
                    </span>
                    <div className="min-w-0">
                      <h3 className={`${TYPE.h3sm} ${C.ink}`}>{field(doc, 'title')}</h3>
                      {field(doc, 'text') && <p className={`mt-1 text-[14.5px] leading-snug ${C.muted}`}>{field(doc, 'text')}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {tab.rules.length > 0 && (
              <ul className={`${tab.docs.length > 0 ? 'mt-6' : ''} grid gap-x-8 gap-y-3 @3xl:grid-cols-2`}>
                {tab.rules.map((rule, i) => (
                  <li key={`${rule}-${i}`} className={`flex items-start gap-2.5 text-[15px] leading-snug ${C.ink}`}>
                    <CircleCheck aria-hidden className="mt-px h-[18px] w-[18px] shrink-0 text-(--km-ink)" strokeWidth={2} />
                    {/* Teks dalam span sendiri agar text-pretty berlaku (tanpa kata yatim "jam." / "kota.") */}
                    <span className="min-w-0 text-pretty">{rule}</span>
                  </li>
                ))}
              </ul>
            )}
            {note && (
              <p className={`mt-6 flex items-start gap-2.5 border-t border-[#0D1117]/10 pt-5 text-[14px] leading-snug ${C.muted}`}>
                <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                {note}
              </p>
            )}
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}
