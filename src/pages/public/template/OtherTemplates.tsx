// "Template lainnya" di bawah detail template (maks. 3, kategori yang sama didahulukan). Gagal dimuat → disembunyikan.
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../../../components/ui/LogoMark';
import { apiGet } from '../../../lib/api';
import { formatRupiah, type Template } from '../../../types/platform';
import { normalizeTemplate } from './useTemplateBySlug';

type State = { status: 'loading' } | { status: 'ready'; templates: Template[] } | { status: 'hidden' };

function Card({ template }: { template: Template }) {
  const [broken, setBroken] = useState(false);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[24px] bg-surface shadow-soft ring-1 ring-inset ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-float hover:ring-brand-200">
      <div className="aspect-[16/10] overflow-hidden border-b border-line bg-alt">
        {template.preview_image && !broken ? (
          <img
            src={template.preview_image}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
            <LogoMark className="h-8 text-brand-300" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {template.category && <p className="text-xs font-medium text-subtle">{template.category}</p>}
        <h3 className="mt-1 text-base font-semibold tracking-[-0.01em] text-fg">
          <Link
            to={`/template/${encodeURIComponent(template.slug)}`}
            className="outline-none after:absolute after:inset-0 after:rounded-[24px] focus-visible:after:ring-2 focus-visible:after:ring-primary"
          >
            {template.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="text-base font-semibold tabular-nums text-fg">{formatRupiah(template.price)}</p>
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary">
            Lihat detail
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
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
              Lihat semua
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
              {state.templates.map((template) => (
                <li key={template.slug}>
                  <Card template={template} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
