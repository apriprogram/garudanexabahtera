// Footer Pesiar: strip foto panorama SELEBAR LAYAR (21:6 di layar lebar, maks. 520px tinggi; 2:1 di HP; dimuat lambat;
// satu-satunya foto parallax di halaman) yang melebur ke pita HIJAU TUA. Lalu empat kolom: logo + deskripsi + catatan
// kecil (1-5), Menu (6-7), Kontak (8-10), Media sosial (11-12, hanya yang diisi, tautan teks ↗). Bilah bawah: hak cipta
// otomatis + tagline (sisi kanan memberi ruang tombol WhatsApp yang melayang).
import { ArrowUpRight } from 'lucide-react';
import { ActionLink } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { SECTION_ANCHOR, hasImage, mailHref, telHref, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { Logo } from './Header';
import { displayPhone, type PesiarModel } from './model';
import { PESIAR_PHOTOS } from './photos';
import { C, WRAP } from './styles';

const COL_TITLE = `text-[13px] font-medium ${C.onDeepMuted}`;
const COL_LINK =
  'inline-flex min-h-11 items-center gap-1.5 text-[15px] text-[#F5EFE6] underline decoration-transparent underline-offset-[6px] transition-colors hover:decoration-[#F5EFE6]/70 [overflow-wrap:anywhere]';

export function Footer({ m }: { m: PesiarModel }) {
  const { footer, contact } = m;
  const { preview } = useTemplateRuntime();
  const description = text(footer, 'description');
  const note = text(footer, 'note');
  const image = text(footer, 'image');
  const copyright = text(footer, 'copyright') || `© ${m.year} ${m.companyName}`;
  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const tel = telHref(phone);
  const mail = mailHref(email);

  return (
    // Tujuan tautan "#footer" (data-tpl-section + id di situs live), tetap landmark <footer>
    <footer data-tpl-section="footer" id={preview ? undefined : SECTION_ANCHOR.footer} data-tpl-tone="inverse" className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+72px)] bg-[#17332B] text-[#F5EFE6]">
      {hasImage(image) && (
        <div className="relative">
          <KitPhoto
            src={image}
            alt={PESIAR_PHOTOS.alt(image, `Pemandangan pantai, ${m.companyName}`)}
            // Di HP kotak 2:1 memotong foto 21:6 (cover + parallax) → tampil ±2× lebar layar; tanpa ini terpilih file 800w yang buram
            sizes="(max-width: 767px) 200vw, 100vw"
            parallax={8}
            fallback="none"
            // 21:6, tapi maks. 520px tinggi: di layar ≥ 1820px strip tidak terus meninggi (file 1920w tidak makin diperbesar).
            // w-full WAJIB: tanpa lebar pasti, max-height dipindahkan ke lebar lewat aspect-ratio (strip jadi 1820px saja).
            className="aspect-[2/1] w-full @3xl:aspect-[21/6] @3xl:max-h-[520px]"
          />
          <div aria-hidden className="ps-pano-fade pointer-events-none absolute inset-0" />
        </div>
      )}
      <div className={`${WRAP} pb-8 ${hasImage(image) ? 'pt-10 @3xl:pt-12' : 'pt-14 @3xl:pt-20'}`}>
        <div className="grid gap-x-8 gap-y-10 @2xl:grid-cols-2 @3xl:gap-y-12 @5xl:grid-cols-12 @7xl:gap-x-12">
          <div className="min-w-0 @2xl:col-span-2 @5xl:col-span-5">
            <ActionLink action={{ kind: 'section', target: 'hero' }} className="inline-flex min-h-11 items-center" aria-label={`${m.companyName}, ke awal halaman`}>
              <Logo m={m} tone="dark" />
            </ActionLink>
            {description && <p className={`mt-5 max-w-[46ch] text-[15px] leading-relaxed ${C.onDeepMuted}`}>{description}</p>}
            {note && <p className={`mt-4 max-w-[64ch] text-balance text-[13px] leading-snug ${C.onDeepMuted}`}>{note}</p>}
          </div>

          {m.nav.length > 0 && (
            <nav aria-label="Tautan footer" className="min-w-0 @5xl:col-span-2 @5xl:col-start-7">
              <p className={COL_TITLE}>Menu</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6">
                {m.nav.map((item) => (
                  <li key={item.key}>
                    <ActionLink action={{ kind: 'section', target: item.key }} className={COL_LINK}>
                      {item.label}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {(tel || mail || m.waAction) && (
            <div className="min-w-0 @5xl:col-span-2">
              <p className={COL_TITLE}>Kontak</p>
              <ul className="mt-3 grid gap-0.5">
                {tel && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: tel }} className={COL_LINK}>
                      {displayPhone(phone)}
                    </ActionLink>
                  </li>
                )}
                {m.waAction && (
                  <li>
                    <ActionLink action={m.waAction} className={COL_LINK}>
                      WhatsApp
                    </ActionLink>
                  </li>
                )}
                {mail && (
                  <li>
                    <ActionLink action={{ kind: 'external', href: mail }} className={COL_LINK}>
                      {email}
                    </ActionLink>
                  </li>
                )}
              </ul>
            </div>
          )}

          {m.socials.length > 0 && (
            <div className="min-w-0 @5xl:col-span-2">
              <p className={COL_TITLE}>Media sosial</p>
              <ul className="mt-3 flex flex-wrap gap-x-6 @5xl:grid @5xl:gap-0.5">
                {m.socials.map((s) => (
                  <li key={s.key}>
                    <ActionLink action={{ kind: 'external', href: s.href }} className={COL_LINK}>
                      {s.label}
                      <ArrowUpRight aria-hidden className="h-4 w-4 text-[#F5EFE6]/60" />
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Ruang kanan untuk tombol WhatsApp yang melayang — tagline tidak tertutup: HP 52px (+ tepi 20px; tombol 48px @ 16px),
            576–767px 96px dari tepi (situs ≥ 640px: 56px @ 32px), ≥ 768px 72px + tepi 32px */}
        <div className={`mt-12 flex flex-col gap-2 border-t border-[#F5EFE6]/15 pt-6 pr-13 text-[13px] @xl:pr-19 @2xl:pr-16 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:pr-[72px] ${C.onDeepMuted}`}>
          <p>{copyright}</p>
          {m.tagline && <p>{m.tagline}</p>}
        </div>
      </div>
    </footer>
  );
}
