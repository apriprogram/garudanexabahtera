// Geometri SVG Nusaline (fungsi murni, tanpa React): bus tidur potongan samping (film), denah kursi tampak atas, dan
// lapisan pemandangan film (bintang, gunung, siluet kota, bukit & sawah, jalan, lampu jalan, terminal, rest area).
// Semua angka dalam satuan viewBox masing-masing; banyak bentuk digabung ke SATU path agar elemen SVG tetap sedikit
// (anggaran film ≤ ~150 elemen). Deterministik (tanpa Math.random): hasil sama di server, uji, dan browser.

const f = (n: number) => String(Math.round(n * 10) / 10);

/** Persegi panjang bersudut bulat sebagai data path. */
export function rr(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${f(x + q)} ${f(y)}H${f(x + w - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w)} ${f(y + q)}V${f(y + h - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w - q)} ${f(y + h)}H${f(x + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x)} ${f(y + h - q)}V${f(y + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + q)} ${f(y)}Z`;
}

/** Lingkaran sebagai data path (bisa digabung banyak dalam satu path). */
export const circle = (cx: number, cy: number, r: number): string =>
  `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

/** Pembangkit angka semu yang tetap (LCG) untuk bintang/jendela yang "acak" tapi selalu sama. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ─── Bus tidur potongan samping (viewBox 0 0 1000 270, depan di KANAN, roda menapak y = 262) ─────────────────────────

export const BUS = {
  viewBox: '0 0 1000 270',
  /** Pusat roda (belakang ganda, depan) */
  wheels: [150, 238, 676] as const,
  wheelY: 225,
  /** Bodi dengan lengkung roda (livery warna tema) */
  body: 'M30 18H722C744 18 758 26 767 41L794 96C799 106 800 114 800 124V198C800 208 794 214 784 214H717.8A42 42 0 1 0 634.2 214H283C283 192 265 176 243 176H145C123 176 105 192 105 214H28C18 214 12 208 12 198V36C12 25 19 18 30 18Z',
  /** Rok bawah lebih gelap */
  skirt: 'M12 166H800V198C800 208 794 214 784 214H717.8A42 42 0 1 0 634.2 214H283C283 192 265 176 243 176H145C123 176 105 192 105 214H28C18 214 12 208 12 198Z',
  /** Rumah roda gelap: mengisi lengkung roda bodi (sama persis dengan lengkung di `body`), latar tidak tembus */
  wells: 'M105 214C105 192 123 176 145 176H243C265 176 283 192 283 214ZM634.2 214A42 42 0 1 1 717.8 214Z',
  /** Garis neon sepanjang bodi + aksen miring di sudut belakang */
  stripe: 'M12 158H800V163H12ZM12 140H66L44 156H12Z',
  /** Lampu penanda atap (kuning) */
  markers: [70, 170, 270, 370, 470, 570, 690].map((x) => rr(x, 21, 12, 4, 2)).join(''),
  /** Bukaan potongan (kabin terlihat) */
  cut: rr(36, 32, 594, 126, 10),
  /** Lantai dek atas */
  deck: 'M36 93H630V99H36Z',
  window: rr(646, 36, 110, 106, 10),
  glare: 'M690 36H710L674 142H654Z',
  windshield: 'M764 40L790 94C794 102 795 108 795 116V142H770Z',
  /** Sopir: kepala + bahu */
  driver: `${circle(722, 86, 10)}M700 142C700 116 711 104 723 104C737 104 747 116 747 142Z`,
  mirror: 'M790 40C812 34 822 44 822 58V86H814V60C814 50 806 46 790 48Z',
  headlight: rr(786, 172, 12, 12, 3),
  beam: 'M798 174L1000 146L1000 228L798 190Z',
  tail: rr(12, 144, 6, 26, 2),
} as const;

const PODS_X = [44, 161, 278, 395, 512];
const POD_W = 110;
const TIERS = [
  { y: 38, h: 52 },
  { y: 103, h: 51 },
];
/** Kabin kosong (tingkat, indeks) dan kabin dengan lampu baca menyala */
const EMPTY = new Set(['0-2', '1-4']);
const READING = ['0-1', '1-3'];

