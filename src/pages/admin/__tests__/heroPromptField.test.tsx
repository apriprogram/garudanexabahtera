// @vitest-environment jsdom
// Pengaturan website → Hero → "Gaya hero": Klasik (bawaan, isian lama tetap) / Prompt AI (HeroPromptField: judul,
// placeholder, chip label + tautan, saklar animasi Garuda); helper murni heroPrompt.ts (payload simpan, chip bersih,
// pesan tautan salah).
// Jalankan: node ../../../node_modules/vitest/vitest.mjs run src/pages/admin/__tests__/heroPromptField.test.tsx
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HERO_PROMPT_CHIPS_DEFAULT,
  readHeroPromptDraft,
  type HeroPromptSettings,
  type HeroStyle,
} from '../../../components/sections/hero/heroStyle';
import HeroSettings from '../HeroSettings';
import { CHIP_HREF_ERROR, canAddChip, chipHrefError, cleanChips, heroPromptPayload } from '../hero/heroPrompt';

afterEach(cleanup);

const Harness = ({
  initialStyle = 'classic',
  loading = false,
  onPrompt,
}: {
  initialStyle?: HeroStyle;
  loading?: boolean;
  onPrompt?: (next: HeroPromptSettings) => void;
}) => {
  const [style, setStyle] = useState<HeroStyle>(initialStyle);
  const [prompt, setPrompt] = useState(() => readHeroPromptDraft({}));
  return (
    <HeroSettings
      loading={loading}
      settings={{ hero_title: 'Judul klasik' }}
      heroImages={[]}
      setHeroImages={() => {}}
      heroLogos={[]}
      setHeroLogos={() => {}}
      heroBgMode="default"
      setHeroBgMode={() => {}}
      heroVideo=""
      setHeroVideo={() => {}}
      heroVideoPoster=""
      setHeroVideoPoster={() => {}}
      heroStyle={style}
      setHeroStyle={setStyle}
      heroPrompt={prompt}
      setHeroPrompt={(next) => {
        setPrompt(next);
        onPrompt?.(next);
      }}
    />
  );
};

const classicGridHidden = () => document.getElementById('hero_title')?.closest('.hidden') !== null;

describe('helper heroPrompt.ts', () => {
  it('heroPromptPayload: teks dirapikan, chip bersih sebagai JSON, saklar "1"/"0"', () => {
    expect(
      heroPromptPayload({
        title: '  Mau  bikin apa? ',
        placeholder: '',
        chips: [
          { label: ' Toko  online ', href: ' /template/kategori/toko-online ' },
          { label: 'Salah', href: 'javascript:1' },
          { label: '', href: '/x' },
        ],
        garuda: false,
      }),
    ).toEqual({
      hero_prompt_title: 'Mau bikin apa?',
      hero_prompt_placeholder: '',
      hero_prompt_chips: JSON.stringify([{ label: 'Toko online', href: '/template/kategori/toko-online' }]),
      hero_prompt_garuda: '0',
    });
    expect(heroPromptPayload(readHeroPromptDraft({})).hero_prompt_garuda).toBe('1');
  });

  it('cleanChips maksimal 6; canAddChip; chipHrefError hanya untuk tautan terisi yang tidak aman', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ label: `C${i}`, href: '/a' }));
    expect(cleanChips(many)).toHaveLength(6);
    expect(canAddChip(many.slice(0, 5))).toBe(true);
    expect(canAddChip(many.slice(0, 6))).toBe(false);
    expect(chipHrefError('')).toBeNull();
    expect(chipHrefError('   ')).toBeNull();
    expect(chipHrefError('/template')).toBeNull();
    expect(chipHrefError('#kontak')).toBeNull();
    expect(chipHrefError('https://wa.me/1')).toBeNull();
    expect(chipHrefError('template')).toBe(CHIP_HREF_ERROR);
    expect(chipHrefError('//evil')).toBe(CHIP_HREF_ERROR);
  });
});

