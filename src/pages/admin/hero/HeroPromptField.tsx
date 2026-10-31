import React, { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Chip, Field, Input, Notice, Switch, cn, FOCUS } from '../../../components/admin/ui';
import {
  HERO_PROMPT_LABEL_MAX,
  HERO_PROMPT_MAX_CHIPS,
  HERO_PROMPT_PLACEHOLDER_DEFAULT,
  HERO_PROMPT_TEXT_MAX,
  HERO_PROMPT_TITLE_DEFAULT,
  type HeroPromptChip,
  type HeroPromptSettings,
} from '../../../components/sections/hero/heroStyle';
import { canAddChip, chipHrefError } from './heroPrompt';

interface HeroPromptFieldProps {
  value: HeroPromptSettings;
  onChange: (next: HeroPromptSettings) => void;
  /** true selama menyimpan: semua isian dikunci. */
  disabled?: boolean;
}

/* Tombol hapus chip: ikon saja, area sentuh diperluas di HP */
const REMOVE_CHIP = cn(
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-adm-muted transition-colors hover:bg-adm-danger-soft hover:text-adm-danger-fg',
  'max-sm:before:absolute max-sm:before:-inset-1.5 relative disabled:cursor-not-allowed disabled:opacity-40',
  FOCUS,
);

/**
 * Isian gaya hero "Prompt AI" (Pengaturan website → Hero → Gaya hero): judul besar, placeholder kotak prompt, chip
 * rekomendasi (label + tautan ke halaman website), dan saklar animasi burung Garuda ASCII. Hanya ini yang dipakai gaya
 * tersebut; badge, subjudul, tombol dan latar hero tetap milik gaya Klasik. Terkontrol: nilainya dipegang halaman
 * (SiteSettings) dan dikirim lewat heroPromptPayload() saat menyimpan.
 */
/** Baris chip yang hanya terisi sebagian (teks saja / tautan saja): tidak tersimpan, jadi diberi tahu. */
const incompleteChip = (chip: HeroPromptChip): boolean => (chip.label.trim() === '') !== (chip.href.trim() === '');

