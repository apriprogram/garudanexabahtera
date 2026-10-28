// Ilustrasi ASLI MomKid (bukan unduhan clip-art): doodle garis tinta 2,2px berujung bulat di atas bidang pastel
// berbentuk gumpalan lembut, viewBox 48×48. Warna garis = currentColor; warna gumpalan lewat kelas `blob` (mis.
// "fill-[#DDF3EA]"); `blob=""` → tanpa gumpalan. Selalu dekoratif (aria-hidden): teks di sebelahnya yang bermakna.
import type { DoodleName } from './icons';

/** Gumpalan lembut di belakang garis */
const BLOB = 'M24 4.5c10.6 0 19.5 7.4 19.5 18.6 0 11.7-8.4 20.4-19.9 20.4C12.4 43.5 4.5 35.6 4.5 24.4 4.5 12.9 13.2 4.5 24 4.5z';

const LINE = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const DOT = { fill: 'currentColor' } as const;

function Lines({ name }: { name: DoodleName }) {
  switch (name) {
    case 'heart':
      return <path {...LINE} d="M24 35s-11-6.4-11-14.2a6.1 6.1 0 0 1 11-3.6 6.1 6.1 0 0 1 11 3.6C35 28.6 24 35 24 35z" />;
    case 'star':
      return <path {...LINE} d="M24 13l3.23 7.55 8.18.74-6.18 5.41 1.82 8.01L24 30.5l-7.05 4.21 1.82-8.01-6.18-5.41 8.18-.74z" />;
    case 'moon':
      return (
        <>
          <path {...LINE} d="M29.5 13.5a11 11 0 1 0 6 18.2A9 9 0 0 1 29.5 13.5z" />
          <path {...DOT} d="M33 16.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" />
        </>
      );
    case 'sparkle':
      return <path {...LINE} d="M24 12c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" />;
    case 'stroller':
      return (
        <>
          <path {...LINE} d="M13 23h22a11 11 0 0 1-11 9 11 11 0 0 1-11-9z" />
          <path {...LINE} d="M13 23a11 11 0 0 1 11-11v11M35 23l3.5-6.5H41" />
          <circle {...LINE} cx="18" cy="36" r="2.6" />
          <circle {...LINE} cx="30" cy="36" r="2.6" />
        </>
      );
    case 'bottle':
      return (
        <>
          <path {...LINE} d="M21.5 16v-2.5a2.5 2.5 0 0 1 5 0V16" />
          <path {...LINE} d="M19 16h10v4H19z" />
          <path {...LINE} d="M20 20h8a2 2 0 0 1 2 2v12a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V22a2 2 0 0 1 2-2zM22.5 26h3M22.5 30.5h3" />
        </>
      );
    case 'footprints':
      return (
        <>
          <path {...LINE} d="M17.5 22.5c2.5 0 3.8 2.6 3.8 6.2s-1.7 6.3-3.8 6.3-3.8-2.7-3.8-6.3 1.3-6.2 3.8-6.2z" />
          <path {...LINE} d="M30.5 14.5c2.5 0 3.8 2.6 3.8 6.2s-1.7 6.3-3.8 6.3-3.8-2.7-3.8-6.3 1.3-6.2 3.8-6.2z" />
          <circle {...DOT} cx="15" cy="18.6" r="1.25" />
          <circle {...DOT} cx="17.8" cy="17.6" r="1.25" />
          <circle {...DOT} cx="20.5" cy="18.6" r="1.25" />
          <circle {...DOT} cx="28" cy="10.6" r="1.25" />
          <circle {...DOT} cx="30.8" cy="9.6" r="1.25" />
          <circle {...DOT} cx="33.5" cy="10.6" r="1.25" />
        </>
      );
    case 'swaddle':
      return (
        <>
          <circle {...LINE} cx="24" cy="17" r="5" />
          <path {...LINE} d="M16 26c0-2.2 3.6-3.5 8-3.5s8 1.3 8 3.5v4.5c0 5-3.6 7.5-8 7.5s-8-2.5-8-7.5z" />
          <path {...LINE} d="M16.5 28.5c4.5 3.2 11 3 15-1" />
        </>
      );
    case 'rattle':
      return (
        <>
          <circle {...LINE} cx="20" cy="19" r="7" />
          <path {...LINE} d="M25 24l8 8" />
          <circle {...LINE} cx="35" cy="34" r="2.6" />
          <path {...DOT} d="M18 17.5a1.4 1.4 0 1 1 0 .01z" />
        </>
      );
    case 'drop':
      return (
        <>
          <path {...LINE} d="M24 11.5c5 7 9 11.5 9 16a9 9 0 0 1-18 0c0-4.5 4-9 9-16z" />
          <path {...LINE} d="M20 29a4.5 4.5 0 0 0 3.5 3.5" />
        </>
      );
    case 'shield':
      return (
        <>
          <path {...LINE} d="M24 11l11 4v8c0 7.5-4.7 12.5-11 15-6.3-2.5-11-7.5-11-15v-8z" />
          <path {...LINE} d="M24 30s-5-3-5-6.5a2.6 2.6 0 0 1 5-1.3 2.6 2.6 0 0 1 5 1.3C29 27 24 30 24 30z" />
        </>
      );
    case 'stethoscope':
      return (
        <>
          <path {...LINE} d="M16 12v7a6 6 0 0 0 12 0v-7M14 12h4M26 12h4" />
          <path {...LINE} d="M22 25v3.5a6.5 6.5 0 0 0 13 0V26" />
          <circle {...LINE} cx="35" cy="23.4" r="2.6" />
        </>
      );
    case 'bed':
      return (
        <>
          <path {...LINE} d="M11 34V15M11 28h26v6M37 28v-3.5a4.5 4.5 0 0 0-4.5-4.5H21v8" />
          <path {...LINE} d="M14 20.5h4a2 2 0 0 1 0 4h-4z" />
        </>
      );
    case 'book':
      return <path {...LINE} d="M24 16c-3-2-7-2.5-11-2v19c4-.5 8 0 11 2 3-2 7-2.5 11-2V14c-4-.5-8 0-11 2zM24 16v19" />;
    case 'pin':
      return (
        <>
          <path {...LINE} d="M24 37s-9-8.5-9-15a9 9 0 0 1 18 0c0 6.5-9 15-9 15z" />
          <circle {...LINE} cx="24" cy="22" r="3" />
        </>
      );
    case 'phone':
      return <path {...LINE} d="M17 12.5h3.5l2 5.5-2.7 1.8a14 14 0 0 0 8.4 8.4l1.8-2.7 5.5 2v3.5a3 3 0 0 1-3 3A19.5 19.5 0 0 1 14 15.5a3 3 0 0 1 3-3z" />;
    case 'clock':
      return (
        <>
          <circle {...LINE} cx="24" cy="24" r="11" />
          <path {...LINE} d="M24 18v6l4 3" />
        </>
      );
    case 'chat':
      return (
        <>
          <path {...LINE} d="M13 16.5a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4V26a4 4 0 0 1-4 4h-8l-6.5 5.5V30H17a4 4 0 0 1-4-4z" />
          <circle {...DOT} cx="19" cy="21.5" r="1.3" />
          <circle {...DOT} cx="24" cy="21.5" r="1.3" />
          <circle {...DOT} cx="29" cy="21.5" r="1.3" />
        </>
      );
    case 'mail':
      return <path {...LINE} d="M12 16h24v16H12zM12.5 17l11.5 8.5L35.5 17" />;
    case 'calendar':
      return <path {...LINE} d="M13 15h22v20H13zM13 21h22M19 12v6M29 12v6" />;
  }
}

/** Doodle MomKid. `blob` = kelas warna gumpalan (kosong → tanpa gumpalan). Dekoratif. */
export function Doodle({ name, blob = 'fill-[#DDF3EA]', className = 'h-12 w-12' }: { name: DoodleName; blob?: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      {blob && <path d={BLOB} className={blob} />}
      <Lines name={name} />
    </svg>
  );
}
