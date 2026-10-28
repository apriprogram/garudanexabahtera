// Daftar merchant & kontak (kunci `contact`): section lavender. Layar lebar: kiri label, H2, deskripsi, baris kontak
// (WhatsApp, email, telepon, alamat + "Lihat peta", jam layanan) dengan ikon dalam lingkaran putih, lalu foto 3:2
// radius 20 (opsional, tampil ≥ @3xl); kanan kartu putih FORMULIR PENDAFTARAN MERCHANT: nama, nama usaha, jenis usaha
// (pilihan dari CMS), kota, transaksi per bulan, layanan yang diminati, catatan. JUJUR: formulir hanya MENYUSUN pesan —
// tidak ada fetch, localStorage, atau <form action>; data tidak disimpan di website. Setelah lolos validasi pesan
// ditampilkan apa adanya dengan tombol "Buka WhatsApp" (tanpa WhatsApp: email; tanpa keduanya: salin pesan).
import { Check, ChevronDown, CircleAlert, Clock, Copy, Lock, Mail, MapPin, PencilLine, Phone } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, mailHref, mapsInfo, telHref, text, whatsappHref, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import {
  EMPTY_MERCHANT,
  MERCHANT_LIMITS,
  MERCHANT_REQUIRED,
  SERVICES,
  VOLUMES,
  displayPhone,
  merchantCategories,
  merchantMailHref,
  merchantMessage,
  validateMerchant,
  type MerchantErrors,
  type MerchantForm,
  type PaynowModel,
} from './model';
import { PAYNOW_PHOTOS } from './photos';
import { BTN, C, CARD, DISPLAY, GRID_GAP, INPUT, SECTION_PAD, TEXT_LINK } from './styles';
import { SectionHead } from './ui';

type Key = keyof MerchantForm;

