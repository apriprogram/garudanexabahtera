// Ilustrasi sampul kartu artikel /panduan (permintaan pemilik 2026-10-24: ganti kotak "halaman" polos dengan ilustrasi
// per topik). SVG datar 16:10 (viewBox 320×200, sama dengan rasio sampul), warna dari token (fill-*/stroke-*), tanpa
// aset jaringan. Dekoratif: pembungkusnya aria-hidden. Saat kartu di-hover objek utama naik sedikit, aksen lebih tinggi.
import type { ReactNode } from 'react';

export type CoverKind = 'webCost' | 'appCost' | 'compare' | 'showcase' | 'app' | 'guide';

const MOVE = 'transition-transform duration-500 ease-calm motion-reduce:transition-none';
const LIFT = `${MOVE} motion-safe:group-hover:-translate-y-1`;
const FLOAT = `${MOVE} motion-safe:group-hover:-translate-y-2.5`;
/** Permukaan putih bergaris tipis (jendela, ponsel, kartu) */
const PANEL = 'fill-surface stroke-line';
/** Baris teks: judul gelap, isi abu */
const HEAD = 'fill-fg/70';
const TEXT = 'fill-fg/15';

function Canvas({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 200" className="absolute inset-0 h-full w-full" focusable="false">
      {/* Cahaya putih lembut di belakang objek utama */}
      <circle cx="160" cy="104" r="86" className="fill-surface/45" />
      {children}
    </svg>
  );
}

