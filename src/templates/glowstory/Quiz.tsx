// Kuis jenis kulit (kunci `quiz`) — demo di halaman, tanpa server: panel pasir membulat; kiri label, judul (kata
// miring), deskripsi, catatan "bukan diagnosis", dan foto tegak (layar lebar); kanan kartu gading berisi alur kuis:
// pembuka → 2–4 pertanyaan (pilihan A–D, progres, tombol kembali) → hasil: tipe kulit, penjelasan, rutinitas pagi ☀ &
// malam ☾ bernomor dengan harga, tips, tombol "Masukkan rutinitas ke keranjang", tanya WhatsApp, dan ulangi kuis.
// Jawaban ke-n setiap pertanyaan = poin untuk tipe ke-n (model.ts quizResult). Fokus pindah ke judul langkah baru.
import { ArrowLeft, ArrowRight, Moon, RotateCcw, ShoppingBag, Sun } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { Sprig } from './marks';
import { formatRupiah, parseRupiah, quizQuestions, quizResult, quizTypes, type GlowModel, type RoutineStep, type SkinType } from './model';
import { GLOWSTORY_PHOTOS } from './photos';
import { useStore } from './storeContext';
import { BTN, C, MONO, SERIF, TYPE_G } from './styles';
import { Eyebrow, Highlighted } from './ui';

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Tombol "Masukkan rutinitas ke keranjang · Rp…": BOLEH membungkus baris (BTN.lg memaksa satu baris + truncate, sehingga
 * di kartu kuis HP ± 270px harganya terpotong). Harga sendiri tidak pernah terpecah. Satu baris lagi mulai @xl.
 */
const ROUTINE_BUTTON =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-(--tpl-accent) px-6 py-3 text-center text-[15px] font-medium leading-snug text-(--tpl-on-accent) transition-colors hover:bg-(--gs-accent-hover) @xl:whitespace-nowrap @3xl:min-h-[52px]';

