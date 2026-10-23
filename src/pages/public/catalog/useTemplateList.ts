// Daftar template terbit untuk halaman katalog, kategori dan "Template lainnya" (docs/platform/SEO-PLAN.md §5.5).
// Render pertama memakai data preload HTML prerender (get_templates), jadi kartu dan tautan /template/{slug} ada di HTML
// mentah dan hidrasi tidak berbeda; effect lalu memuat data terbaru. Gagal menyegarkan data preload → data preload tetap.
// Sama dengan usePublishedTemplates (WP6), ditambah pesan galat dan "Coba lagi" untuk halaman yang isinya daftar template.
import { useCallback, useEffect, useState } from 'react';
import { publishedFromResponse } from '../../../hooks/usePublishedTemplates';
import { ApiError, apiGet, peekApiGet } from '../../../lib/api';
import type { Template } from '../../../types/platform';

export type TemplateListState =
  | { status: 'loading' }
  | { status: 'ready'; templates: Template[] }
  | { status: 'error'; message: string };

interface TemplatesResponse {
  templates?: unknown;
}

const initialState = (): TemplateListState => {
  const primed = peekApiGet<TemplatesResponse>('get_templates');
  return primed ? { status: 'ready', templates: publishedFromResponse(primed) } : { status: 'loading' };
};

export function useTemplateList() {
  const [state, setState] = useState<TemplateListState>(initialState);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    apiGet<TemplatesResponse>('get_templates')
      .then((data) => {
        if (alive) setState({ status: 'ready', templates: publishedFromResponse(data) });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const message =
          err instanceof ApiError && err.code === 'NETWORK'
            ? err.message
            : 'Terjadi kendala saat memuat template. Silakan coba lagi beberapa saat lagi.';
        setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', message }));
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
