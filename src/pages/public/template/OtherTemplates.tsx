// "Template lainnya" di bawah detail template (maks. 3, kategori yang sama didahulukan). Satu template lain = kartu
// lebar (gambar kiri, "Lihat Detail" & "Lihat Demo" kanan); baris yang belum penuh diisi ubin "Pesan Custom" agar tidak
// ada kolom kosong. Kartu datar (`card-flat lift`, tanpa bayangan). Gagal dimuat → disembunyikan.
import { ArrowRight, Eye, PencilRuler } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../../../components/ui/LogoMark';
import { apiGet } from '../../../lib/api';
import { formatRupiah, type Template } from '../../../types/platform';
import { demoLink, normalizeTemplate } from './useTemplateBySlug';

type State = { status: 'loading' } | { status: 'ready'; templates: Template[] } | { status: 'hidden' };

/** Tujuan "Pesan Custom" dari halaman template: layanan website langsung terpilih di form. */
const CUSTOM_ORDER_PATH = '/pesan-custom?layanan=website';

const detailPath = (template: Template) => `/template/${encodeURIComponent(template.slug)}`;

function Thumb({ template, className = '' }: { template: Template; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`overflow-hidden bg-alt ${className}`}>
      {template.preview_image && !broken ? (
        <img
          src={template.preview_image}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      ) : (
        <div className="flex h-full min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
          <LogoMark className="h-8 text-brand-300" />
        </div>
      )}
    </div>
  );
}

function Card({ template }: { template: Template }) {
  return (
    <article className="card-flat lift group relative flex h-full flex-col overflow-hidden">
      <Thumb template={template} className="aspect-[16/10] border-b border-line" />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {template.category && <p className="text-xs font-medium text-subtle">{template.category}</p>}
        <h3 className="mt-1 text-base font-semibold tracking-[-0.01em] text-fg">
          <Link to={detailPath(template)} className="outline-none after:absolute after:inset-0 after:rounded-[24px] focus-visible:after:ring-2 focus-visible:after:ring-primary">
            {template.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="text-base font-semibold tabular-nums text-fg">{formatRupiah(template.price)}</p>
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary">
            Lihat Detail
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Kartu lebar untuk satu-satunya template lain: gambar kiri, nama/harga/aksi kanan (HP: bertumpuk). */
function WideCard({ template }: { template: Template }) {
  const demo = demoLink(template);
  return (
    <article className="card-flat lift group grid h-full overflow-hidden sm:grid-cols-[1.2fr_1fr]">
      <Link to={detailPath(template)} tabIndex={-1} aria-hidden className="block">
        <Thumb template={template} className="aspect-[16/10] h-full border-b border-line sm:aspect-auto sm:min-h-[240px] sm:border-b-0 sm:border-r" />
      </Link>
      <div className="flex min-w-0 flex-col justify-center p-5 sm:p-7">
        {template.category && <p className="text-xs font-medium text-subtle">{template.category}</p>}
        <h3 className="mt-1 text-lg font-semibold tracking-[-0.01em] text-fg sm:text-2xl">{template.name}</h3>
        {template.short_description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{template.short_description}</p>}
        <p className="mt-4 text-base font-semibold tabular-nums text-fg sm:text-lg">{formatRupiah(template.price)}</p>
        <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
          <Link to={detailPath(template)} className="btn btn-primary" aria-label={`Lihat Detail ${template.name}`}>
            Lihat Detail
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {demo.external ? (
            <a href={demo.href} target="_blank" rel="noopener noreferrer" className="btn btn-outline" aria-label={`Lihat Demo ${template.name} (tab baru)`}>
              <Eye className="h-4 w-4" aria-hidden />
              Lihat Demo
            </a>
          ) : (
            <Link to={demo.href} className="btn btn-outline" aria-label={`Lihat Demo ${template.name}`}>
              <Eye className="h-4 w-4" aria-hidden />
              Lihat Demo
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/** Ubin pengisi baris: ajakan pesan website custom. */
function CustomTile() {
  return (
    <article className="card-flat flex h-full flex-col justify-between gap-5 p-5 sm:p-7">
      <div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-primary">
          <PencilRuler className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="mt-4 text-base font-semibold tracking-[-0.01em] text-fg sm:text-lg">Butuh desain custom?</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Ceritakan kebutuhan bisnis Anda. Kami rancang website sesuai kebutuhan Anda, biayanya kami sampaikan lewat penawaran.
        </p>
      </div>
      <Link to={CUSTOM_ORDER_PATH} className="btn btn-outline-primary self-start">
        Pesan Custom
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </article>
  );
}

export function OtherTemplates({ currentSlug, category }: { currentSlug: string; category: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    apiGet<{ templates?: unknown }>('get_templates')
      .then((data) => {
        if (!alive) return;
        const all = Array.isArray(data?.templates) ? data.templates : [];
        const others = all
          .filter((t): t is Template & Record<string, unknown> => !!t && typeof t === 'object' && typeof (t as Template).slug === 'string')
          .map(normalizeTemplate)
          .filter((t) => t.slug && t.slug !== currentSlug)
          .sort((a, b) => Number(b.category === category) - Number(a.category === category))
          .slice(0, 3);
        setState(others.length > 0 ? { status: 'ready', templates: others } : { status: 'hidden' });
      })
      .catch(() => alive && setState({ status: 'hidden' }));
    return () => {
      alive = false;
    };
  }, [currentSlug, category]);

  if (state.status === 'hidden') return null;

  return (
    <section className="bg-alt py-14 sm:py-20" aria-labelledby="template-lainnya">
      <div className="container-site">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex items-end justify-between gap-4">
            <h2 id="template-lainnya" className="text-xl font-semibold tracking-[-0.02em] text-fg sm:text-3xl">
              Template lainnya
            </h2>
            <Link to="/#templates" className="link-site inline-flex min-h-10 items-center gap-1 text-sm">
              Lihat Semua Template
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {state.status === 'loading' ? (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6" aria-hidden>
              {[0, 1, 2].map((i) => (
                <li key={i} className={`overflow-hidden rounded-[24px] bg-surface ring-1 ring-inset ring-line ${i > 0 ? 'max-sm:hidden' : ''} ${i > 1 ? 'max-lg:hidden' : ''}`}>
                  <div className="aspect-[16/10] animate-pulse bg-line/60" />
                  <div className="space-y-3 p-5">
                    <div className="h-3 w-1/3 animate-pulse rounded-full bg-alt" />
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-line" />
                    <div className="h-4 w-1/4 animate-pulse rounded-full bg-line" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {state.templates.length === 1 ? (
                <li className="sm:col-span-2">
                  <WideCard template={state.templates[0]} />
                </li>
              ) : (
                state.templates.map((template) => (
                  <li key={template.slug}>
                    <Card template={template} />
                  </li>
                ))
              )}
              {state.templates.length < 3 && (
                <li className="sm:col-span-2 lg:col-span-1">
                  <CustomTile />
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
