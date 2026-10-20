// Ambil satu template publik lewat `get_template {slug}` + normalisasi field (features/gallery selalu array).
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet } from '../../../lib/api';
import type { Template } from '../../../types/platform';

export type TemplateLoadState =
  | { status: 'loading' }
  | { status: 'ready'; template: Template }
  | { status: 'notfound' }
  | { status: 'error'; message: string };

const toStringArray = (value: unknown): string[] => {
  let list = value;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  return Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((s) => s.trim()) : [];
};

/** Rapikan objek template dari API agar komponen tidak pernah crash karena field kosong/salah tipe. */
export function normalizeTemplate(raw: Partial<Template> & Record<string, unknown>): Template {
  return {
    id: Number(raw.id) || 0,
    slug: String(raw.slug ?? ''),
    name: String(raw.name ?? 'Template'),
    category: String(raw.category ?? ''),
    short_description: typeof raw.short_description === 'string' ? raw.short_description : null,
    description: typeof raw.description === 'string' ? raw.description : null,
    features: toStringArray(raw.features),
    price: Number(raw.price) || 0,
    preview_image: typeof raw.preview_image === 'string' && raw.preview_image.trim() ? raw.preview_image.trim() : null,
    gallery: toStringArray(raw.gallery),
    template_code: String(raw.template_code ?? ''),
    demo_url: typeof raw.demo_url === 'string' && raw.demo_url.trim() ? raw.demo_url.trim() : null,
    status: raw.status === 'draft' ? 'draft' : 'published',
    sort_order: Number(raw.sort_order) || 0,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
  };
}

/** URL demo: demo_url eksternal (http/https) bila diisi admin, selain itu /demo/:slug. */
export function demoLink(template: Pick<Template, 'slug' | 'demo_url'>): { href: string; external: boolean } {
  const external = /^https?:\/\//i.test(template.demo_url || '');
  return external ? { href: template.demo_url as string, external } : { href: `/demo/${encodeURIComponent(template.slug)}`, external };
}

export function useTemplateBySlug(slug: string | undefined) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ request: string; state: TemplateLoadState } | null>(null);
  const key = (slug || '').trim();
  const request = `${key}#${attempt}`;

  useEffect(() => {
    if (!key) return;
    let alive = true;
    apiGet<{ template?: Template }>('get_template', { slug: key })
      .then((data) => {
        if (!alive) return;
        const raw = data?.template;
        setResult({
          request,
          state: raw && typeof raw === 'object' && raw.slug ? { status: 'ready', template: normalizeTemplate(raw as Template & Record<string, unknown>) } : { status: 'notfound' },
        });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ApiError && (err.status === 404 || err.code === 'TEMPLATE_NOT_FOUND')) {
          setResult({ request, state: { status: 'notfound' } });
          return;
        }
        const message =
          err instanceof ApiError && err.code === 'NETWORK'
            ? err.message
            : 'Terjadi kendala saat memuat template. Silakan coba lagi beberapa saat lagi.';
        setResult({ request, state: { status: 'error', message } });
      });
    return () => {
      alive = false;
    };
  }, [key, request]);

  const state: TemplateLoadState = !key ? { status: 'notfound' } : result?.request === request ? result.state : { status: 'loading' };
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
