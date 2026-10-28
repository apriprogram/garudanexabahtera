// Asuransi & BPJS (kunci `insurance`), latar kertas. Kepala section, lalu TAB bersegmen (kotak putih radius 12, tab
// aktif biru penuh; role="tablist", panah kiri/kanan, Home/End): "Pasien BPJS" (langkah bernomor + catatan aturan BPJS
// Kesehatan), "Asuransi & perusahaan" (keterangan + chip nama penjamin; di demo fiktif), "Pasien umum" (langkah).
// Langkah = kartu putih bernomor besar (HP: nomor di kiri judul). Di bawah: tautan "Tanya bagian admisi lewat WhatsApp". HP: tab bertumpuk
// selebar layar, langkah bertumpuk.
import { Info, ShieldCheck } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import type { ListItem, SectionContent } from '../types';
import { insuranceTabs, insurerItems, stepItems, type MedicareModel } from './model';
import { C, CARD, SECTION_PAD, T } from './styles';
import { SectionHead, TextLink } from './ui';

function Steps({ steps }: { steps: ListItem[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className={`grid gap-4 ${steps.length >= 3 ? '@3xl:grid-cols-3' : steps.length === 2 ? '@3xl:grid-cols-2' : ''}`}>
      {steps.map((step, i) => (
        <Reveal as="li" key={`${field(step, 'title')}-${i}`} delay={stagger(i, 80)} className={`grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 p-5 @3xl:flex @3xl:flex-col @3xl:p-7 ${CARD}`}>
          <span aria-hidden className="mc-t-num row-span-2 font-[family-name:var(--tpl-font-display)] font-bold tabular-nums text-(--tpl-accent-ink)">
            {i + 1}
          </span>
          <h3 className={`self-center @3xl:mt-4 @3xl:self-start ${T.h3} ${C.ink}`}>{field(step, 'title')}</h3>
          {field(step, 'text') && <p className={`col-start-2 mt-1 @3xl:mt-2 ${T.body} ${C.muted}`}>{field(step, 'text')}</p>}
        </Reveal>
      ))}
    </ol>
  );
}

function Note({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p className={`mt-6 flex items-start gap-2.5 ${T.small} ${C.muted}`}>
      <Info aria-hidden className="mt-[0.2em] h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

function Panel({ tab, section }: { tab: 'bpjs' | 'insurers' | 'general'; section: SectionContent }) {
  if (tab === 'bpjs') {
    return (
      <>
        <Steps steps={stepItems(section, 'bpjs_steps')} />
        <Note>{text(section, 'bpjs_note')}</Note>
      </>
    );
  }
  if (tab === 'general') return <Steps steps={stepItems(section, 'general_steps')} />;
  const insurers = insurerItems(section);
  return (
    <>
      {text(section, 'insurers_intro') && <p className={`max-w-[60ch] ${T.body} ${C.ink}`}>{text(section, 'insurers_intro')}</p>}
      {insurers.length > 0 && (
        <ul aria-label="Daftar penjamin" className={`grid gap-3 @xl:grid-cols-2 @5xl:grid-cols-4 ${text(section, 'insurers_intro') ? 'mt-6' : ''}`}>
          {insurers.map((item, i) => (
            <li key={`${field(item, 'name')}-${i}`} className={`flex min-h-16 min-w-0 items-center gap-3 px-4 py-3 ${CARD}`}>
              <ShieldCheck aria-hidden className="h-6 w-6 shrink-0 text-(--tpl-accent-ink)" strokeWidth={1.75} />
              <span className={`min-w-0 font-semibold ${T.body} ${C.ink}`}>{field(item, 'name')}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function Insurance({ m }: { m: MedicareModel }) {
  const { insurance } = m;
  const tabs = insuranceTabs(insurance);
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.min(active, tabs.length - 1);
  const current = tabs[index];
  const linkAction = m.linkOr(
    text(insurance, 'link_url'),
    m.waWith(`Halo ${m.companyName}, saya ingin bertanya tentang pembayaran BPJS/asuransi.`),
  );

  const select = (i: number) => {
    const next = (i + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    select(keys[e.key]);
  };
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;

  return (
    <TemplateSection sectionKey="insurance" className={`${SECTION_PAD} ${C.paper}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(insurance, 'eyebrow')} title={text(insurance, 'title')} subtitle={text(insurance, 'subtitle')} srTitle="Asuransi & BPJS" />

        {current && (
          <Reveal className="mt-10 @3xl:mt-12">
            {tabs.length > 1 && (
              <div
                role="tablist"
                aria-label="Jenis pasien"
                onKeyDown={onKeyDown}
                className="grid gap-1.5 rounded-[12px] bg-white p-1.5 ring-1 ring-inset ring-[#0E1B2E]/[0.1] @2xl:inline-grid @2xl:auto-cols-fr @2xl:grid-flow-col"
              >
                {tabs.map((tab, i) => {
                  const selected = i === index;
                  return (
                    <button
                      key={tab.key}
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
                      className={`min-h-12 rounded-[8px] px-5 font-bold transition-colors duration-200 ${T.body} ${
                        selected ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : `${C.ink} hover:bg-[#F3F7FC]`
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div
              key={current.key}
              id={panelId}
              role={tabs.length > 1 ? 'tabpanel' : undefined}
              aria-labelledby={tabs.length > 1 ? tabId(index) : undefined}
              className="mc-panel mt-8"
            >
              <Panel tab={current.key} section={insurance} />
            </div>
          </Reveal>
        )}

        <TextLink action={linkAction} label={text(insurance, 'link_label')} className="mt-8" />
      </div>
    </TemplateSection>
  );
}
