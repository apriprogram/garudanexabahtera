// Tombol bagikan tulisan: WhatsApp, Facebook, X (tab baru) dan salin tautan dengan pemberitahuan (role="status").
// Semua memakai URL kanonis di domain pembeli (postCanonicalUrl), bukan alamat yang sedang dibuka (pratinjau /situs/:id
// tetap membagikan https://{domain}/berita/{slug}).
import { Check, Facebook, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WhatsAppIcon, XIcon } from '../icons';
import { postShareLinks } from './model';
import type { PostTheme } from './theme';

type CopyState = 'idle' | 'copied' | 'failed';

const PILL = 'inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors';

export function PostShare({ url, title, theme }: { url: string; title: string; theme: PostTheme }) {
  const [copied, setCopied] = useState<CopyState>('idle');
  const links = postShareLinks(url, title);

  useEffect(() => {
    if (copied !== 'copied') return;
    const timer = window.setTimeout(() => setCopied('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  };

  const targets = [
    { key: 'whatsapp', label: 'WhatsApp', href: links.whatsapp, icon: <WhatsAppIcon className="h-4 w-4" /> },
    { key: 'facebook', label: 'Facebook', href: links.facebook, icon: <Facebook aria-hidden className="h-4 w-4" /> },
    { key: 'x', label: 'X', href: links.x, icon: <XIcon className="h-3.5 w-3.5" /> },
  ];

  return (
    <div data-post-share="" className="flex flex-col gap-3 @xl:flex-row @xl:flex-wrap @xl:items-center">
      <p className={`text-[14px] font-semibold ${theme.heading}`}>Bagikan</p>
      <ul className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <li key={t.key}>
            <a href={t.href} target="_blank" rel="noopener noreferrer" className={`${PILL} ${theme.filterOff}`}>
              {t.icon}
              <span>
                {t.label}
                <span className="sr-only"> (bagikan di tab baru)</span>
              </span>
            </a>
          </li>
        ))}
        <li>
          <button type="button" onClick={copy} className={`${PILL} ${theme.filterOff}`}>
            {copied === 'copied' ? <Check aria-hidden className="h-4 w-4" /> : <Link2 aria-hidden className="h-4 w-4" />}
            Salin tautan
          </button>
        </li>
      </ul>
      <p role="status" className={`min-w-0 text-[13.5px] [overflow-wrap:anywhere] ${theme.muted}`}>
        {copied === 'copied' ? 'Tautan disalin.' : copied === 'failed' ? `Tautan belum bisa disalin otomatis. Salin manual: ${url}` : ''}
      </p>
    </div>
  );
}
