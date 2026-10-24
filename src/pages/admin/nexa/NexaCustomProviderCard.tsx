import { Field, Input, Notice, PasswordInput, Switch } from '../../../components/admin/ui';

/**
 * Kartu penyedia ketiga di tab Tanya Nexa (pemilik 2026-10-24: "endpoint API universal untuk semua AI"): endpoint
 * custom OpenAI-compatible (POST …/chat/completions + Authorization: Bearer). Backend (nexa_custom_endpoint di
 * backend/modules/nexa.php = nexa.js) yang memutuskan alamat sah; pemeriksaan di sini hanya cermin ringan supaya admin
 * langsung tahu alasannya.
 */

/** Endpoint custom dari nexa_get_config: alamat & model utuh, kunci hanya topeng 4 karakter terakhir. */
export interface NexaCustomConfig {
  on: boolean;
  key_masked: string;
  env_key: boolean;
  url: string;
  model: string;
}

// Alamat dasar resmi penyedia populer; "/chat/completions" ditambahkan server
const PRESETS = [
  { name: 'OpenAI', url: 'https://api.openai.com/v1' },
  { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  { name: 'Groq', url: 'https://api.groq.com/openai/v1' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  { name: 'Mistral', url: 'https://api.mistral.ai/v1' },
  { name: 'xAI (Grok)', url: 'https://api.x.ai/v1' },
] as const;

// = NEXA_CUSTOM_URL_PATTERN / nexa_public_host di backend
const URL_PATTERN = /^https:\/\/([A-Za-z0-9.-]+)(:[0-9]{1,5})?(\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?(\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$/;
const LOCAL_TLDS = ['localhost', 'local', 'internal', 'arpa', 'lan', 'home'];

/** IPv4 desimal lengkap yang publik (bukan privat/loopback/link-local/CGNAT/khusus). */
const publicIpv4 = (labels: string[]) => {
  if (labels.length !== 4 || !labels.every((label) => /^(0|[1-9][0-9]{0,2})$/.test(label) && Number(label) <= 255)) return false;
  const [a, b, c] = labels.map(Number);
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && c === 0)
    || (a === 198 && (b === 18 || b === 19))
  );
};

/** Alasan alamat ditolak server ('' = tampak sah). */
function urlProblem(url: string): string {
  if (url === '') return '';
  if (!url.startsWith('https://')) return 'Alamat harus diawali https:// (huruf kecil).';
  const match = URL_PATTERN.exec(url);
  if (!match || url.length > 300) return 'Alamat tidak valid: tanpa spasi, tanpa # dan tanpa nama:sandi@.';
  const labels = match[1].toLowerCase().split('.');
  const tld = labels[labels.length - 1];
  const ipLike = labels.every((label) => /^(0x[0-9a-f]*|[0-9]+)$/.test(label)) || /^[0-9]+$/.test(tld);
  const badLabel = labels.some((label) => label === '' || label.startsWith('-') || label.endsWith('-'));
  if (labels.length < 2 || badLabel || LOCAL_TLDS.includes(tld) || (ipLike && !publicIpv4(labels))) {
    return 'Pakai alamat server AI publik (bukan localhost, jaringan lokal, atau IP privat).';
  }
  return '';
}

/** Alamat yang benar-benar dipanggil server untuk alamat sah (= nexa_custom_endpoint). */
const endpointPreview = (url: string) => {
  const match = URL_PATTERN.exec(url);
  if (!match) return url;
  const path = (match[3] ?? '').replace(/\/+$/, '');
  return `https://${match[1].toLowerCase()}${match[2] ?? ''}${path.endsWith('/chat/completions') ? path : `${path}/chat/completions`}${match[4] ?? ''}`;
};

/** Server (host[:port]) sebuah alamat, '' bila bukan alamat https sah (= nexa_custom_origin). */
const originOf = (url: string) => {
  const trimmed = url.trim();
  const match = urlProblem(trimmed) === '' ? URL_PATTERN.exec(trimmed) : null;
  return match ? `${match[1].toLowerCase()}${match[2] ?? ''}` : '';
};

export function NexaCustomProviderCard({
  value,
  onChange,
  keyValue,
  onKeyChange,
  clearKey,
  onToggleClear,
  selected,
  savedUrl,
}: {
  value: NexaCustomConfig;
  onChange: (next: NexaCustomConfig) => void;
  /** Kunci baru yang sedang diketik (tidak pernah diisi dari server) */
  keyValue: string;
  onKeyChange: (key: string) => void;
  /** "Hapus kunci tersimpan" ditandai, dikirim saat pengaturan AI disimpan */
  clearKey: boolean;
  onToggleClear: () => void;
  /** Dipilih sebagai penyedia utama */
  selected: boolean;
  /** Alamat yang tersimpan di server: kunci tersimpan terikat ke servernya */
  savedUrl: string;
}) {
  const url = value.url.trim();
  const model = value.model.trim();
  const urlError = urlProblem(url);
  // Peringatan hanya bila endpoint ini dipakai (dipilih utama atau mulai diisi), bukan untuk admin yang tidak memakainya
  const incomplete = value.on && (url === '' || model === '') && (selected || url !== '' || model !== '');
  // Server menghapus kunci tersimpan bila alamat pindah ke server lain tanpa kunci baru (nexa_config_writes)
  const keyDropped =
    value.key_masked !== '' && !clearKey && keyValue.trim() === '' && originOf(savedUrl) !== '' && originOf(url) !== originOf(savedUrl);

  return (
    <div className="space-y-3 rounded-2xl p-4 ring-1 ring-inset ring-adm-line">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-adm-fg">Endpoint custom (OpenAI-compatible)</p>
          <p className="mt-0.5 text-xs text-adm-muted">
            {clearKey
              ? 'Kunci tersimpan akan dihapus saat pengaturan AI disimpan.'
              : value.key_masked !== ''
                ? `Kunci tersimpan: ${value.key_masked}`
                : 'Belum ada kunci (boleh kosong untuk endpoint tanpa kunci).'}
          </p>
        </div>
        <Switch checked={value.on} onChange={(next) => onChange({ ...value, on: next })} label={value.on ? 'Aktif' : 'Nonaktif'} />
      </div>
      <p className="text-xs leading-relaxed text-adm-muted">
        Satu format untuk banyak AI: OpenAI, OpenRouter, Groq, DeepSeek, Mistral, xAI, dan layanan lain yang mendukung
        /chat/completions.
      </p>

      <Field
        label="Alamat endpoint"
        htmlFor="nexa_custom_url"
        error={urlError}
        hint={
          url !== ''
            ? `Server memanggil ${endpointPreview(url)}`
            : 'Alamat dasar API dari dokumentasi penyedia, mis. https://api.openai.com/v1.'
        }
      >
        <Input
          id="nexa_custom_url"
          type="url"
          inputMode="url"
          mono
          spellCheck={false}
          autoComplete="off"
          placeholder="https://api.openai.com/v1"
          invalid={urlError !== ''}
          value={value.url}
          onChange={(event) => onChange({ ...value, url: event.target.value })}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Isi cepat alamat endpoint">
        <span className="mr-0.5 text-xs text-adm-muted">Isi cepat:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            aria-pressed={url === preset.url}
            onClick={() => onChange({ ...value, url: preset.url })}
            className="inline-flex h-7 items-center rounded-full px-3 text-xs font-medium text-adm-fg ring-1 ring-inset ring-adm-line transition-colors hover:bg-adm-hover aria-pressed:bg-adm-cobalt-soft aria-pressed:text-adm-cobalt-fg aria-pressed:ring-cobalt/30"
          >
            {preset.name}
          </button>
        ))}
      </div>

      <Field
        label="Nama model"
        htmlFor="nexa_custom_model"
        hint="Tulis persis seperti di dokumentasi penyedia (huruf besar-kecil berpengaruh), mis. nama model OpenRouter berbentuk penyedia/model."
      >
        <Input
          id="nexa_custom_model"
          mono
          spellCheck={false}
          autoComplete="off"
          placeholder="nama-model"
          value={value.model}
          onChange={(event) => onChange({ ...value, model: event.target.value })}
        />
      </Field>

      <Field
        label="Kunci API endpoint custom"
        htmlFor="nexa_custom_key"
        hint="Dikirim sebagai Authorization: Bearer, hanya ke server alamat di atas. Isi untuk mengganti; biarkan kosong untuk mempertahankan kunci tersimpan."
      >
        <PasswordInput
          id="nexa_custom_key"
          mono
          autoComplete="new-password"
          placeholder="sk-…"
          value={keyValue}
          onChange={(event) => onKeyChange(event.target.value)}
        />
      </Field>
      {value.key_masked !== '' && (
        <button type="button" className="text-xs font-medium text-adm-muted underline-offset-2 hover:underline" onClick={onToggleClear}>
          {clearKey ? 'Batal menghapus kunci' : 'Hapus kunci tersimpan'}
        </button>
      )}

      {keyDropped ? (
        <Notice tone="warning">
          Alamat pindah ke server lain: kunci tersimpan akan dihapus saat disimpan agar tidak terkirim ke server baru. Isi kunci
          API untuk alamat ini.
        </Notice>
      ) : (
        incomplete && <Notice tone="warning">Isi alamat endpoint dan nama model agar penyedia ini bisa dipakai Nexa.</Notice>
      )}
    </div>
  );
}