function Routine({ title, icon: Icon, steps }: { title: string; icon: typeof Sun; steps: RoutineStep[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="min-w-0">
      <p className={`flex items-center gap-2 ${MONO} text-[#2B211C]`}>
        <Icon className="h-4 w-4 text-(--gs-accent-text)" aria-hidden />
        {title}
      </p>
      <ol className="mt-3 space-y-2.5">
        {steps.map((s, i) => (
          <li key={`${s.product}-${i}`} className="flex items-start gap-3 rounded-[16px] bg-[#F6F1EA] p-3">
            <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2B211C] ${MONO} text-[10.5px] tracking-normal text-[#F6F1EA]`}>
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              {s.step && <span className={`block text-[12px] ${C.muted}`}>{s.step}</span>}
              <span className="block text-[14.5px] font-medium leading-snug text-[#2B211C]">{s.product}</span>
            </span>
            {s.price && <span className="shrink-0 pt-0.5 text-[13px] font-medium text-(--gs-accent-text)">{s.price}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Produk unik (nama sama sekali) dari rutinitas pagi + malam yang harganya bisa dibaca. */
const routineItems = (type: SkinType) => {
  const seen = new Set<string>();
  return [...type.morning, ...type.night].filter((s) => {
    const key = s.product.toLowerCase();
    if (seen.has(key) || parseRupiah(s.price) === null) return false;
    seen.add(key);
    return true;
  });
};

function Result({ m, type, onRestart, headingRef }: { m: GlowModel; type: SkinType; onRestart: () => void; headingRef: RefObject<HTMLHeadingElement | null> }) {
  const store = useStore();
  const items = routineItems(type);
  const total = items.reduce((sum, s) => sum + (parseRupiah(s.price) ?? 0), 0);
  const lines = (steps: RoutineStep[]) => steps.map((s, i) => `${i + 1}. ${s.step ? `${s.step}: ` : ''}${s.product}`).join('\n');
  const ask = m.waWith(
    [`Halo ${m.companyName}, hasil kuis kulit saya: ${type.name}.`, type.morning.length ? `Pagi:\n${lines(type.morning)}` : '', type.night.length ? `Malam:\n${lines(type.night)}` : '', 'Boleh dibantu pesan rutinitas ini?']
      .filter(Boolean)
      .join('\n\n'),
  );
  const isWa = ask?.kind === 'external' && /wa\.me/.test(ask.href);

  return (
    <div>
      <p className={`${MONO} text-(--gs-accent-text)`}>Hasil kuis</p>
      <h3 ref={headingRef} tabIndex={-1} className={`mt-2 ${SERIF} text-[34px] leading-[1.02] text-[#2B211C] outline-none @3xl:text-[42px]`}>
        Kulitmu cenderung <em className="gs-italic text-(--gs-accent-text)">{type.name.replace(/^kulit\s+/i, '').toLowerCase()}</em>
      </h3>
      {type.summary && <p className={`mt-3 max-w-[56ch] ${TYPE_G.body} ${C.muted}`}>{type.summary}</p>}
      <div className="mt-6 grid gap-6 @3xl:grid-cols-2 @3xl:gap-5">
        <Routine title="Rutinitas pagi" icon={Sun} steps={type.morning} />
        <Routine title="Rutinitas malam" icon={Moon} steps={type.night} />
      </div>
      {type.tip && (
        <p className="mt-5 rounded-[16px] bg-(--gs-accent-soft) px-4 py-3 text-[14px] leading-relaxed text-[#2B211C]">
          <span className="font-semibold">Tips: </span>
          {type.tip}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap @xl:items-center">
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => store.addMany(items.map((s) => ({ name: s.product, price: s.price })), 'rutinitas')}
            className={ROUTINE_BUTTON}
          >
            <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              Masukkan rutinitas ke keranjang <span className="whitespace-nowrap">· {formatRupiah(total)}</span>
            </span>
          </button>
        )}
        {ask && (
          <ActionLink action={ask} className={`${BTN.ghost} ${BTN.lg}`}>
            {isWa && <WhatsAppIcon className="h-4 w-4 shrink-0" />}
            Tanya lewat WhatsApp
          </ActionLink>
        )}
      </div>
      <button type="button" onClick={onRestart} className={`mt-5 inline-flex min-h-11 items-center gap-2 text-[14px] font-medium ${C.muted} transition-colors hover:text-[#2B211C]`}>
        <RotateCcw className="h-4 w-4" aria-hidden />
        Ulangi kuis
      </button>
    </div>
  );
}

export function Quiz({ m }: { m: GlowModel }) {
  const { quiz } = m;
  const types = quizTypes(quiz);
  // Hanya jawaban yang tipe kulitnya tampil (model.ts quizQuestions)
  const questions = quizQuestions(quiz, types);
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<number[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    // Fokus pindah ke judul langkah baru hanya setelah pengunjung menekan tombol (bukan saat halaman dimuat)
    if (moved.current) heading.current?.focus({ preventScroll: true });
  }, [step]);

  if (!m.quizOn) return null;
  const eyebrow = text(quiz, 'eyebrow');
  const title = text(quiz, 'title');
  const subtitle = text(quiz, 'subtitle');
  const note = text(quiz, 'note');
  const image = text(quiz, 'image');
  const startLabel = text(quiz, 'start_label') || 'Mulai kuis';
  const total = questions.length;
  const done = step >= total;
  const current = step >= 0 && !done ? questions[step] : null;
  const go = (next: number) => {
    moved.current = true;
    setStep(next);
  };
  const choose = (type: number) => {
    const next = [...answers.slice(0, step), type];
    setAnswers(next);
    go(step + 1);
  };
  const resultIndex = done ? quizResult(answers, types.length) : -1;

  return (
    <TemplateSection sectionKey="quiz" className="py-4 @3xl:py-8">
      <div className={CONTAINER}>
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[#EDE5D9] px-5 py-10 @3xl:rounded-[40px] @3xl:px-10 @3xl:py-14 @6xl:px-14 @6xl:py-16">
          <Sprig className="pointer-events-none absolute -right-4 -top-6 -z-10 h-[260px] w-auto text-[#2B211C]/10" />
          <div className="grid gap-10 @5xl:grid-cols-12 @5xl:gap-12">
            {hasImage(image) && (
              // Foto mengisi tinggi kolom kanan (judul + kartu kuis), apa pun langkah kuisnya; HP: disembunyikan
              <Reveal variant="scale" className="relative hidden min-h-[480px] @5xl:col-span-5 @5xl:block">
                <KitPhoto
                  src={image}
                  alt={GLOWSTORY_PHOTOS.alt(image, title || 'Kuis jenis kulit')}
                  fallback="none"
                  zoom
                  sizes="(min-width: 1024px) 36vw, 0px"
                  position="50% 30%"
                  className="absolute inset-0 rounded-[24px]"
                />
                <span className={`absolute bottom-4 left-4 rounded-full bg-[#FCFAF6]/90 px-3 py-1.5 ${MONO} text-[10.5px] text-[#2B211C]`}>
                  {total} pertanyaan · ± 1 menit
                </span>
              </Reveal>
            )}

            <div className={`min-w-0 ${hasImage(image) ? '@5xl:col-span-7' : '@5xl:col-span-10 @5xl:col-start-2'}`}>
              {eyebrow && (
                <Reveal>
                  <Eyebrow>{eyebrow}</Eyebrow>
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-4' : ''} max-w-[20ch] text-balance ${C.ink} ${TYPE_G.h2}`}>
                  <Highlighted title={title} highlight={text(quiz, 'highlight')} />
                </Reveal>
              )}
              {subtitle && (
                <Reveal as="p" delay={160} className={`mt-4 max-w-[52ch] ${TYPE_G.lead} ${C.muted}`}>
                  {subtitle}
                </Reveal>
              )}

              <Reveal delay={200} className={title || subtitle ? 'mt-8' : ''}>
                <div className="rounded-[24px] bg-[#FCFAF6] p-5 @3xl:p-8">
                  {step < 0 && (
                    <div>
                      <p className={`${MONO} ${C.muted}`}>
                        {total} pertanyaan · hasil {types.length} tipe kulit
                      </p>
                      <h3 ref={heading} tabIndex={-1} className={`mt-3 ${SERIF} text-[30px] leading-[1.05] text-[#2B211C] outline-none @3xl:text-[36px]`}>
                        Rutinitas pagi & malam, disusun dari jawabanmu.
                      </h3>
                      <ul className="mt-6 grid gap-2 @xl:grid-cols-2">
                        {types.map((t, i) => (
                          <li key={`${t.name}-${i}`} className={`flex items-center gap-3 rounded-[14px] bg-[#F6F1EA] px-3.5 py-3 text-[14px] font-medium text-[#2B211C]`}>
                            <span aria-hidden className={`flex h-7 w-7 items-center justify-center rounded-full bg-(--gs-accent-soft) ${MONO} text-[10.5px] tracking-normal text-(--gs-accent-text)`}>
                              {LETTERS[i]}
                            </span>
                            {t.name}
                          </li>
                        ))}
                      </ul>
                      <button type="button" onClick={() => go(0)} className={`${BTN.accent} ${BTN.lg} mt-7`}>
                        {startLabel}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  )}

                  {current && (
                    <fieldset>
                      <legend className="sr-only">
                        Pertanyaan {step + 1} dari {total}
                      </legend>
                      <div className="flex items-center justify-between gap-4">
                        <p aria-hidden className={`${MONO} ${C.muted}`}>
                          Pertanyaan {step + 1} dari {total}
                        </p>
                        <button type="button" onClick={() => go(step - 1)} className={`inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium ${C.muted} transition-colors hover:text-[#2B211C]`}>
                          <ArrowLeft className="h-4 w-4" aria-hidden />
                          Kembali
                        </button>
                      </div>
                      <div aria-hidden className="mt-2 h-1 overflow-hidden rounded-full bg-[#EDE5D9]">
                        <div className="h-full rounded-full bg-(--tpl-accent) transition-[width] duration-500" style={{ width: `${((step + 1) / total) * 100}%` }} />
                      </div>
                      <h3 ref={heading} tabIndex={-1} className={`mt-6 ${SERIF} text-[28px] leading-[1.08] text-[#2B211C] outline-none @3xl:text-[34px]`}>
                        {current.question}
                      </h3>
                      <div className="mt-6 grid gap-2.5 @3xl:grid-cols-2">
                        {current.answers.map((a, ai) => {
                          const picked = answers[step] === a.type;
                          return (
                            <button
                              key={a.type}
                              type="button"
                              aria-pressed={picked}
                              onClick={() => choose(a.type)}
                              className={`flex min-h-14 items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[15px] font-medium leading-snug transition-colors ${
                                picked ? 'bg-[#2B211C] text-[#F6F1EA]' : 'bg-[#F6F1EA] text-[#2B211C] hover:bg-[#EDE5D9]'
                              }`}
                            >
                              <span
                                aria-hidden
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${MONO} text-[11px] tracking-normal ${
                                  picked ? 'bg-[#F6F1EA] text-[#2B211C]' : 'bg-[#FCFAF6] text-(--gs-accent-text) ring-1 ring-inset ring-[#2B211C]/10'
                                }`}
                              >
                                {LETTERS[ai]}
                              </span>
                              {a.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}

                  {done && resultIndex >= 0 && (
                    <Result
                      m={m}
                      type={types[resultIndex]}
                      headingRef={heading}
                      onRestart={() => {
                        setAnswers([]);
                        go(0);
                      }}
                    />
                  )}
                </div>
                {note && <p className={`mt-4 px-1 text-[13px] leading-relaxed ${C.muted}`}>{note}</p>}
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
