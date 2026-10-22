// Daftar template terbit untuk halaman info (beranda, /harga, /tentang): nilai awal dari data preload HTML prerender
// (sama di server dan saat hidrasi), lalu dimuat ulang dari API setelah mount supaya harga selalu terbaru.
import { useEffect, useState } from 'react';
import { wibDate } from '../content/pricing';
import { apiGet, peekApiGet } from '../lib/api';
import { readPreload } from '../lib/preload';
import { normalizeTemplate } from '../pages/public/template/useTemplateBySlug';
import type { Template } from '../types/platform';

export type PublishedTemplatesStatus = 'loading' | 'ready' | 'error';

export interface PublishedTemplates {
  status: PublishedTemplatesStatus;
  /** Template terbit dengan slug sah, urut seperti API (sort_order). */
  templates: Template[];
}

interface TemplatesResponse {
  templates?: unknown;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Respons get_templates → template terbit yang rapi. */
export function publishedFromResponse(response: TemplatesResponse | null | undefined): Template[] {
  const list = Array.isArray(response?.templates) ? response.templates : [];
  return list
    .filter((raw): raw is Record<string, unknown> => Boolean(raw) && typeof raw === 'object' && !Array.isArray(raw))
    .map((raw) => normalizeTemplate(raw as Partial<Template> & Record<string, unknown>))
    .filter((t) => t.status !== 'draft' && SLUG.test(t.slug));
}

function initialState(): PublishedTemplates {
  const primed = peekApiGet<TemplatesResponse>('get_templates');
  return primed ? { status: 'ready', templates: publishedFromResponse(primed) } : { status: 'loading', templates: [] };
}

export function usePublishedTemplates(): PublishedTemplates {
  const [state, setState] = useState<PublishedTemplates>(initialState);

  useEffect(() => {
    let alive = true;
    apiGet<TemplatesResponse>('get_templates')
      .then((res) => {
        if (alive) setState({ status: 'ready', templates: publishedFromResponse(res) });
      })
      .catch(() => {
        // Gagal memuat ulang: data preload (bila ada) tetap dipakai
        if (alive) setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', templates: [] }));
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

/**
 * Tanggal data harga (YYYY-MM-DD): waktu data prerender diambil saat build, atau hari ini bila halaman dirender di
 * browser tanpa data preload (harga baru saja dimuat dari API). Sama di server dan saat hidrasi.
 */
export function usePriceDate(): string {
  // Tanggal di WIB (UTC+7), sama dengan llms.txt dan kepala halaman (data.builtAt)
  const [date] = useState(() => wibDate(readPreload()?.builtAt) ?? (wibDate(new Date().toISOString()) as string));
  return date;
}
