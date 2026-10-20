// Formulir kontak tanpa server: menyusun pesan lalu membukanya di WhatsApp (atau email bila WhatsApp kosong).
import { CheckCircle2, Info, Send } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTemplateRuntime } from './runtime';
import { mailHref, whatsappHref } from './utils';

interface ContactFormProps {
  companyName: string;
  whatsapp: string;
  email: string;
  className?: string;
}

type Errors = Partial<Record<'name' | 'message', string>>;

const inputClass =
  'block w-full rounded-xl border bg-white px-3.5 text-[15px] text-fg placeholder:text-subtle transition-colors focus:outline-none focus:ring-2 max-sm:text-[16px] ' +
  'border-line-strong hover:border-subtle focus:border-(--tpl-accent) focus:ring-(--tpl-accent-200) ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20';

export function ContactForm({ companyName, whatsapp, email, className = '' }: ContactFormProps) {
  const { preview } = useTemplateRuntime();
  const uid = useId();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [result, setResult] = useState<{ kind: 'sent'; href: string } | { kind: 'preview' } | { kind: 'unavailable' } | null>(null);

  const channel = whatsappHref(whatsapp) ? 'whatsapp' : mailHref(email) ? 'email' : null;

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Tulis nama Anda (minimal 2 huruf).';
    if (message.trim().length < 10) next.message = 'Tulis pesan minimal 10 karakter.';
    return next;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.getElementById(`${uid}-${next.name ? 'name' : 'message'}`)?.focus();
      return;
    }
    if (preview) return setResult({ kind: 'preview' });
    if (!channel) return setResult({ kind: 'unavailable' });

    const lines = [`Halo ${companyName || 'Admin'}, saya ${name.trim()}.`];
    if (contact.trim()) lines.push(`Kontak saya: ${contact.trim()}`);
    lines.push('', message.trim());
    const body = lines.join('\n');
    const href =
      channel === 'whatsapp'
        ? whatsappHref(whatsapp, body)
        : `${mailHref(email)}?subject=${encodeURIComponent(`Pesan dari ${name.trim()}`)}&body=${encodeURIComponent(body)}`;
    if (channel === 'whatsapp') window.open(href, '_blank', 'noopener,noreferrer');
    else window.location.href = href;
    setResult({ kind: 'sent', href });
  };

  const fieldError = (key: keyof Errors) =>
    errors[key] ? (
      <p id={`${uid}-${key}-error`} className="mt-1.5 text-xs font-medium text-danger">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className={className}>
      <div className="grid gap-4 @xl:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className="mb-1.5 block text-[13px] font-medium text-fg">
            Nama
          </label>
          <input
            id={`${uid}-name`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            autoComplete="name"
            maxLength={80}
            placeholder="Nama lengkap Anda"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${uid}-name-error` : undefined}
            className={`h-11 ${inputClass}`}
          />
          {fieldError('name')}
        </div>
        <div>
          <label htmlFor={`${uid}-contact`} className="mb-1.5 block text-[13px] font-medium text-fg">
            Email / nomor HP <span className="font-normal text-subtle">(opsional)</span>
          </label>
          <input
            id={`${uid}-contact`}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={120}
            placeholder="Agar kami bisa membalas"
            className={`h-11 ${inputClass}`}
          />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor={`${uid}-message`} className="mb-1.5 block text-[13px] font-medium text-fg">
          Pesan
        </label>
        <textarea
          id={`${uid}-message`}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
          }}
          rows={4}
          maxLength={1000}
          placeholder="Ceritakan kebutuhan Anda..."
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? `${uid}-message-error` : undefined}
          className={`min-h-[120px] py-3 leading-relaxed ${inputClass}`}
        />
        {fieldError('message')}
      </div>

      <button
        type="submit"
        className="relative mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-(--tpl-accent) px-6 text-sm font-semibold text-(--tpl-on-accent) transition-colors hover:bg-(--tpl-accent-hover) @xl:w-auto"
      >
        <Send className="h-4 w-4" aria-hidden />
        {channel === 'email' ? 'Kirim lewat email' : 'Kirim lewat WhatsApp'}
      </button>

      <div aria-live="polite">
        {result?.kind === 'sent' && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-success-50 px-3.5 py-3 text-[13px] text-success-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Pesan Anda sudah disiapkan.{' '}
              <a href={result.href} target={channel === 'whatsapp' ? '_blank' : undefined} rel="noopener noreferrer" className="font-semibold underline">
                Buka lagi
              </a>{' '}
              bila jendela {channel === 'whatsapp' ? 'WhatsApp' : 'email'} tidak terbuka.
            </span>
          </p>
        )}
        {result?.kind === 'preview' && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-(--tpl-accent-50) px-3.5 py-3 text-[13px] text-(--tpl-accent-ink)">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Ini pratinjau. Di situs asli, pesan akan dibuka di WhatsApp atau email Anda.
          </p>
        )}
        {result?.kind === 'unavailable' && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-danger-50 px-3.5 py-3 text-[13px] text-danger-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Kontak WhatsApp atau email belum tersedia. Silakan hubungi kami lewat telepon atau alamat di samping.
          </p>
        )}
      </div>
    </form>
  );
}
