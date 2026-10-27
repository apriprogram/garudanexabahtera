// Layanan & tautan cepat (kunci `services`, anchor #layanan): deret ubin putih bergaris rambut tepat di bawah hero,
// seperti portal SMA negeri (E-Learning, Perpustakaan Digital, PPID, Legalisir, Tracer Study, Pengaduan). Ubin =
// ikon otomatis + nama + keterangan; tautan keluar diberi panah serong. Disorot: latar tint, ikon warna tema. Ubin
// tanpa tautan = tombol (aria-expanded) yang membuka catatan dari CMS di bawah deret (mis. "tautan sedang disiapkan"),
// jadi tidak ada tautan palsu. H2 hanya untuk pembaca layar. Garis antar-ubin dibuat dengan border kanan/bawah yang
// dipotong di tepi luar (tanpa sel abu-abu kosong berapa pun jumlah ubinnya).
import { ArrowUpRight, X } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { JumantaraModel } from './model';
import { C, DISPLAY, LINE } from './styles';
import { TitleIcon } from './ui';

/** Kolom layar lebar per jumlah ubin (kelas utuh agar terbaca Tailwind): 7–8 ubin → dua baris empat. */
const DESK_COLS = ['', '@5xl:grid-cols-1', '@5xl:grid-cols-2', '@5xl:grid-cols-3', '@5xl:grid-cols-4', '@5xl:grid-cols-5', '@5xl:grid-cols-6', '@5xl:grid-cols-4', '@5xl:grid-cols-4'];

const TILE =
  'group flex h-full min-h-[112px] w-full flex-col p-4 text-left transition-colors duration-200 hover:bg-(--jm-tint) @3xl:min-h-[132px] @3xl:p-6';

export function Services({ m }: { m: JumantaraModel }) {
  const { services } = m;
  const items = m.items('services');
  const note = text(services, 'pending_note');
  const [open, setOpen] = useState<number | null>(null);
  const noteId = useId();
  const buttons = useRef<Record<number, HTMLButtonElement | null>>({});
  if (items.length === 0) return null;
  const n = items.length;

  const body = (label: string, sub: string, i: number, external: boolean): ReactNode => (
    <>
      <span className="flex items-start justify-between gap-3">
        <TitleIcon title={label} index={i} className="h-6 w-6 text-(--jm-ink) transition-colors duration-200 group-hover:text-(--tpl-accent)" />
        {external && <ArrowUpRight aria-hidden className={`h-4 w-4 shrink-0 ${C.muted}`} />}
      </span>
      <span className={`mt-5 block ${DISPLAY} text-[15.5px] font-semibold leading-snug tracking-[-0.01em] ${C.ink} @3xl:text-[16px]`}>{label}</span>
      {sub && <span className={`mt-1 block text-[13px] leading-snug ${C.muted} @3xl:text-[13.5px]`}>{sub}</span>}
    </>
  );

  const close = () => {
    const i = open;
    setOpen(null);
    if (i !== null) buttons.current[i]?.focus();
  };

  return (
    <TemplateSection sectionKey="services" className={`border-b bg-white ${LINE}`}>
      <h2 className="sr-only">{text(services, 'title') || 'Layanan sekolah'}</h2>
      <div className={CONTAINER}>
        <Reveal variant="fade" className={`overflow-hidden @5xl:border-x ${LINE}`}>
          <ul className={`-mb-px -mr-px grid grid-cols-2 @3xl:grid-cols-3 ${DESK_COLS[n]}`}>
            {items.map((item, i) => {
              const label = field(item, 'label');
              const sub = field(item, 'text');
              const action = m.linkOr(field(item, 'url'), null);
              return (
                <li key={`${label}-${i}`} className={`flex min-w-0 border-b border-r ${LINE}`}>
                  {action ? (
                    <ActionLink action={action} className={TILE}>
                      {body(label, sub, i, action.kind === 'external')}
                    </ActionLink>
                  ) : note ? (
                    <button
                      ref={(el) => {
                        buttons.current[i] = el;
                      }}
                      type="button"
                      aria-expanded={open === i}
                      aria-controls={noteId}
                      onClick={() => setOpen(open === i ? null : i)}
                      className={`${TILE} ${open === i ? 'bg-(--jm-tint)' : ''}`}
                    >
                      {body(label, sub, i, false)}
                    </button>
                  ) : (
                    <div className={TILE}>{body(label, sub, i, false)}</div>
                  )}
                </li>
              );
            })}
          </ul>
          {note && (
            // Buka-tutup biasa (aria-expanded/aria-controls di ubin), bukan wilayah live: catatan yang baru dimunculkan
            // tidak diumumkan andal oleh role="status"
            <div id={noteId} hidden={open === null} className={`border-t bg-(--jm-tint) ${LINE}`}>
              <div className="flex items-start justify-between gap-4 px-4 py-4 @3xl:px-6">
                <p className={`max-w-[80ch] text-[14px] leading-relaxed ${C.muted}`}>
                  {open !== null && <strong className={`font-semibold ${C.ink}`}>{field(items[open], 'label')}: </strong>}
                  {note}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className={`-my-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-(--jm-ink) hover:underline`}
                >
                  <X aria-hidden className="h-4 w-4" />
                  Tutup
                </button>
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