/** Isi kabin tidur bus: bingkai kabin, kasur, bantal, kepala penumpang, selimut, lampu baca + sorotnya. */
export function busPods() {
  const frames: string[] = [];
  const mattress: string[] = [];
  const pillows: string[] = [];
  const heads: string[] = [];
  const blankets: string[] = [];
  const lamps: string[] = [];
  const cones: string[] = [];
  TIERS.forEach(({ y, h }, tier) => {
    PODS_X.forEach((x, i) => {
      const id = `${tier}-${i}`;
      const base = y + h - 12;
      frames.push(rr(x, y, POD_W, h, 8));
      mattress.push(rr(x + 6, base, POD_W - 12, 7, 3.5));
      pillows.push(rr(x + POD_W - 27, base - 9, 19, 9, 4));
      if (!EMPTY.has(id)) {
        heads.push(circle(x + POD_W - 22, base - 11, 6.4));
        blankets.push(
          `M${x + 10} ${base}C${x + 10} ${base - 13} ${x + 28} ${base - 17} ${x + 48} ${base - 14}C${x + 64} ${base - 12} ${x + 74} ${base - 18} ${x + POD_W - 31} ${base - 13}L${x + POD_W - 30} ${base}Z`,
        );
      }
      if (READING.includes(id)) {
        lamps.push(circle(x + 16, y + 8, 3.6));
        cones.push(`M${x + 13} ${y + 10}H${x + 19}L${x + 42} ${base}H${x + 2}Z`);
      }
    });
  });
  return {
    frames: frames.join(''),
    mattress: mattress.join(''),
    pillows: pillows.join(''),
    heads: heads.join(''),
    blankets: blankets.join(''),
    lamps: lamps.join(''),
    cones: cones.join(''),
  };
}

/** Jari-jari roda (5 jari, simetris di pusat) */
export function wheelSpokes(cx: number, cy: number): string {
  const out: string[] = [];
  for (let k = 0; k < 5; k += 1) {
    const a = (k * 2 * Math.PI) / 5 - Math.PI / 2;
    const b = a + 0.32;
    const c = a - 0.32;
    out.push(
      `M${f(cx + Math.cos(c) * 7)} ${f(cy + Math.sin(c) * 7)}L${f(cx + Math.cos(c + 0.12) * 18)} ${f(cy + Math.sin(c + 0.12) * 18)}L${f(cx + Math.cos(b - 0.12) * 18)} ${f(cy + Math.sin(b - 0.12) * 18)}L${f(cx + Math.cos(b) * 7)} ${f(cy + Math.sin(b) * 7)}Z`,
    );
  }
  return out.join('');
}

// ─── Ilustrasi kabin tidur (viewBox 0 0 600 400): dua kabin bertingkat dilihat dari lorong, kepala di KANAN ────────────

