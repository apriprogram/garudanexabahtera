// Developer & API (kunci `developers`): section putih. Layar lebar: kiri label, H2, deskripsi, daftar endpoint (lencana
// metode mono + path mono + keterangan), langkah sandbox bernomor, dan tautan dokumentasi; kanan JENDELA KODE malam
// indigo: tiga titik, tab bahasa (pola tab WAI-ARIA, garis bawah glow yang BERGESER ke tab aktif — ./paynow.css),
// tombol "Salin" (navigator.clipboard, status diumumkan), kode mono dengan nomor baris dan pewarnaan sederhana
// (string, angka, komentar) yang menggulir di dalam kotaknya sendiri, lalu catatan "contoh". HP: kepala, jendela kode,
// endpoint, langkah. JUJUR: contoh kode ilustrasi; alamat API demo memakai domain .example yang tidak aktif.
import { Check, Copy, Info } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, safeUrl, text } from '../shared/utils';
import type { ListItem } from '../types';
import { codeLines, codeSamples, endpoints, methodTone, pad2, tokenizeLine, type PaynowModel } from './model';
import { C, DISPLAY, GRID_GAP, SECTION_PAD } from './styles';
import { SectionHead, TextLink } from './ui';

const TOKEN_CLASS = { plain: '', string: 'text-[#9BE7C4]', number: 'text-[#FFC48C]', comment: 'text-white/55' } as const;
const METHOD_CLASS = {
  post: 'bg-(--tpl-accent-100) text-(--pn-ink)',
  get: 'bg-[#DDF3E8] text-[#0B6B43]',
  other: 'bg-[#EEEEF3] text-[#0E0F2C]',
} as const;

