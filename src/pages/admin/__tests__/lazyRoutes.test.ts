// Panel admin tidak ikut di bundel awal halaman publik (docs/platform/SEO-PLAN.md §5.7, WP7): routes.tsx (diimpor
// statis oleh App.tsx) hanya boleh mengimpor halaman admin lewat React.lazy di lazyPages.tsx.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as pages from '../lazyPages';

const REACT_LAZY = Symbol.for('react.lazy');
const source = (file: string) => readFileSync(join(process.cwd(), 'src/pages/admin', file), 'utf8');

describe('rute admin lazy', () => {
  it('setiap halaman admin dan kerangkanya adalah React.lazy', () => {
    const lazyExports = Object.entries(pages).filter(([name]) => !name.endsWith('Fallback'));
    expect(lazyExports.length).toBeGreaterThanOrEqual(22);
    for (const [name, value] of lazyExports) {
      expect((value as { $$typeof?: symbol }).$$typeof, name).toBe(REACT_LAZY);
    }
  });

  it('routes.tsx dan lazyPages.tsx tidak mengimpor modul admin secara statis', () => {
    for (const file of ['routes.tsx', 'lazyPages.tsx']) {
      const staticImports = [...source(file).matchAll(/^import\s[^;]*?from\s+'([^']+)'/gms)].map((match) => match[1]);
      const local = staticImports.filter((path) => path.startsWith('.') && path !== './lazyPages');
      expect(local, file).toEqual([]);
    }
  });
});