function Field({ id, label, error, optional = false, className = '', children }: { id: string; label: string; error?: string; optional?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-semibold ${C.ink}`}>
        {label}
        {optional && <span className={`font-normal ${C.muted}`}> (opsional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-[#B42318]">
          <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function MerchantFormCard({ m }: { m: PaynowModel }) {
  const { contact } = m;
  const baseId = useId();
  const categories = merchantCategories(contact);
  const [form, setForm] = useState<MerchantForm>(EMPTY_MERCHANT);
  const [errors, setErrors] = useState<MerchantErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refs = useRef<Partial<Record<Key, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const title = text(contact, 'form_title');
  // Kalimat jujur selalu tampil: isian CMS, atau kalimat bawaan bila dikosongkan
  const note = text(contact, 'form_text') || 'Formulir ini hanya menyusun pesan untuk tim kami; data tidak disimpan di website.';
  const hasWhatsapp = !!whatsappHref(m.whatsapp);
  const button = hasWhatsapp ? text(contact, 'form_button') || 'Susun pesan WhatsApp' : 'Susun pesan';
  const id = (key: Key) => `${baseId}-${key}`;
  const set = (key: Key) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const bind = (key: Key) => ({
    id: id(key),
    ref: (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
      refs.current[key] = el;
    },
    value: form[key],
    maxLength: MERCHANT_LIMITS[key],
    ...(errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {}),
  });
  const ring = (key: Key) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateMerchant(form, categories);
    setErrors(found);
    const first = MERCHANT_REQUIRED.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setCopied(false);
    setSent(merchantMessage(form, text(m.brand, 'company_name')));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const panel = `${CARD} p-5 @3xl:p-8`;
  const privacy = (
    <p className={`mt-4 flex items-start gap-2 text-[13px] leading-snug ${C.muted}`}>
      <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {note}
    </p>
  );

  if (sent) {
    const wa = hasWhatsapp ? m.waWith(sent) : null;
    const mail = !wa ? merchantMailHref(text(contact, 'email'), sent) : '';
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(sent);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    return (
      <div className={panel} aria-live="polite">
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2.5 text-[19px] font-semibold ${C.ink} ${DISPLAY} focus:outline-none`}>
          <span aria-hidden className="pn-grad flex h-8 w-8 items-center justify-center rounded-full text-white">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 text-[14px] leading-snug ${C.muted}`}>Periksa isinya, lalu kirim ke tim kami. Pesan belum terkirim sebelum Anda menekan kirim.</p>
        <pre className={`mt-5 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-[16px] bg-(--pn-mist) p-4 font-mono text-[13px] leading-relaxed ${C.ink} [overflow-wrap:anywhere]`}>{sent}</pre>
        <div className="mt-6 flex flex-col items-stretch gap-1 @xl:flex-row @xl:items-center @xl:gap-6">
          {wa ? (
            <ActionLink action={wa} className={`${BTN.primary} ${BTN.lg}`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              Buka WhatsApp
            </ActionLink>
          ) : mail ? (
            <ActionLink action={{ kind: 'external', href: mail }} className={`${BTN.primary} ${BTN.lg}`}>
              Kirim lewat email
            </ActionLink>
          ) : (
            <button type="button" onClick={copy} className={`${BTN.primary} ${BTN.lg}`}>
              {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
              {copied ? 'Tersalin' : 'Salin pesan'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              window.setTimeout(() => refs.current.name?.focus(), 0);
            }}
            className={`${TEXT_LINK} self-center`}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Ubah data
          </button>
        </div>
        {privacy}
      </div>
    );
  }

  const select = (key: 'category' | 'volume' | 'service', options: readonly string[], placeholder?: string) => (
    <div className="relative">
      <select {...bind(key)} onChange={(e) => set(key)(e.target.value)} className={`${INPUT} appearance-none pr-10 ${ring(key)}`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
    </div>
  );
  const input = (key: Key, extra: { placeholder?: string; autoComplete?: string } = {}) => (
    <input type="text" {...bind(key)} {...extra} onChange={(e) => set(key)(e.target.value)} className={`${INPUT} ${ring(key)}`} />
  );
  const pairs = 'grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-1 @6xl:grid-cols-2';

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={title ? `${baseId}-title` : undefined} aria-label={title ? undefined : 'Formulir pendaftaran merchant'} className={panel}>
      {title && (
        <h3 id={`${baseId}-title`} className={`text-[19px] font-semibold tracking-[-0.01em] ${C.ink} ${DISPLAY} @3xl:text-[21px]`}>
          {title}
        </h3>
      )}
      <div className={`grid gap-4 ${title ? 'mt-6' : ''}`}>
        <div className={pairs}>
          <Field id={id('name')} label="Nama" error={errors.name}>
            {input('name', { autoComplete: 'name' })}
          </Field>
          <Field id={id('business')} label="Nama usaha" error={errors.business}>
            {input('business', { autoComplete: 'organization', placeholder: 'mis. Kedai Kopi Senja' })}
          </Field>
        </div>
        <div className={pairs}>
          <Field id={id('category')} label="Jenis usaha" error={errors.category}>
            {select('category', categories, 'Pilih jenis usaha')}
          </Field>
          <Field id={id('city')} label="Kota" error={errors.city}>
            {input('city', { autoComplete: 'address-level2', placeholder: 'mis. Bandung' })}
          </Field>
        </div>
        <div className={pairs}>
          <Field id={id('volume')} label="Transaksi per bulan" optional>
            {select('volume', VOLUMES)}
          </Field>
          <Field id={id('service')} label="Layanan yang diminati" optional>
            {select('service', SERVICES)}
          </Field>
        </div>
        <Field id={id('note')} label="Catatan" optional>
          <textarea {...bind('note')} rows={3} onChange={(e) => set('note')(e.target.value)} className={`${INPUT} h-auto min-h-24 py-3`} />
        </Field>
      </div>
      <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-7 w-full`}>
        {hasWhatsapp && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
        {button}
      </button>
      {privacy}
    </form>
  );
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3.5 py-3">
      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-(--pn-ink) ring-1 ring-inset ring-[#0E0F2C]/[0.08]">
        {icon}
      </span>
      <span className="min-w-0 pt-0.5">
        <span className={`block text-[13px] font-medium ${C.muted}`}>{label}</span>
        <span className={`block text-[15.5px] font-semibold leading-snug ${C.ink} [overflow-wrap:anywhere]`}>{children}</span>
      </span>
    </li>
  );
}