/** Kilau empat sudut (garis lengkung ke tengah) */
function Sparkle({ x, y, s = 8, className = 'fill-brand-300' }: { x: number; y: number; s?: number; className?: string }) {
  return <path d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`} className={className} />;
}

/** Jendela browser: bingkai, tiga titik, kolom alamat, garis bawah bilah atas (tinggi bilah 22). */
function Browser({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="12" className={PANEL} />
      {[12, 21, 30].map((dx) => (
        <circle key={dx} cx={x + dx} cy={y + 11} r="3" className="fill-fg/15" />
      ))}
      <rect x={x + 44} y={y + 6} width={w - 60} height="10" rx="5" className="fill-fg/5" />
      <rect x={x} y={y + 22} width={w} height="1" className="fill-line" />
    </>
  );
}

/** Tumpukan koin; cy = muka atas koin paling bawah. */
function Coins({ cx, cy, count = 3 }: { cx: number; cy: number; count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const y = cy - i * 7;
        return (
          <g key={i}>
            <ellipse cx={cx} cy={y + 6} rx="18" ry="6" className="fill-brand-800" />
            <rect x={cx - 18} y={y} width="36" height="6" className="fill-brand-800" />
            <ellipse cx={cx} cy={y} rx="18" ry="6" className="fill-brand-500" />
            <ellipse cx={cx} cy={y} rx="11" ry="3.4" className="fill-none stroke-surface/45" strokeWidth="1.2" />
          </g>
        );
      })}
    </>
  );
}

/** Label harga "Rp" (ujung runcing ke kiri), digeser/diputar lewat transform. */
function PriceTag({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path d="M14 0H72a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H14L0 18Z" className="fill-brand-600" />
      <circle cx="12" cy="18" r="3.5" className="fill-surface" />
      <text x="22" y="23.5" fontSize="14" fontWeight="700" className="fill-surface">
        Rp
      </text>
      <rect x="48" y="12" width="22" height="4" rx="2" className="fill-surface/75" />
      <rect x="48" y="20" width="14" height="4" rx="2" className="fill-surface/45" />
    </g>
  );
}

/** Lencana centang hijau */
function Check({ cx, cy, r = 9 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} className="fill-success" />
      <path
        d={`M${cx - r * 0.38} ${cy}l${r * 0.26} ${r * 0.28} ${r * 0.5}-${r * 0.56}`}
        className="fill-none stroke-surface"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

/** Ponsel (bagian bawah boleh terpotong tepi sampul) dengan isi layar aplikasi. */
function Phone({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x} y={y} width="84" height="190" rx="16" className={PANEL} />
      <rect x={x + 30} y={y + 8} width="24" height="6" rx="3" className="fill-fg/10" />
      <rect x={x + 12} y={y + 24} width="34" height="6" rx="3" className={HEAD} />
      <circle cx={x + 68} cy={y + 27} r="5" className="fill-brand-100" />
      {/* Kartu saldo */}
      <rect x={x + 12} y={y + 40} width="60" height="40" rx="8" className="fill-brand-600" />
      <circle cx={x + 62} cy={y + 51} r="4" className="fill-surface/30" />
      <rect x={x + 20} y={y + 49} width="22" height="4" rx="2" className="fill-surface/60" />
      <rect x={x + 20} y={y + 61} width="36" height="8" rx="4" className="fill-surface" />
      {/* Ikon fitur */}
      {[
        ['fill-brand-100', 'fill-brand-600'],
        ['fill-success-50', 'fill-success'],
        ['fill-brand-50', 'fill-brand-400'],
      ].map(([tile, dot], i) => (
        <g key={tile}>
          <rect x={x + 12 + i * 21} y={y + 90} width="18" height="18" rx="6" className={tile} />
          <circle cx={x + 21 + i * 21} cy={y + 99} r="3" className={dot} />
        </g>
      ))}
      {/* Daftar */}
      {[118, 136, 154].map((dy) => (
        <g key={dy}>
          <circle cx={x + 17} cy={y + dy + 2.5} r="5" className="fill-brand-50" />
          <rect x={x + 27} y={y + dy} width="28" height="5" rx="2.5" className={TEXT} />
          <rect x={x + 60} y={y + dy} width="12" height="5" rx="2.5" className="fill-brand-300" />
        </g>
      ))}
    </>
  );
}

/** Biaya website: jendela browser dengan grafik, label harga, tumpukan koin. */
function WebCostArt() {
  return (
    <Canvas>
      <Sparkle x={34} y={52} s={7} />
      <Sparkle x={284} y={150} s={5} className="fill-brand-400" />
      <g className={LIFT}>
        <Browser x={52} y={30} w={176} h={136} />
        <rect x="64" y="62" width="152" height="38" rx="8" className="fill-brand-50" />
        <rect x="74" y="71" width="64" height="7" rx="3.5" className={HEAD} />
        <rect x="74" y="83" width="44" height="4" rx="2" className={TEXT} />
        <rect x="74" y="91" width="32" height="4" rx="2" className={TEXT} />
        <rect x="168" y="72" width="38" height="18" rx="9" className="fill-brand-600" />
        {/* Grafik batang */}
        {[
          [68, 14],
          [84, 24],
          [100, 18],
          [116, 32],
        ].map(([bx, bh], i) => (
          <rect key={bx} x={bx} y={156 - bh} width="10" height={bh} rx="3" className={i === 3 ? 'fill-brand-600' : 'fill-brand-200'} />
        ))}
        <rect x="64" y="156" width="68" height="1.5" rx="0.75" className="fill-fg/10" />
        <rect x="148" y="118" width="62" height="6" rx="3" className="fill-fg/20" />
        <rect x="148" y="130" width="50" height="4" rx="2" className={TEXT} />
        <rect x="148" y="139" width="56" height="4" rx="2" className={TEXT} />
        <rect x="148" y="148" width="40" height="4" rx="2" className={TEXT} />
      </g>
      <g className={FLOAT}>
        <PriceTag transform="translate(198 20) rotate(12)" />
      </g>
      <g className={FLOAT}>
        <Coins cx={52} cy={166} />
      </g>
    </Canvas>
  );
}

/** Biaya aplikasi: ponsel, label harga, rincian biaya dengan centang, koin. */
function AppCostArt() {
  return (
    <Canvas>
      <Sparkle x={262} y={176} s={6} />
      <Sparkle x={40} y={34} s={5} className="fill-brand-400" />
      <g className={LIFT}>
        <Phone x={118} y={22} />
      </g>
      <g className={FLOAT}>
        <g transform="rotate(6 246 104)">
          <rect x="214" y="62" width="64" height="84" rx="8" className={PANEL} />
          <rect x="224" y="74" width="30" height="5" rx="2.5" className={HEAD} />
          {[88, 100, 112].map((ry) => (
            <g key={ry}>
              <rect x="224" y={ry} width="24" height="4" rx="2" className={TEXT} />
              <rect x="256" y={ry} width="12" height="4" rx="2" className={TEXT} />
            </g>
          ))}
          <path d="M224 124h44" className="stroke-fg/20" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="224" y="131" width="20" height="5" rx="2.5" className={HEAD} />
          <rect x="250" y="131" width="18" height="6" rx="3" className="fill-brand-600" />
          <Check cx={276} cy={64} />
        </g>
      </g>
      <g className={FLOAT}>
        <PriceTag transform="translate(46 46) rotate(-10)" />
      </g>
      <g className={FLOAT}>
        <Coins cx={74} cy={164} />
      </g>
    </Canvas>
  );
}

/** Perbandingan: kartu "Template" vs kartu "Custom" (kotak seleksi + kursor), lencana VS di tengah. */
function CompareArt() {
  return (
    <Canvas>
      <Sparkle x={160} y={42} s={7} />
      <g className={LIFT}>
        <g transform="rotate(-5 88 104)">
          <rect x="38" y="44" width="100" height="120" rx="12" className={PANEL} />
          <rect x="48" y="58" width="80" height="36" rx="6" className="fill-brand-100" />
          <path d="M54 94l14-16 10 10 7-7 15 13Z" className="fill-brand-300" />
          <circle cx="116" cy="68" r="4" className="fill-brand-300" />
          <rect x="48" y="102" width="56" height="6" rx="3" className={HEAD} />
          <rect x="48" y="114" width="72" height="4" rx="2" className={TEXT} />
          <rect x="48" y="122" width="60" height="4" rx="2" className={TEXT} />
          {[48, 76, 104].map((tx) => (
            <rect key={tx} x={tx} y="134" width="24" height="18" rx="4" className="fill-brand-50" />
          ))}
          <rect x="52" y="36" width="58" height="16" rx="8" className="fill-fg" />
          <text x="81" y="47.2" fontSize="8.5" fontWeight="600" textAnchor="middle" className="fill-surface">
            Template
          </text>
        </g>
        <g transform="rotate(5 232 104)">
          <rect x="182" y="44" width="100" height="120" rx="12" className={PANEL} />
          <circle cx="202" cy="72" r="9" className="fill-brand-100" />
          <rect x="218" y="66" width="50" height="6" rx="3" className={HEAD} />
          <rect x="218" y="77" width="36" height="4" rx="2" className={TEXT} />
          {/* Bagian yang sedang dirancang: kotak seleksi putus-putus + pegangan sudut */}
          <rect x="192" y="94" width="80" height="40" rx="6" className="fill-brand-50 stroke-brand-600" strokeWidth="1.2" strokeDasharray="4 3" />
          {[
            [192, 94],
            [272, 94],
            [192, 134],
            [272, 134],
          ].map(([hx, hy]) => (
            <rect key={`${hx}-${hy}`} x={hx - 2.5} y={hy - 2.5} width="5" height="5" rx="1" className="fill-surface stroke-brand-600" strokeWidth="1.2" />
          ))}
          <rect x="200" y="104" width="40" height="5" rx="2.5" className="fill-brand-300" />
          <rect x="200" y="114" width="56" height="4" rx="2" className="fill-brand-200" />
          <rect x="200" y="122" width="30" height="4" rx="2" className="fill-brand-200" />
          <rect x="192" y="144" width="46" height="10" rx="5" className="fill-brand-600" />
          <path d="M258 126v15l4-4 3.5 6.5 3-1.5-3.5-6.2h5.5Z" className="fill-fg stroke-surface" strokeWidth="1.2" strokeLinejoin="round" />
          <rect x="203" y="36" width="58" height="16" rx="8" className="fill-brand-600" />
          <text x="232" y="47.2" fontSize="8.5" fontWeight="600" textAnchor="middle" className="fill-surface">
            Custom
          </text>
        </g>
      </g>
      <g className={FLOAT}>
        <circle cx="160" cy="106" r="20" className="fill-brand-600 stroke-surface" strokeWidth="5" />
        <text x="160" y="110.6" fontSize="13" fontWeight="700" textAnchor="middle" className="fill-surface">
          VS
        </text>
      </g>
    </Canvas>
  );
}

/** Inspirasi (website klinik/salon): halaman dengan hero & layanan, chip reservasi WhatsApp dan lokasi peta. */
function ShowcaseArt() {
  return (
    <Canvas>
      <Sparkle x={26} y={150} s={6} />
      <g className={LIFT}>
        <Browser x={36} y={28} w={196} h={148} />
        <rect x="50" y="64" width="72" height="8" rx="4" className={HEAD} />
        <rect x="50" y="76" width="54" height="8" rx="4" className={HEAD} />
        <rect x="50" y="92" width="80" height="4" rx="2" className={TEXT} />
        <rect x="50" y="100" width="64" height="4" rx="2" className={TEXT} />
        <rect x="50" y="112" width="44" height="14" rx="7" className="fill-brand-600" />
        <rect x="98" y="112" width="32" height="14" rx="7" className={PANEL} />
        {/* Foto hero: cermin + kilau + daun */}
        <rect x="142" y="60" width="78" height="68" rx="10" className="fill-brand-100" />
        <circle cx="181" cy="92" r="21" className="fill-surface/80" />
        <Sparkle x={181} y={92} s={11} className="fill-brand-600" />
        <Sparkle x={203} y={72} s={5} className="fill-brand-400" />
        <path d="M150 126q6-18 24-14-6 15-24 14Z" className="fill-success/70" />
        <path d="M212 126q-4-14-18-12 4 12 18 12Z" className="fill-success/45" />
        {/* Layanan */}
        {[50, 108].map((sx) => (
          <g key={sx}>
            <rect x={sx} y="140" width="52" height="24" rx="6" className="fill-fg/5" />
            <circle cx={sx + 11} cy="152" r="5" className="fill-brand-200" />
            <rect x={sx + 20} y="150" width="24" height="4" rx="2" className={TEXT} />
          </g>
        ))}
      </g>
      <g className={FLOAT}>
        <rect x="212" y="44" width="88" height="32" rx="10" className={PANEL} />
        <circle cx="228" cy="60" r="9" className="fill-success" />
        {[-3.5, 0, 3.5].map((dx) => (
          <circle key={dx} cx={228 + dx} cy="60" r="1.3" className="fill-surface" />
        ))}
        <rect x="243" y="53" width="44" height="5" rx="2.5" className={HEAD} />
        <rect x="243" y="63" width="30" height="4" rx="2" className={TEXT} />
      </g>
      <g className={FLOAT}>
        <rect x="200" y="140" width="92" height="32" rx="10" className={PANEL} />
        <path d="M216 147a7 7 0 0 1 7 7c0 5-7 11-7 11s-7-6-7-11a7 7 0 0 1 7-7Z" className="fill-brand-600" />
        <circle cx="216" cy="154" r="2.5" className="fill-surface" />
        <rect x="231" y="149" width="48" height="5" rx="2.5" className={HEAD} />
        <rect x="231" y="159" width="34" height="4" rx="2" className={TEXT} />
      </g>
    </Canvas>
  );
}

/** Aplikasi: jendela browser di belakang, ponsel di depan. */
function AppArt() {
  return (
    <Canvas>
      <Sparkle x={274} y={46} s={7} />
      <Sparkle x={34} y={168} s={5} className="fill-brand-400" />
      <g className={LIFT}>
        <Browser x={34} y={40} w={172} h={124} />
        <rect x="46" y="74" width="70" height="7" rx="3.5" className={HEAD} />
        <rect x="46" y="86" width="56" height="4" rx="2" className={TEXT} />
        <rect x="46" y="94" width="62" height="4" rx="2" className={TEXT} />
        <rect x="46" y="106" width="40" height="13" rx="6.5" className="fill-brand-600" />
        <rect x="46" y="128" width="64" height="24" rx="6" className="fill-brand-50" />
        <rect x="118" y="74" width="40" height="78" rx="8" className="fill-brand-100" />
      </g>
      <g className={FLOAT}>
        <Phone x={176} y={30} />
        <Check cx={258} cy={34} r={10} />
      </g>
    </Canvas>
  );
}

/** Panduan umum: lembar daftar periksa dengan pita penanda. */
function GuideArt() {
  return (
    <Canvas>
      <Sparkle x={70} y={46} s={7} />
      <Sparkle x={256} y={160} s={5} className="fill-brand-400" />
      <g className={LIFT}>
        <rect x="96" y="34" width="112" height="148" rx="12" transform="rotate(-6 152 108)" className="fill-brand-100" />
        <rect x="104" y="26" width="112" height="148" rx="12" className={PANEL} />
        <path d="M186 26h16v26l-8-6-8 6Z" className="fill-brand-600" />
        <rect x="118" y="44" width="56" height="7" rx="3.5" className={HEAD} />
        <rect x="118" y="56" width="40" height="4" rx="2" className={TEXT} />
        {[78, 100, 122, 144].map((cy, i) =>
          i < 2 ? (
            <g key={cy}>
              <Check cx={124} cy={cy} r={6} />
              <rect x="136" y={cy - 2.5} width={i === 0 ? 60 : 48} height="5" rx="2.5" className={TEXT} />
            </g>
          ) : (
            <g key={cy}>
              <circle cx="124" cy={cy} r="5.5" className="fill-none stroke-line-strong" strokeWidth="1.2" />
              <rect x="136" y={cy - 2.5} width={i === 2 ? 56 : 40} height="5" rx="2.5" className={TEXT} />
            </g>
          ),
        )}
      </g>
    </Canvas>
  );
}

const ART: Record<CoverKind, () => ReactNode> = {
  webCost: WebCostArt,
  appCost: AppCostArt,
  compare: CompareArt,
  showcase: ShowcaseArt,
  app: AppArt,
  guide: GuideArt,
};

export function CoverArt({ kind }: { kind: CoverKind }) {
  const Art = ART[kind];
  return <Art />;
}
