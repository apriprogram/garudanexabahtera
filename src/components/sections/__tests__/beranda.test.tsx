// @vitest-environment jsdom
// Konten & performa beranda (paket "beranda-konten"): syarat proyek layak tampil di #projects (tanpa teks uji, cadangan
// portofolio), kartu proyek datar, strip layanan (ikon + tanda SVG ringan, ejaan i-School), toggle & "Lihat Demo" hero,
// tombol jeda tayangan, rail langkah, dan peringatan syarat tampil di form proyek admin.
// Jalankan: npx vitest run --dir src/components/sections
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteSettings } from '../../../hooks/useSiteSettings';
import Projects from '../Projects';
import LogoTicker from '../LogoTicker';
import { HeroIntro } from '../hero/HeroIntro';
import { HeroShowcase } from '../hero/HeroShowcase';
import type { ShowcaseItem } from '../hero/showcase';
import { isPresentableProject, projectIssues } from '../projects/presentable';
import { t } from '../../../hooks/useTranslation';
import { ProjectFormDrawer } from '../../../pages/admin/project-clients/ProjectFormDrawer';
import type { Project } from '../../../pages/admin/project-clients/projectShared';

// Setting website per tes (tanpa cache modul useCachedJson); helper lain (readList, dst.) tetap asli
let mockSettings: SiteSettings = {};
vi.mock('../../../hooks/useSiteSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useSiteSettings')>()),
  useSiteSettings: () => ({ settings: mockSettings, loaded: true }),
}));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LONG = 'Website profil perusahaan dengan halaman layanan, galeri proyek, dan formulir kontak.';

let publicProjects: unknown[] = [];