export const BERTH = {
  upper: rr(36, 34, 528, 152, 18),
  lower: rr(36, 214, 528, 152, 18),
  windows: `${rr(236, 54, 236, 60, 12)}${rr(236, 234, 236, 60, 12)}`,
  stars: [circle(258, 70, 1.6), circle(300, 64, 1.2), circle(446, 72, 1.4), circle(270, 250, 1.4), circle(420, 246, 1.6), circle(452, 262, 1.1)].join(''),
  /** Jejak lampu kendaraan di luar jendela (neon & kuning) */
  trails: [rr(250, 98, 110, 3, 1.5), rr(372, 104, 86, 3, 1.5), rr(250, 278, 96, 3, 1.5), rr(356, 284, 102, 3, 1.5)].join(''),
  trailsWarm: `${rr(286, 92, 60, 2, 1)}${rr(300, 272, 70, 2, 1)}`,
  lampOn: circle(70, 58, 6),
  /** Pendar lampu baca yang menyala */
  glow: circle(70, 58, 13),
  lampOff: circle(70, 238, 6),
  cone: 'M64 62H76L150 166H40Z',
  mattress: `${rr(52, 158, 496, 16, 8)}${rr(52, 338, 496, 16, 8)}`,
  pillows: `${rr(472, 136, 62, 24, 12)}${rr(472, 316, 62, 24, 12)}`,
  head: circle(492, 130, 15),
  /**
   * Selimut penumpang yang tidur telentang (kabin atas, kepala di kanan): ujung kaki terangkat, kaki rendah, pinggul,
   * dada, lalu bahu yang naik ke arah kepala
   */
  blanket: 'M64 160C64 146 70 135 82 135C93 135 97 143 110 143C162 143 214 140 254 133C286 128 312 125 338 123C380 120 418 116 446 116C463 116 473 123 476 133L478 160Z',
  /** Lengan di atas selimut: lengan baju meruncing dari bahu (kanan) ke pergelangan, lalu tangan di pinggul */
  arm: `M446 117C455 117 461 122 461 128C461 134 456 137 449 137L374 134C368 134 364 131 364 127C364 123 368 120 374 120Z${circle(354, 127, 7.5)}`,
  /** Garis lipatan selimut atas */
  blanketFolds: 'M118 151C168 149 214 146 258 140L259 143C215 149 169 152 119 154ZM290 142C326 138 360 136 392 135L392 138C360 139 327 141 291 145Z',
  /** Selimut terlipat di kabin bawah yang masih kosong */
  folded: rr(130, 314, 160, 26, 10),
  fold: rr(130, 325, 160, 3, 1.5),
  ports: `${rr(540, 70, 12, 8, 2)}${rr(540, 250, 12, 8, 2)}`,
  rods: `${rr(40, 38, 520, 3, 1.5)}${rr(40, 218, 520, 3, 1.5)}`,
  /** Tirai kabin bawah, setengah tertutup dari kiri */
  curtain: 'M38 221H118C110 258 126 298 112 338C109 350 113 358 116 364H56C46 364 38 356 38 346Z',
  curtainFolds: `${rr(58, 224, 6, 134, 3)}${rr(84, 224, 6, 130, 3)}`,
} as const;

// ─── Denah kursi tampak atas (viewBox 0 0 900 250, depan di KANAN) ───────────────────────────────────────────────────

export const DECK_SHAPES = {
  outline: 'M30 8H818C858 8 892 42 892 80V170C892 208 858 242 818 242H30C17 242 8 233 8 220V30C8 17 17 8 30 8Z',
  windshield: 'M866 36C886 70 886 180 866 214',
  aisle: 'M110 125H748',
  door: rr(776, 3, 76, 10, 3),
  driver: rr(792, 162, 56, 58, 10),
  wheel: circle(848, 191, 15),
  toilet: rr(24, 152, 70, 74, 8),
  /** Dek atas: tangga di depan (pengganti sopir & pintu) */
  stairs: `${rr(788, 92, 64, 66, 8)}M796 108H844M796 122H844M796 136H844`,
} as const;

/** Satu kursi: bantalan + sandaran di sisi belakang (kiri) — atau kasur + bantal untuk kabin tidur. */
export function seatPath(x: number, y: number, w: number, h: number, pod: boolean): string {
  if (pod) return `${rr(x, y, w, h, 10)}${rr(x + w - 24, y + 8, 15, h - 16, 5)}`;
  return `${rr(x + 7, y, w - 7, h, 7)}${rr(x, y + 3, 10, h - 6, 4)}`;
}

// ─── Lapisan film ─────────────────────────────────────────────────────────────

/** Jarak tempuh lapisan dekat (satuan bus) dari terminal asal ke terminal tujuan. Sama dengan angka di ./nusaline.css. */
export const NEAR_TRAVEL = 8000;

/** Bintang (viewBox 1600×760): dua kelompok (kecil & terang), di 62% atas langit. */
export function stars(): { small: string; bright: string } {
  const rand = seeded(29);
  const small: string[] = [];
  const bright: string[] = [];
  for (let i = 0; i < 34; i += 1) {
    const x = 40 + rand() * 1520;
    const y = 30 + rand() * rand() * 440;
    const big = i % 6 === 0;
    (big ? bright : small).push(circle(x, y, big ? 2.4 : 1.1 + rand() * 0.9));
  }
  return { small: small.join(''), bright: bright.join('') };
}

