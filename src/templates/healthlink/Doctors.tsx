// Dokter online (kunci `doctors`): kolom cari (kata kunci yang sama dengan kolom cari di hero; state di ./HealthLink),
// saringan spesialis berupa kapsul (tombol aria-pressed, digeser mendatar di HP), jumlah hasil yang diumumkan pembaca
// layar, lalu kartu dokter: INISIAL di kotak tint (bukan foto), nama & gelar, spesialis, titik status + teks, harga, dan
// tombol "Chat" (tautan aplikasi/portal atau WhatsApp dengan nama dokter). 1 → 2 → 3 kolom. Tanpa hasil → kartu kosong
// dengan tombol "Tampilkan semua". Gerak: titik status hijau berdenyut 3× saat daftar pertama kali terlihat; kartu
// memudar singkat saat saringan berubah.
import { MessageCircle, Search, X } from 'lucide-react';
import { useId, useRef } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, initials, text } from '../shared/utils';
import { usePlayOnce } from './hooks';
import { filterDoctors, isOnline, specialtiesOf, type HealthLinkModel } from './model';
import { BTN, C, CARD, CHIP, DISPLAY, INPUT, SECTION_PAD, TYPE_H } from './styles';
import { SectionHead, StatusDot } from './ui';

export interface DoctorFilter {
  query: string;
  specialty: string;
  setQuery: (value: string) => void;
  setSpecialty: (value: string) => void;
}

const FILTER_CHIP =
  'inline-flex h-11 shrink-0 items-center rounded-full px-4 text-[14px] font-semibold ring-1 ring-inset transition-colors duration-200';