describe('HeroSettings → Gaya hero', () => {
  it('bawaan Klasik: isian lama tampil, isian Prompt AI tidak ada', () => {
    render(<Harness />);
    expect(screen.getByRole('tab', { name: 'Klasik' })).toHaveAttribute('aria-selected', 'true');
    expect(classicGridHidden()).toBe(false);
    expect(screen.getByDisplayValue('Judul klasik')).toBeInTheDocument();
    expect(screen.queryByLabelText('Placeholder kotak prompt')).toBeNull();
  });

  it('Prompt AI: isian prompt tampil, isian Klasik disembunyikan tapi tetap terpasang (nilainya ikut tersimpan)', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('tab', { name: 'Prompt AI' }));
    expect(screen.getByRole('tab', { name: 'Prompt AI' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Placeholder kotak prompt')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Animasi burung Garuda/ })).toHaveAttribute('aria-checked', 'true');
    expect(classicGridHidden()).toBe(true);
    expect(screen.getByDisplayValue('Judul klasik')).toBeInTheDocument();
    // Chip bawaan terisi, bisa diedit
    const rows = screen.getAllByLabelText(/^Teks chip/);
    expect(rows).toHaveLength(HERO_PROMPT_CHIPS_DEFAULT.length);
    expect(rows[0]).toHaveValue(HERO_PROMPT_CHIPS_DEFAULT[0].label);
    fireEvent.click(screen.getByRole('tab', { name: 'Klasik' }));
    expect(classicGridHidden()).toBe(false);
  });

  it('chip: tambah sampai 6, tautan salah diberi peringatan, hapus; perubahan diteruskan ke halaman', () => {
    const onPrompt = vi.fn();
    render(<Harness initialStyle="prompt" onPrompt={onPrompt} />);
    const add = screen.getByRole('button', { name: 'Tambah chip' });
    fireEvent.click(add);
    expect(screen.getAllByLabelText(/^Teks chip/)).toHaveLength(5);
    fireEvent.click(add);
    expect(screen.getAllByLabelText(/^Teks chip/)).toHaveLength(6);
    expect(add).toBeDisabled();
    expect(onPrompt).toHaveBeenLastCalledWith(expect.objectContaining({ chips: expect.arrayContaining([{ label: '', href: '' }]) }));

    fireEvent.change(screen.getByLabelText('Tautan chip 5'), { target: { value: 'template' } });
    expect(screen.getByRole('alert')).toHaveTextContent(CHIP_HREF_ERROR);
    fireEvent.change(screen.getByLabelText('Tautan chip 5'), { target: { value: '/template' } });
    expect(screen.queryByRole('alert')).toBeNull();
    // Baris 5 kini tautan terisi tapi teks kosong = belum lengkap: teksnya ditandai dan ada peringatan (tidak tersimpan)
    expect(screen.getByLabelText('Teks chip 5')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Ada chip yang belum lengkap/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Teks chip 5'), { target: { value: 'Katalog' } });
    expect(screen.queryByText(/Ada chip yang belum lengkap/)).toBeNull();
    // Baris 6 masih kosong seluruhnya: bukan "belum lengkap"
    expect(screen.getByLabelText('Teks chip 6')).not.toHaveAttribute('aria-invalid', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Hapus chip 6' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus chip 5' }));
    expect(screen.getAllByLabelText(/^Teks chip/)).toHaveLength(4);
    expect(add).toBeEnabled();

    fireEvent.change(screen.getByLabelText('Judul utama', { selector: '#hero_prompt_title' }), { target: { value: 'Mau bikin apa?' } });
    expect(onPrompt).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Mau bikin apa?' }));
    fireEvent.click(screen.getByRole('switch', { name: /Animasi burung Garuda/ }));
    expect(onPrompt).toHaveBeenLastCalledWith(expect.objectContaining({ garuda: false }));
    const chips = within(screen.getByText('Chip rekomendasi').closest('div')!.parentElement!);
    expect(chips.getByText(`4/6 chip`)).toBeInTheDocument();
  });

  it('hapus chip memindahkan fokus ke tombol hapus sebelumnya, atau ke "Tambah chip" bila daftar habis; saat memuat semua dikunci', async () => {
    vi.useFakeTimers();
    try {
      render(<Harness initialStyle="prompt" />);
      const remove4 = screen.getByRole('button', { name: 'Hapus chip 4' });
      remove4.focus();
      fireEvent.click(remove4);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(screen.getByRole('button', { name: 'Hapus chip 3' })).toHaveFocus();
      for (const n of [3, 2, 1]) {
        fireEvent.click(screen.getByRole('button', { name: `Hapus chip ${n}` }));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(50);
        });
      }
      expect(screen.getByRole('button', { name: 'Tambah chip' })).toHaveFocus();
      expect(screen.getByText(/Belum ada chip/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
    cleanup();
    render(<Harness initialStyle="prompt" loading />);
    expect(screen.getByRole('tab', { name: 'Klasik' })).toBeDisabled();
    expect(screen.getByLabelText('Placeholder kotak prompt')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tambah chip' })).toBeDisabled();
  });
});