const HeroPromptField: React.FC<HeroPromptFieldProps> = ({ value, onChange, disabled = false }) => {
  const removeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const addRef = useRef<HTMLButtonElement>(null);
  const update = (patch: Partial<HeroPromptSettings>) => onChange({ ...value, ...patch });
  const updateChip = (index: number, patch: Partial<HeroPromptChip>) =>
    update({ chips: value.chips.map((chip, i) => (i === index ? { ...chip, ...patch } : chip)) });
  const removeChip = (index: number) => {
    update({ chips: value.chips.filter((_, i) => i !== index) });
    // Tombol yang difokus ikut hilang: fokus pindah ke tombol hapus baris sebelumnya, atau "Tambah chip" bila habis
    requestAnimationFrame(() => (removeRefs.current[index - 1] ?? addRef.current)?.focus());
  };
  const addChip = () => {
    if (canAddChip(value.chips)) update({ chips: [...value.chips, { label: '', href: '' }] });
  };
  const invalidHref = value.chips.find((chip) => chipHrefError(chip.href));
  const hasIncomplete = value.chips.some(incompleteChip);

  return (
    <div className="space-y-4 rounded-[20px] bg-adm-ghost/60 p-4 ring-1 ring-inset ring-adm-line sm:space-y-5 sm:p-5">
      <Notice tone="mist">
        Pesan dari kotak prompt dikirim ke chat Nexa AI (kunci & saklar di tab Tanya Nexa): Nexa merekomendasikan template,
        menjelaskan harga, dan mengarahkan ke form pesan custom. Bila widget Nexa dimatikan, pengunjung dibawa ke form
        pesan custom dengan teksnya terisi. Chip rekomendasi mengarah ke halaman yang kamu pilih. Badge, subjudul, tombol,
        dan latar hero hanya dipakai gaya Klasik.
      </Notice>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-5">
        <Field
          label="Judul utama"
          htmlFor="hero_prompt_title"
          hint={`Kosong = "${HERO_PROMPT_TITLE_DEFAULT}". Judul tanpa frasa "template website" tetap tampil besar; H1 kata kunci bawaan tampil kecil di atasnya (SEO).`}
        >
          <Input
            id="hero_prompt_title"
            value={value.title}
            maxLength={HERO_PROMPT_TEXT_MAX}
            placeholder={HERO_PROMPT_TITLE_DEFAULT}
            disabled={disabled}
            onChange={(e) => update({ title: e.target.value })}
          />
        </Field>
        <Field label="Placeholder kotak prompt" htmlFor="hero_prompt_placeholder" hint={`Kosong = "${HERO_PROMPT_PLACEHOLDER_DEFAULT}"`}>
          <Input
            id="hero_prompt_placeholder"
            value={value.placeholder}
            maxLength={HERO_PROMPT_TEXT_MAX}
            placeholder={HERO_PROMPT_PLACEHOLDER_DEFAULT}
            disabled={disabled}
            onChange={(e) => update({ placeholder: e.target.value })}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-adm-fg">Chip rekomendasi</p>
            <p className="mt-0.5 text-xs leading-relaxed text-adm-muted">
              Tampil di bawah kotak prompt. Tautan: alamat halaman website ini (mis. /template, /pesan-custom,
              /template/kategori/toko-online), https://…, atau #kontak.
            </p>
          </div>
          <Chip className="tabular-nums">
            {value.chips.length}/{HERO_PROMPT_MAX_CHIPS} chip
          </Chip>
        </div>

        {value.chips.length === 0 && <Notice tone="warning">Belum ada chip. Website tidak menampilkan rekomendasi.</Notice>}

        <ul className="space-y-2">
          {value.chips.map((chip, index) => {
            const error = chipHrefError(chip.href);
            const incomplete = incompleteChip(chip);
            return (
              <li key={index} className="flex items-start gap-2">
                <Input
                  aria-label={`Teks chip ${index + 1}`}
                  controlSize="sm"
                  value={chip.label}
                  invalid={incomplete && chip.label.trim() === ''}
                  maxLength={HERO_PROMPT_LABEL_MAX}
                  placeholder="Teks chip"
                  disabled={disabled}
                  wrapperClassName="min-w-0 flex-1"
                  onChange={(e) => updateChip(index, { label: e.target.value })}
                />
                <Input
                  aria-label={`Tautan chip ${index + 1}`}
                  controlSize="sm"
                  mono
                  value={chip.href}
                  invalid={error !== null || (incomplete && chip.href.trim() === '')}
                  placeholder="/template"
                  disabled={disabled}
                  wrapperClassName="min-w-0 flex-1"
                  onChange={(e) => updateChip(index, { href: e.target.value })}
                />
                <button
                  ref={(el) => {
                    removeRefs.current[index] = el;
                  }}
                  type="button"
                  onClick={() => removeChip(index)}
                  aria-label={`Hapus chip ${index + 1}`}
                  disabled={disabled}
                  className={REMOVE_CHIP}
                >
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        {invalidHref && <Notice tone="danger">{chipHrefError(invalidHref.href)} Chip itu tidak akan tersimpan.</Notice>}
        {hasIncomplete && (
          <Notice tone="warning">Ada chip yang belum lengkap: isi teks dan tautannya. Chip yang hanya terisi sebagian tidak tersimpan.</Notice>
        )}

        <Button ref={addRef} variant="secondary" size="sm" icon={<Plus />} onClick={addChip} disabled={disabled || !canAddChip(value.chips)}>
          Tambah chip
        </Button>
      </div>

      <Switch
        id="hero_prompt_garuda"
        checked={value.garuda}
        disabled={disabled}
        onChange={(garuda) => update({ garuda })}
        label="Animasi burung Garuda (ASCII)"
        description="Burung Garuda dari karakter teks terbang melintas dan singgah di latar putih. Berhenti saat hero tidak terlihat; pengunjung yang memilih kurangi animasi melihat satu gambar diam."
      />
    </div>
  );
};

export default HeroPromptField;