beforeEach(() => {
  mockSettings = {};
  publicProjects = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const action = new URL(String(input), 'http://localhost').searchParams.get('action');
      if (action === 'get_public_projects') return json(200, { projects: publicProjects });
      return json(200, {});
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderAt = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('syarat proyek layak tampil (B-01)', () => {
  it('menolak teks uji, deskripsi pendek, dan proyek tanpa gambar', () => {
    const ok = { name: 'Website Perusahaan', image: '/a.jpg', description: LONG };
    expect(isPresentableProject(ok)).toBe(true);
    expect(isPresentableProject({ ...ok, description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.' })).toBe(false);
    expect(isPresentableProject({ ...ok, description: 'Coba text yang cukup panjang untuk lolos batas empat puluh karakter.' })).toBe(false);
    expect(isPresentableProject({ ...ok, description: 'Test deskripsi yang cukup panjang untuk lolos batas empat puluh.' })).toBe(false);
    expect(isPresentableProject({ ...ok, name: '[TEST verif-ui] Aplikasi' })).toBe(false);
    expect(isPresentableProject({ ...ok, description: 'Terlalu pendek.' })).toBe(false);
    expect(isPresentableProject({ ...ok, image: null })).toBe(false);
    expect(projectIssues({ name: 'Undangan Digital', image: '', description: 'Coba text' })).toEqual([
      'belum ada gambar',
      'deskripsi kurang dari 40 karakter',
      'judul atau deskripsi masih berisi teks uji',
    ]);
  });
});

describe('Projects (#projects)', () => {
  it('hanya menampilkan proyek yang layak; kartu datar, gambar dekoratif, aksi header "Pesan Custom"', async () => {
    publicProjects = [
      { id: 1, name: 'Website Perusahaan', service_type: 'website', image: '/p1.jpg', description: LONG },
      { id: 2, name: 'Undangan Digital', service_type: 'website', image: '/p2.jpg', description: `${LONG} Versi undangan.` },
      { id: 3, name: 'Undangan Lama', service_type: 'mobile_app', image: '/p3.jpg', description: 'Lorem Ipsum is simply dummy text of the printing industry.' },
      { id: 4, name: 'Profil', service_type: 'website', image: '/p4.jpg', description: 'Coba text' },
    ];
    renderAt(<Projects />);
    const section = document.getElementById('projects') as HTMLElement;
    await waitFor(() => expect(within(section).getByRole('heading', { name: 'Website Perusahaan' })).toBeInTheDocument());
    expect(within(section).getByRole('heading', { name: 'Undangan Digital' })).toBeInTheDocument();
    expect(section).not.toHaveTextContent(/Lorem Ipsum|Coba text|Undangan Lama/);

    // Judul sudah dibacakan dari h3, jadi gambar dekoratif; tanpa zoom/lift karena kartu bukan tautan
    const images = section.querySelectorAll('img');
    expect(images).toHaveLength(2);
    images.forEach((img) => {
      expect(img).toHaveAttribute('alt', '');
      expect(img.className).not.toMatch(/scale/);
    });
    section.querySelectorAll('article').forEach((card) => expect(card.className).not.toMatch(/\blift\b/));

    const action = within(section).getByRole('link', { name: /Pesan Custom/ });
    expect(action).toHaveAttribute('href', '/pesan-custom');
    expect(action.querySelector('svg')?.getAttribute('class')).toContain('motion-reduce:transition-none');
  });

  it('kurang dari 2 proyek layak → portofolio cadangan, teks uji tidak pernah tampil', async () => {
    publicProjects = [
      { id: 1, name: 'Website Perusahaan', service_type: 'website', image: '/p1.jpg', description: LONG },
      { id: 2, name: 'Undangan Digital', service_type: 'mobile_app', image: '/p2.jpg', description: 'Lorem Ipsum is simply dummy text of the printing industry.' },
    ];
    mockSettings = { portfolio_data: JSON.stringify([{ title: 'Sistem Informasi Desa', desc: 'GOVERNMENT / WEB', image: '/assets/product/pos.png' }]) };
    renderAt(<Projects />);
    const section = document.getElementById('projects') as HTMLElement;
    await waitFor(() => expect(within(section).getByRole('heading', { name: 'Sistem Informasi Desa' })).toBeInTheDocument());
    expect(section).not.toHaveTextContent(/Website Perusahaan|Lorem Ipsum/);
  });
});

describe('strip layanan (LogoTicker)', () => {
  it('bawaan: ikon layanan + tanda SVG ringan, ejaan i-School/i-Santri, tanpa PNG raksasa', () => {
    const { container } = render(<LogoTicker />);
    expect(screen.getByText(/Produk dan layanan kami:/)).toHaveTextContent(
      'Template Company Profile, Website Custom, Aplikasi Mobile, i-School, i-Santri, Kasir POS, Absensi Digital, Digital Invitation.',
    );
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/\.png/);
    expect(container.innerHTML).toContain('/assets/logo/ischool-mark.svg');
    const first = container.querySelector('[data-ticker-item]') as HTMLElement;
    expect(first.querySelector('svg')).not.toBeNull(); // ikon lucide, bukan logo Garuda Nexa berulang
    expect(first.lastElementChild?.className).not.toMatch(/uppercase/);
  });

  it('setting admin lama: PNG 4-6k px diganti tanda SVG, logo Garuda Nexa diganti ikon, ejaan dirapikan', () => {
    mockSettings = {
      hero_logos: JSON.stringify([
        { name: 'I-SCHOOL', src: 'https://garudanexa.com/assets/logo/ischool.png' },
        { name: 'Digital Invitation', src: '/assets/logo/logoweddingputih.png' },
        { name: 'Kasir POS', src: '/assets/logo/logogarudanexa.png' },
      ]),
    };
    const { container } = render(<LogoTicker />);
    expect(screen.getByText(/Produk dan layanan kami:/)).toHaveTextContent('i-School, Digital Invitation, Kasir POS.');
    expect(container.innerHTML).not.toMatch(/\.png/);
    expect(container.innerHTML).toContain('/assets/logo/ischool-mark.svg');
    expect(container.innerHTML).toContain('/assets/logo/invitation-mark.svg');
  });
});

const ITEM: ShowcaseItem = {
  key: 'tpl-1-corporate-nexa',
  slug: 'corporate-nexa',
  name: 'Corporate Nexa',
  category: 'Company Profile',
  price: 1500000,
  image: '/assets/templates/corporate-nexa-preview.svg',
  fallbackImage: null,
  demoHref: '/demo/corporate-nexa',
  demoExternal: false,
};

describe('HeroIntro', () => {
  it('toggle gaya Dribbble: label kapital kecil tanpa ikon, terpilih teks gelap di pill putih; label pendek HP jelas', () => {
    renderAt(<HeroIntro mode="template" onModeChange={() => {}} current={ITEM} templatesHidden={false} />);
    const [template, custom] = screen.getAllByRole('tab');
    expect(template).toHaveTextContent('Template siap pakai');
    expect(custom).toHaveTextContent('Website & aplikasi custom');
    expect(template.className).toMatch(/uppercase/);
    expect(template.className).toContain('text-fg');
    expect(template.querySelector('svg')).toBeNull();
    expect(t('home-hero-mode-template-short')).toBe('Siap pakai');
    expect(t('home-hero-mode-custom-short')).toBe('Jasa custom');
    expect(t('nav-projects')).toBe('Projects'); // keputusan pemilik: label nav tetap
  });

  it('mode Template hanya "Pilih Template" (tanpa "Lihat Demo"); mode Custom "Start Your Project Brief"', () => {
    const { unmount } = renderAt(<HeroIntro mode="template" onModeChange={() => {}} current={ITEM} templatesHidden={false} />);
    const panels = screen.getAllByRole('tabpanel');
    expect(within(panels[0]).getByRole('link', { name: /Pilih Template/ })).toBeInTheDocument();
    expect(screen.queryByText(/Lihat Demo/)).toBeNull();
    unmount();

    renderAt(<HeroIntro mode="custom" onModeChange={() => {}} current={ITEM} templatesHidden={false} />);
    const brief = screen.getByRole('link', { name: 'Start Your Project Brief' });
    expect(brief).toHaveAttribute('href', '/pesan-custom');
    expect(brief.querySelector('svg')).not.toBeNull();
  });
});

describe('HeroShowcase', () => {
  const props = {
    step: 0,
    onStep: () => {},
    items: [ITEM, { ...ITEM, key: 'tpl-2', slug: 'startup-clean', name: 'Startup Clean' }],
    sample: false,
    slide: 0,
    onNext: () => {},
    templatesHidden: false,
  };

  it('tombol jeda: label tetap "Jeda tayangan", status lewat aria-pressed', () => {
    renderAt(<HeroShowcase mode="template" {...props} />);
    const pause = screen.getByRole('button', { name: 'Jeda tayangan' });
    expect(pause).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(pause);
    expect(screen.getByRole('button', { name: 'Jeda tayangan' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Putar tayangan' })).not.toBeInTheDocument();
  });

  it('hold menghentikan tayangan; label semua langkah tampil mulai xl', () => {
    const { container, rerender } = renderAt(<HeroShowcase mode="template" {...props} />);
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.className).not.toContain('is-paused');
    rerender(
      <MemoryRouter>
        <HeroShowcase mode="template" {...props} hold />
      </MemoryRouter>,
    );
    expect(wrap.className).toContain('is-paused');

    const rail = screen.getByRole('list', { name: 'Alur pemesanan template' });
    const labels = within(rail).getAllByText(/Pilih template|Bayar via Midtrans|Domain aktif|Kelola lewat CMS/);
    expect(labels).toHaveLength(4);
    labels.slice(1).forEach((label) => expect(label.className).toContain('xl:inline'));
  });

  it('mode Custom diberi keterangan "Contoh tampilan"; metode pembayaran tidak dirinci', () => {
    const { rerender } = renderAt(<HeroShowcase mode="custom" {...props} />);
    expect(screen.getByText('Contoh tampilan')).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <HeroShowcase mode="template" {...props} step={1} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Contoh tampilan')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/QRIS|Virtual Account|E-wallet/);
  });
});

describe('form proyek admin', () => {
  it('memberi tahu kenapa proyek yang dicentang "Tampilkan di website" belum tampil di beranda', () => {
    const project = {
      id: 2,
      name: 'Undangan Digital',
      client_name: 'Klien',
      client_email: '',
      client_phone: '',
      service_type: 'website',
      status: 'active',
      price: null,
      start_date: '',
      end_date: '',
      image: '',
      project_files: '[]',
      description: 'Coba text',
      assigned_user: '',
      show_on_website: 1,
      source: 'admin',
    } satisfies Project;
    render(<ProjectFormDrawer open project={project} usersList={[]} onClose={() => {}} onSaved={() => {}} onError={() => {}} />);
    expect(screen.getByText('Belum tampil di beranda')).toBeInTheDocument();
    expect(screen.getByText(/belum ada gambar, deskripsi kurang dari 40 karakter, judul atau deskripsi masih berisi teks uji/)).toBeInTheDocument();
    expect(screen.getByText(/Disarankan 1600×1000 px/)).toBeInTheDocument();
  });
});