function CodeWindow({ samples, note }: { samples: ListItem[]; note: string }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [ink, setInk] = useState<{ x: number; w: number } | null>(null);
  const baseId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.min(active, samples.length - 1);
  const code = field(samples[index], 'code');
  const lines = codeLines(code);
  // Tinggi panel = contoh terpanjang (12,5px × 1,75 per baris + padding), jadi halaman tidak meloncat saat tab berganti
  const maxLines = Math.max(...samples.map((item) => codeLines(field(item, 'code')).length));

  // Garis bawah tab aktif: posisi & lebar diukur dari tombol tab (ulang saat ukuran berubah, mis. huruf termuat)
  useLayoutEffect(() => {
    const measure = () => {
      const el = tabs.current[index];
      if (el && el.offsetWidth > 0) setInk({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    const el = tabs.current[index]?.parentElement;
    if (!el || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, samples.length]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const select = (i: number) => {
    const next = (i + samples.length) % samples.length;
    setActive(next);
    setCopied(false);
    tabs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: samples.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    select(map[e.key]);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div data-pn-code="" data-tpl-tone="inverse" className="overflow-hidden rounded-[22px] bg-(--pn-night) text-white ring-1 ring-inset ring-white/10">
      <div className="flex items-center gap-3 border-b border-white/10 pl-4 pr-2 @3xl:pl-5">
        <span aria-hidden className="hidden shrink-0 gap-1.5 @xl:flex">
          <i className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <i className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <i className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </span>
        <div role="tablist" aria-label="Bahasa contoh kode" onKeyDown={onKeyDown} className="pn-scroll-x relative flex min-w-0 flex-1 overflow-x-auto @xl:ml-3">
          {samples.map((item, i) => {
            const selected = i === index;
            return (
              <button
                key={`${field(item, 'label')}-${i}`}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${i}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  setActive(i);
                  setCopied(false);
                }}
                className={`h-12 shrink-0 px-3 font-mono text-[13px] font-medium transition-colors duration-200 ${selected ? 'text-white' : 'text-white/60 hover:text-white'}`}
              >
                {field(item, 'label')}
              </button>
            );
          })}
          {ink && (
            <span
              aria-hidden
              data-pn-ink=""
              style={{ '--pn-x': `${ink.x}px`, '--pn-w': `${ink.w}px` } as CSSProperties}
              className="pn-tab-ink pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-(--pn-glow)"
            />
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold text-white/85 ring-1 ring-inset ring-white/15 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check aria-hidden className="h-4 w-4 text-(--pn-glow)" /> : <Copy aria-hidden className="h-4 w-4" />}
          <span>{copied ? 'Tersalin' : 'Salin'}</span>
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? 'Kode disalin ke papan klip.' : ''}
        </span>
      </div>
      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${index}`} className="flex" style={{ minHeight: `${Math.round(maxLines * 21.875 + 40)}px` }}>
        <div aria-hidden className="shrink-0 select-none py-5 pl-4 pr-3 text-right font-mono text-[12.5px] leading-[1.75] text-white/35 @3xl:pl-5">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Menggulir mendatar di dalam kotaknya sendiri (halaman tidak ikut melebar); fokus agar bisa digulir papan ketik */}
        <pre tabIndex={0} aria-label="Contoh kode" className="pn-swap min-w-0 flex-1 overflow-x-auto py-5 pr-5 font-mono text-[12.5px] leading-[1.75] text-white/90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--pn-glow)" key={index}>
          <code>
            {lines.map((line, i) => (
              <span key={i} className="block min-h-[1.75em] whitespace-pre">
                {tokenizeLine(line).map((token, j) => (token.kind === 'plain' ? token.text : <span key={j} className={TOKEN_CLASS[token.kind]}>{token.text}</span>))}
              </span>
            ))}
          </code>
        </pre>
      </div>
      {note && (
        <p className="flex items-start gap-2 border-t border-white/10 px-4 py-3.5 text-[13px] leading-snug text-white/70 @3xl:px-5">
          <Info aria-hidden className="mt-px h-4 w-4 shrink-0" />
          {note}
        </p>
      )}
    </div>
  );
}

export function Developers({ m }: { m: PaynowModel }) {
  const { developers } = m;
  const samples = codeSamples(developers);
  const apis = endpoints(developers);
  const steps = list(developers, 'steps', 4).filter((i) => !!field(i, 'title'));
  const stepsTitle = text(developers, 'steps_title');
  const link = safeUrl(text(developers, 'link_url'));
  const note = text(developers, 'note');

  return (
    <TemplateSection sectionKey="developers" className={`${SECTION_PAD} bg-white`}>
      <div className={`${CONTAINER} grid gap-y-12 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] @5xl:gap-y-10 ${GRID_GAP}`}>
        <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-1">
          <SectionHead eyebrow={text(developers, 'eyebrow')} title={text(developers, 'title')} subtitle={text(developers, 'subtitle')} srTitle={text(developers, 'eyebrow') || 'Developer'} />
        </div>

        {/* Kanan (layar lebar): jendela kode lalu daftar endpoint dua kolom; HP: tepat di bawah kepala section */}
        {(samples.length > 0 || apis.length > 0) && (
          <div className="min-w-0 @5xl:col-span-7 @5xl:col-start-6 @5xl:row-span-2 @5xl:row-start-1 @5xl:self-start @6xl:col-span-6 @6xl:col-start-7">
            {samples.length > 0 && (
              <Reveal variant="fade">
                <CodeWindow samples={samples} note={note} />
              </Reveal>
            )}
            {apis.length > 0 && (
              <ul aria-label="Contoh endpoint API" className={`grid gap-x-8 @2xl:grid-cols-2 ${samples.length > 0 ? 'mt-8' : ''}`}>
                {apis.map((item, i) => {
                  const method = field(item, 'method').toUpperCase();
                  return (
                    <Reveal as="li" key={`${field(item, 'path')}-${i}`} delay={stagger(i, 60)} className={`grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5 border-t py-3.5 ${C.line}`}>
                      <span className={`row-span-2 inline-flex h-6 min-w-[3.5rem] items-center justify-center self-start rounded-md px-2 font-mono text-[11.5px] font-semibold ${METHOD_CLASS[methodTone(method)]}`}>
                        {method || 'API'}
                      </span>
                      <code className={`min-w-0 font-mono text-[14px] font-medium [overflow-wrap:anywhere] ${C.ink}`}>{field(item, 'path')}</code>
                      {field(item, 'text') && <span className={`text-[14px] leading-snug ${C.muted}`}>{field(item, 'text')}</span>}
                    </Reveal>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {(steps.length > 0 || link) && (
          <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-2">
            {steps.length > 0 && (
              <div className={`rounded-[24px] p-6 @3xl:p-7 ${C.mist}`}>
                {stepsTitle && <h3 className={`text-[17px] font-semibold ${C.ink} ${DISPLAY}`}>{stepsTitle}</h3>}
                <ol className={`grid gap-5 ${stepsTitle ? 'mt-5' : ''}`}>
                  {steps.map((item, i) => (
                    <Reveal as="li" key={`${field(item, 'title')}-${i}`} delay={stagger(i)} className="flex min-w-0 items-start gap-3.5">
                      <span aria-hidden className={`pn-grad flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${DISPLAY}`}>
                        {pad2(i + 1)}
                      </span>
                      <span className="min-w-0 pt-0.5">
                        <span className={`block text-[15px] font-semibold ${C.ink}`}>{field(item, 'title')}</span>
                        {field(item, 'text') && <span className={`mt-0.5 block text-pretty text-[14px] leading-snug ${C.muted}`}>{field(item, 'text')}</span>}
                      </span>
                    </Reveal>
                  ))}
                </ol>
              </div>
            )}
            <TextLink action={link ? { kind: 'external', href: link } : null} label={text(developers, 'link_label')} className="mt-5" />
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
