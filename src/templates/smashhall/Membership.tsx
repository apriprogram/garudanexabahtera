// Member bulanan (kunci `membership`) di latar putih: kepala section dengan pilihan periode di kanan (Bulanan / 3 bulan,
// tombol aria-pressed + catatan hemat), lalu tiga kartu paket radius 20: ikon kok, nama, harga Sora besar + satuan,
// jumlah sesi, daftar keuntungan bercentang, tombol "Gabung" yang menyusun pesan WhatsApp. Paket berlabel sorotan =
// kartu tinta gelap (data-tpl-tone="inverse") dengan label warna tema. Harga memudar saat periode diganti. HP: kartu
// bertumpuk, pilihan periode selebar layar. JUJUR: tanpa akun member atau pembayaran online.
import { CalendarDays, Check, Info } from 'lucide-react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { useState } from 'react';
import { ShuttleIcon } from './marks';
import { featuredIndex, joinMessage, planPrice, splitLines, type SmashModel } from './model';
import { C, DISPLAY, SECTION_PAD, TYPE_S } from './styles';
import { ButtonLink, SectionHead } from './ui';

function PeriodToggle({ labels, quarterly, onChange, note }: { labels: [string, string]; quarterly: boolean; onChange: (q: boolean) => void; note: string }) {
  return (
    <div className="flex w-full flex-col gap-2 @xl:w-auto @xl:items-end">
      <div role="group" aria-label="Periode paket" className={`grid grid-cols-2 gap-1 rounded-xl p-1 ${C.sand}`}>
        {labels.map((label, i) => {
          const pressed = quarterly === (i === 1);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(i === 1)}
              className={`h-11 min-w-28 rounded-lg px-4 text-[14.5px] font-semibold transition-colors duration-200 ${
                pressed ? 'bg-white text-[#171512] ring-1 ring-inset ring-[#171512]/10' : 'text-[#5A564F] hover:text-[#171512]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {note && <p className="text-[13px] font-medium text-(--tpl-accent-ink)">{note}</p>}
    </div>
  );
}

export function Membership({ m }: { m: SmashModel }) {
  const { membership } = m;
  const plans = m.items('membership');
  const [quarterly, setQuarterly] = useState(false);
  const featured = featuredIndex(plans);
  const monthly = text(membership, 'monthly_label');
  const quarterLabel = text(membership, 'quarterly_label');
  const hasToggle = !!(monthly && quarterLabel);
  const isQuarterly = hasToggle && quarterly;
  const period = isQuarterly ? quarterLabel : monthly;
  const unit = text(membership, 'unit');
  const note = text(membership, 'note');
  const buttonLabel = text(membership, 'button_label');
  const cols = plans.length >= 3 ? '@4xl:grid-cols-3' : plans.length === 2 ? '@3xl:grid-cols-2' : '';

  return (
    <TemplateSection sectionKey="membership" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={text(membership, 'eyebrow')}
          title={text(membership, 'title')}
          subtitle={text(membership, 'subtitle')}
          srTitle="Paket member"
          aside={
            hasToggle ? (
              <PeriodToggle labels={[monthly, quarterLabel]} quarterly={isQuarterly} onChange={setQuarterly} note={text(membership, 'quarterly_note')} />
            ) : undefined
          }
        />

        <ul className={`mt-10 grid gap-4 @3xl:mt-14 @5xl:gap-6 ${cols}`}>
          {plans.map((plan, i) => {
            const dark = i === featured;
            const price = planPrice(plan, isQuarterly);
            const perks = splitLines(field(plan, 'perks')).slice(0, 6);
            const action = m.waWith(joinMessage(m.companyName, field(plan, 'name'), period, price, unit)) ?? m.contactAction;
            return (
              <Reveal
                as="li"
                key={`${field(plan, 'name')}-${i}`}
                delay={stagger(i)}
                data-tpl-tone={dark ? 'inverse' : undefined}
                data-featured={dark ? 'true' : undefined}
                className={`flex min-w-0 flex-col rounded-[20px] p-6 @3xl:p-7 ${dark ? 'bg-[#171512] text-white' : `border border-[#171512]/10 bg-white ${C.ink}`}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span aria-hidden className={`flex h-10 w-10 items-center justify-center rounded-full ${dark ? 'bg-white/10 text-(--sh-bright)' : 'bg-(--tpl-accent-50) text-(--tpl-accent-ink)'}`}>
                    <ShuttleIcon className="h-5 w-5 rotate-[-30deg]" />
                  </span>
                  {field(plan, 'badge') && (
                    <span className="inline-flex min-h-7 items-center rounded-full bg-(--tpl-accent) px-3 text-[12.5px] font-semibold text-(--tpl-on-accent)">
                      {field(plan, 'badge')}
                    </span>
                  )}
                </div>
                <h3 className={`mt-6 ${TYPE_S.h3}`}>{field(plan, 'name')}</h3>
                {price && (
                  <p key={`${price}-${isQuarterly}`} className="sh-swap mt-4 flex flex-wrap items-baseline gap-x-1.5">
                    <span className={TYPE_S.price}>{price}</span>
                    {unit && <span className={`text-[14px] ${dark ? 'text-white/70' : C.muted}`}>{unit}</span>}
                  </p>
                )}
                {field(plan, 'sessions') && (
                  <p className={`mt-3 flex items-center gap-2 text-[14.5px] ${dark ? 'text-white/85' : C.ink}`}>
                    <CalendarDays aria-hidden className={`h-4 w-4 shrink-0 ${dark ? 'text-(--sh-bright)' : 'text-(--tpl-accent-ink)'}`} />
                    {field(plan, 'sessions')}
                  </p>
                )}
                {perks.length > 0 && (
                  <ul className={`mt-6 grid gap-2.5 border-t pt-6 text-[14.5px] ${dark ? 'border-white/15 text-white/85' : `border-[#171512]/10 ${C.muted}`}`}>
                    {perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5">
                        <Check aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-(--sh-bright)' : 'text-(--tpl-accent-ink)'}`} strokeWidth={2.4} />
                        {perk}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto pt-8">
                  <ButtonLink
                    action={action}
                    label={buttonLabel}
                    variant={dark ? 'primary' : 'ghost'}
                    aria-label={`${buttonLabel} paket ${field(plan, 'name')}`}
                    className="w-full"
                  />
                </div>
              </Reveal>
            );
          })}
        </ul>

        {note && (
          <p className={`mt-6 flex items-start gap-2 ${TYPE_S.small} ${C.muted}`}>
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {note}
          </p>
        )}
        <p className={`sr-only ${DISPLAY}`} aria-live="polite">
          {hasToggle ? `Harga ditampilkan untuk periode ${period}.` : ''}
        </p>
      </div>
    </TemplateSection>
  );
}