export function Doctors({ m, filter }: { m: HealthLinkModel; filter: DoctorFilter }) {
  const { doctors } = m;
  const all = m.items('doctors');
  const specialties = specialtiesOf(all);
  const results = filterDoctors(all, filter.query, filter.specialty);
  const inputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const play = usePlayOnce(listRef);
  const buttonLabel = text(doctors, 'button_label') || 'Chat';
  const note = text(doctors, 'note');
  const filtered = !!(filter.query.trim() || filter.specialty);
  const reset = () => {
    filter.setQuery('');
    filter.setSpecialty('');
  };

  return (
    <TemplateSection sectionKey="doctors" className={`${C.canvas} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead
          center
          eyebrow={text(doctors, 'eyebrow')}
          title={text(doctors, 'title')}
          subtitle={text(doctors, 'subtitle')}
          srTitle={text(doctors, 'eyebrow') || 'Dokter online'}
        />

        <div className="mx-auto mt-8 max-w-[1200px] @3xl:mt-10">
          {/* Cari + saringan */}
          <div>
            <div className="relative @5xl:mx-auto @5xl:max-w-[720px]">
              <label htmlFor={inputId} className="sr-only">
                Cari dokter, spesialis, atau keluhan
              </label>
              <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4A5869]" />
              <input
                id={inputId}
                type="search"
                value={filter.query}
                onChange={(e) => filter.setQuery(e.target.value)}
                placeholder={text(m.hero, 'search_placeholder') || 'Cari dokter atau keluhan'}
                maxLength={60}
                autoComplete="off"
                enterKeyHint="search"
                className={`${INPUT} h-14 pl-12 pr-14`}
              />
              {filter.query && (
                <button
                  type="button"
                  onClick={() => filter.setQuery('')}
                  aria-label="Hapus kata kunci"
                  className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-[#4A5869] transition-colors hover:bg-[#F5F7FA] hover:text-[#0E1B2B]"
                >
                  <X aria-hidden className="h-5 w-5" />
                </button>
              )}
            </div>
            {specialties.length > 1 && (
              // Digeser mendatar di HP (tanpa menggulir halaman); padding negatif = kapsul boleh sampai tepi layar
              <div role="group" aria-label="Saring menurut spesialis" className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto scroll-px-5 px-5 pb-1 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @5xl:mx-0 @5xl:flex-wrap @5xl:justify-center @5xl:overflow-visible @5xl:px-0">
                {['', ...specialties].map((label) => {
                  const pressed = filter.specialty === label;
                  return (
                    <button
                      key={label || 'semua'}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => filter.setSpecialty(label)}
                      className={`${FILTER_CHIP} ${
                        pressed ? 'bg-(--hl-solid) text-white ring-(--hl-solid)' : 'bg-white text-[#0E1B2B] ring-[#0E1B2B]/[0.12] hover:ring-(--hl-solid)'
                      }`}
                    >
                      {label || 'Semua'}
                    </button>
                  );
                })}
              </div>
            )}
            <p className={`mt-4 text-[13.5px] ${C.muted} @5xl:text-center`} aria-live="polite" aria-atomic="true" data-hl-count="">
              {`${results.length} dokter${filtered ? ' cocok' : ''}`}
            </p>
          </div>

          <div ref={listRef} data-play={play} className="hl-doctors mt-4">
            {results.length > 0 ? (
              <ul key={`${filter.query}|${filter.specialty}`} className="hl-swap grid gap-3 @3xl:grid-cols-2 @3xl:gap-4 @5xl:grid-cols-3">
                {results.map((item, i) => {
                  const name = field(item, 'name');
                  const status = field(item, 'status');
                  const online = isOnline(status);
                  return (
                    <Reveal as="li" key={`${name}-${i}`} delay={stagger(i, 60)} className="min-w-0">
                      <article className={`flex h-full flex-col p-4 @3xl:p-5 ${CARD}`}>
                        <div className="flex flex-1 items-start gap-3.5">
                          <span
                            aria-hidden
                            className={`${DISPLAY} flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-(--hl-tint) text-[18px] font-bold text-(--hl-tint-ink)`}
                          >
                            {initials(name.replace(/^dr\.?\s+/i, '').replace(/,.*$/, ''), 'DR')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className={`${C.ink} ${TYPE_H.h3} text-[16.5px]! @3xl:text-[17.5px]!`}>{name}</h3>
                            {field(item, 'specialty') && <p className={`mt-0.5 text-[14px] ${C.muted}`}>{field(item, 'specialty')}</p>}
                            {status && (
                              <p className={`${CHIP} mt-2 h-6 bg-[#F5F7FA] px-2.5 text-[12px] ${online ? 'text-[#0B7A3B]' : 'text-[#4A5869]'}`}>
                                <StatusDot online={online} />
                                {status}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#0E1B2B]/[0.07] pt-4">
                          <p className={`min-w-0 text-[15px] font-semibold tabular-nums ${C.ink}`}>{field(item, 'price')}</p>
                          <ActionLink
                            action={m.doctorAction(item)}
                            aria-label={`${buttonLabel}: ${name}`}
                            className={`${BTN.solid} ${BTN.sm} shrink-0`}
                          >
                            <MessageCircle aria-hidden className="h-[18px] w-[18px]" />
                            {buttonLabel}
                          </ActionLink>
                        </div>
                      </article>
                    </Reveal>
                  );
                })}
              </ul>
            ) : (
              <div className={`mx-auto flex max-w-[520px] flex-col items-center px-6 py-10 text-center ${CARD}`}>
                <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-(--hl-tint) text-(--hl-tint-ink)">
                  <Search className="h-7 w-7" strokeWidth={1.75} />
                </span>
                <p className={`mt-4 ${TYPE_H.body} ${C.muted}`}>{text(doctors, 'empty_text') || 'Belum ada dokter yang cocok.'}</p>
                <button type="button" onClick={reset} className={`${BTN.tint} ${BTN.md} mt-5`}>
                  Tampilkan semua
                </button>
              </div>
            )}
          </div>
          {note && <p className={`mx-auto mt-6 max-w-[640px] text-center text-[13px] leading-snug ${C.muted}`}>{note}</p>}
        </div>
      </div>
    </TemplateSection>
  );
}