// inline-block + py-3/-my-3: area sentuh ≈ 44px tanpa menambah tinggi baris
const linkClass = 'inline-block -my-3 py-3 underline decoration-transparent decoration-2 underline-offset-4 transition-colors hover:decoration-(--tpl-accent)';

export function Contact({ m }: { m: PaynowModel }) {
  const { contact } = m;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const address = text(contact, 'address');
  const hours = text(contact, 'hours');
  const image = text(contact, 'image');
  const tel = telHref(phone);
  const mail = mailHref(email);
  const map = mapsInfo(text(contact, 'maps_url'), address);
  const wa: LinkAction | null = m.waAction;

  return (
    <TemplateSection sectionKey="contact" className={`${SECTION_PAD} ${C.mist}`}>
      {/* Kepala section di baris sendiri; di bawahnya kontak + foto (kiri) dan formulir (kanan) mulai sejajar,
          jadi kedua kolom kira-kira sama tinggi */}
      <div className={`${CONTAINER} grid gap-y-10 @5xl:grid-cols-12 @5xl:gap-y-12 ${GRID_GAP}`}>
        <div className="min-w-0 @5xl:col-span-7">
          <SectionHead eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title')} subtitle={text(contact, 'subtitle')} srTitle={text(contact, 'eyebrow') || 'Kontak'} />
        </div>
        <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-2">
          <Reveal delay={200} as="ul" className={`-mt-3 divide-y ${C.line} divide-[#0E0F2C]/[0.08]`}>
            {wa && (
              <Row icon={<WhatsAppIcon className="h-5 w-5" />} label="WhatsApp">
                <ActionLink action={wa} className={linkClass}>
                  {displayPhone(m.whatsapp)}
                </ActionLink>
              </Row>
            )}
            {mail && (
              <Row icon={<Mail className="h-5 w-5" strokeWidth={1.9} />} label="Email">
                <ActionLink action={{ kind: 'external', href: mail }} className={linkClass}>
                  {email}
                </ActionLink>
              </Row>
            )}
            {tel && (
              <Row icon={<Phone className="h-5 w-5" strokeWidth={1.9} />} label="Telepon">
                <ActionLink action={{ kind: 'external', href: tel }} className={linkClass}>
                  {displayPhone(phone)}
                </ActionLink>
              </Row>
            )}
            {address && (
              <Row icon={<MapPin className="h-5 w-5" strokeWidth={1.9} />} label="Alamat">
                <span className="block text-balance font-medium">{address}</span>
                {map.link && (
                  <span className="block">
                    <ActionLink action={{ kind: 'external', href: map.link }} className={`${TEXT_LINK} text-[14px]`}>
                      Lihat peta
                    </ActionLink>
                  </span>
                )}
              </Row>
            )}
            {hours && (
              <Row icon={<Clock className="h-5 w-5" strokeWidth={1.9} />} label="Jam layanan">
                <span className="font-medium">{hours}</span>
              </Row>
            )}
          </Reveal>
          {hasImage(image) && (
            <KitPhoto
              src={image}
              alt={PAYNOW_PHOTOS.alt(image, `Merchant ${m.companyName}`)}
              fallback="none"
              sizes="(min-width: 1024px) 34vw, 100vw"
              position="50% 32%"
              className="mt-8 hidden aspect-[3/2] rounded-[20px] @3xl:block @5xl:aspect-[16/9]"
            />
          )}
        </div>
        <Reveal variant="fade" className="min-w-0 @5xl:col-span-6 @5xl:col-start-7 @5xl:row-start-2 @5xl:self-start">
          <MerchantFormCard m={m} />
        </Reveal>
      </div>
    </TemplateSection>
  );
}