/** Pegunungan jauh (viewBox 1600×260, dasar y = 260): dua lapis. */
export const MOUNTAINS = {
  back: 'M0 260V150L120 118L230 140L360 92L470 128L600 70L720 120L820 100L930 136L1060 84L1180 126L1300 96L1430 132L1520 108L1640 124L1760 98L1880 130L2000 112V260Z',
  front: 'M0 260V196L140 170L260 188L400 160L520 186L660 166L800 190L950 168L1080 192L1220 172L1360 190L1480 176L1600 186L1740 168L1870 186L2000 176V260Z',
} as const;

/** Siluet kota (gedung bersusun) + jendela menyala; `x0..x1` lebar, `seed` agar dua kota berbeda. */
export function skyline(x0: number, x1: number, seed: number, base = 260): { blocks: string; windows: string } {
  const rand = seeded(seed);
  const blocks: string[] = [];
  const windows: string[] = [];
  let x = x0;
  while (x < x1) {
    const w = 34 + Math.floor(rand() * 46);
    const tall = rand() > 0.72;
    const h = (tall ? 120 : 46) + Math.floor(rand() * (tall ? 90 : 70));
    blocks.push(`M${x} ${base}V${base - h}H${x + w}V${base}Z`);
    if (tall && rand() > 0.4) blocks.push(`M${x + w / 2 - 2} ${base - h}V${base - h - 26}H${x + w / 2 + 2}V${base - h}Z`);
    for (let wy = base - h + 12; wy < base - 14; wy += 16) {
      for (let wx = x + 7; wx < x + w - 8; wx += 12) if (rand() > 0.62) windows.push(`M${wx} ${wy}h5v6h-5Z`);
    }
    x += w + 4 + Math.floor(rand() * 10);
  }
  return { blocks: blocks.join(''), windows: windows.join('') };
}

/** Bukit, sawah bertingkat, pohon kelapa, dan lampu desa (viewBox x −1400…3800, tinggi 200; dasar y = 200). */
export function midland(): { hills: string; hillsNear: string; terraces: string; palms: string; lights: string } {
  const rand = seeded(7);
  const hillPts: string[] = ['M-1400 200V120'];
  const nearPts: string[] = ['M-1400 200V168'];
  for (let x = -1400; x <= 3800; x += 200) {
    const top = 70 + rand() * 60;
    hillPts.push(`Q${x + 100} ${f(top)} ${x + 200} ${f(110 + rand() * 30)}`);
    nearPts.push(`Q${x + 100} ${f(140 + rand() * 18)} ${x + 200} ${f(160 + rand() * 12)}`);
  }
  hillPts.push('V200Z');
  nearPts.push('V200Z');
  const terraces: string[] = [];
  for (let x = -1300; x < 3800; x += 560) {
    for (let k = 0; k < 4; k += 1) terraces.push(`M${x + k * 14} ${178 - k * 9}Q${x + 120} ${170 - k * 9} ${x + 260 - k * 14} ${178 - k * 9}`);
  }
  const palms: string[] = [];
  for (let x = -1250; x < 3800; x += 300 + Math.floor(rand() * 220)) {
    const h = 54 + rand() * 30;
    const top = 170 - h;
    palms.push(`M${x} 172Q${x + 4} ${f(top + h / 2)} ${x + 2} ${f(top)}h3Q${x + 9} ${f(top + h / 2)} ${x + 4} 172Z`);
    palms.push(`M${x + 3} ${f(top)}q-22 -6 -34 8q16 -8 34 -4q-16 -16 -30 -12q18 0 30 8q4 -18 22 -20q-14 8 -18 20q14 -10 30 -2q-18 0 -34 2Z`);
  }
  const lights: string[] = [];
  for (let x = -1350; x < 3800; x += 90 + Math.floor(rand() * 160)) lights.push(circle(x, 176 + rand() * 14, 1.8));
  return { hills: hillPts.join(''), hillsNear: nearPts.join(''), terraces: terraces.join(''), palms: palms.join(''), lights: lights.join('') };
}

/**
 * Jalan & tepi jalan (viewBox x −1400…9400, tinggi 380; jalan dari y 300 sampai 380, roda bus menapak ± y 342):
 * garis marka, pagar pembatas, tiang lampu jalan (di sisi jauh, di belakang bus) dan kepala lampu + genangan cahaya.
 */
