// Dealer & kontak (`contact`): putih tulang. Kepala terbelah, lalu kiri kartu kantor pusat hampir hitam (alamat, telepon,
// email, jam layanan, tombol WhatsApp & Google Maps) + daftar studio bergaris tipis; kanan peta Google Maps membulat
// (dimuat lazy). HP: bertumpuk. Label baris & teks tombol dari CMS (label_*, whatsapp_label, maps_label).
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, mailHref, telHref, text } from '../shared/utils';
import { veloraContent } from './defaultContent';
import { contactOffices, type VeloraModel } from './model';
import { C, DISPLAY, SECTION_PAD } from './styles';
import { ArrowPill, SectionHead } from './ui';

function Line({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3.5 border-t border-white/10 py-4 first:border-t-0 first:pt-0">
      <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-inset ring-white/15">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-white/60">{label}</span>
        <span className="mt-0.5 block text-[15px] leading-relaxed text-white [overflow-wrap:anywhere]">{children}</span>
      </span>
    </li>
  );
}

export function Contact({ m }: { m: VeloraModel }) {
  const s = m.contact;
  const address = text(s, 'address');
  const phone = text(s, 'phone');
  const email = text(s, 'email');
  const hours = text(s, 'hours');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const offices = contactOffices(s);
  const hasHq = !!(address || phone || email || hours || m.waAction);
  // Label baris dari CMS; dikosongkan → label demo agar baris tetap punya nama
  const label = (key: string) => text(s, key) || String(veloraContent.contact[key] ?? '');

  return (
    <TemplateSection sectionKey="contact" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} />
        <div className="mt-10 grid gap-4 @3xl:mt-14 @5xl:grid-cols-12">
          <div className="grid min-w-0 content-start gap-4 @5xl:col-span-5">
            {hasHq && (
              <Reveal data-tpl-tone="inverse" className="rounded-[24px] bg-[#0D0E10] p-6 text-white @3xl:p-8">
                <ul>
                  {address && (
                    <Line icon={<MapPin className="h-4 w-4" />} label={label('label_address')}>
                      {address}
                    </Line>
                  )}
                  {phone && (
                    <Line icon={<Phone className="h-4 w-4" />} label={label('label_phone')}>
                      {tel ? (
                        <ActionLink action={{ kind: 'external', href: tel }} className="underline decoration-white/30 underline-offset-4 hover:decoration-white">
                          {phone}
                        </ActionLink>
                      ) : (
                        phone
                      )}
                    </Line>
                  )}
                  {email && (
                    <Line icon={<Mail className="h-4 w-4" />} label={label('label_email')}>
                      {mail ? (
                        <ActionLink action={{ kind: 'external', href: mail }} className="underline decoration-white/30 underline-offset-4 hover:decoration-white">
                          {email}
                        </ActionLink>
                      ) : (
                        email
                      )}
                    </Line>
                  )}
                  {hours && (
                    <Line icon={<Clock className="h-4 w-4" />} label={label('label_hours')}>
                      {hours}
                    </Line>
                  )}
                </ul>
                {(m.waAction || m.map.link) && (
                  <div className="mt-6 flex flex-col gap-2.5 @xl:flex-row @xl:flex-wrap">
                    <ArrowPill action={m.waAction} label={m.whatsappLabel} variant="white" icon={<WhatsAppIcon className="h-[18px] w-[18px] shrink-0" />} />
                    <ArrowPill action={m.map.link ? { kind: 'external', href: m.map.link } : null} label={label('maps_label')} variant="ghost" />
                  </div>
                )}
              </Reveal>
            )}
            {offices.length > 0 && (
              <ul className="rounded-[24px] bg-[#E8E8E5] px-6 py-2 @3xl:px-8">
                {offices.map((item, i) => {
                  const officeTel = telHref(field(item, 'phone'));
                  return (
                    <Reveal
                      as="li"
                      key={`${field(item, 'city')}-${i}`}
                      delay={stagger(i, 60)}
                      className="flex flex-col gap-1 border-t border-[#0D0E10]/[0.1] py-4 first:border-t-0 @xl:flex-row @xl:items-baseline @xl:justify-between @xl:gap-4"
                    >
                      <span className="min-w-0">
                        <span className={`${DISPLAY} block text-[18px] font-medium tracking-[-0.015em] ${C.ink}`}>{field(item, 'city')}</span>
                        {field(item, 'address') && <span className={`block text-[14px] ${C.muted}`}>{field(item, 'address')}</span>}
                      </span>
                      {field(item, 'phone') &&
                        (officeTel ? (
                          <ActionLink action={{ kind: 'external', href: officeTel }} className={`inline-flex min-h-9 shrink-0 items-center self-start text-[14px] font-medium tabular-nums ${C.ink} underline decoration-[#0D0E10]/25 underline-offset-4 hover:decoration-[#0D0E10]`}>
                            {field(item, 'phone')}
                          </ActionLink>
                        ) : (
                          <span className={`text-[14px] tabular-nums ${C.ink}`}>{field(item, 'phone')}</span>
                        ))}
                    </Reveal>
                  );
                })}
              </ul>
            )}
          </div>
          <Reveal variant="fade" className="min-w-0 @5xl:col-span-7">
            <MapEmbed embed={m.map.embed} title={`Map: ${address || m.companyName}`} className="h-[340px] rounded-[24px] ring-1 ring-inset ring-[#0D0E10]/[0.08] @5xl:h-full @5xl:min-h-[520px]" />
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