export function roadside(): { dashes: string; rail: string; poles: string; heads: string; pools: string } {
  const dashes: string[] = [];
  for (let x = -1400; x < 9400; x += 120) dashes.push(`M${x} 323h56v4h-56Z`);
  const poles: string[] = [];
  const heads: string[] = [];
  const pools: string[] = [];
  for (let x = -1360; x < 9400; x += 260) {
    poles.push(`M${x} 304V30h5V304Z`, `M${x + 2} 34C${x + 2} 22 ${x + 14} 18 ${x + 40} 18h18v5h-18C${x + 18} 23 ${x + 7} 26 ${x + 7} 34Z`);
    heads.push(rr(x + 52, 16, 30, 9, 4));
    pools.push(`M${x + 20} 318C${x + 40} 308 ${x + 96} 308 ${x + 116} 318C${x + 96} 328 ${x + 40} 328 ${x + 20} 318Z`);
  }
  const rail: string[] = [`M-1400 292h10800v4h-10800Z`];
  for (let x = -1400; x < 9400; x += 44) rail.push(`M${x} 292h3v12h-3Z`);
  return { dashes: dashes.join(''), rail: rail.join(''), poles: poles.join(''), heads: heads.join(''), pools: pools.join('') };
}

/**
 * Terminal/agen: kanopi panjang bertiang (atapnya mengintip di atas atap bus), dinding berjendela, papan neon dengan
 * piktogram bus + panah (rambu, tanpa tulisan/nama). Pusat x 0.
 */
export const TERMINAL = {
  roof: 'M-640 66H540L560 82H-660Z',
  posts: [-610, -390, -170, 50, 270, 490].map((x) => `M${x} 82h10V300h-10Z`).join(''),
  wall: 'M-610 190H510V300H-610Z',
  windows: [-590, -470, -350, -230, -110, 10, 130, 250, 370].map((x) => rr(x, 206, 84, 44, 4)).join(''),
  sign: rr(-130, 24, 260, 30, 8),
  /** Piktogram di papan: bodi bus + dua roda, lalu panah ke kanan */
  icon: `${rr(-50, 30, 46, 14, 4)}${circle(-40, 45, 3.6)}${circle(-15, 45, 3.6)}M10 35h22v-5l11 8-11 8v-5H10Z`,
} as const;

/**
 * Rest area: kanopi + musala berkubah dengan menara, jendela hangat, dan papan neon di atas atap bus (piktogram cangkir +
 * masjid, tanpa tulisan) agar berhentinya bus terbaca juga di HP, saat musala di luar layar. Pusat di x 0.
 */
export const REST_AREA = {
  canopy: 'M-470 86H150L166 100H-486ZM-62 54h4v32h-4ZM58 54h4v32h-4Z',
  sign: rr(-80, 24, 160, 30, 8),
  /** Cangkir + titik + masjid (kubah bawang runcing + tiang puncak di atas dinding, menara beratap runcing di kanan) */
  icon: `M-46 31h18v10a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6ZM-28 34h3a4.5 4.5 0 0 1 0 9h-3v-3h3a1.5 1.5 0 0 0 0-3h-3Z${circle(-8, 39, 2.2)}M11 47V41h24v6ZM13 41C13 36.5 16 34.5 19.5 32.5C21.5 31.3 22.7 30 23 28C23.3 30 24.5 31.3 26.5 32.5C30 34.5 33 36.5 33 41ZM22.4 25h1.2v3.5h-1.2ZM37 47V32h4v15ZM36.5 32l2.5-4.5 2.5 4.5Z`,
  posts: [-450, -260, -70, 120].map((x) => `M${x} 100h8V300h-8Z`).join(''),
  mosque: 'M440 300V210H620V300ZM456 210C456 160 604 160 604 210ZM522 150h16v14h-16ZM652 300V120h22V300ZM648 120l15 -24l15 24Z',
  /** Jendela musala + dua etalase warung di bawah kanopi (cukup tinggi agar tidak mengintip lewat lengkung roda bus) */
  windows: [rr(466, 238, 26, 40, 13), rr(517, 238, 26, 40, 13), rr(568, 238, 26, 40, 13), rr(-380, 192, 140, 40, 4), rr(-200, 192, 140, 40, 4)].join(''),
} as const;
