import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { scrollToSection } from './scroll';

type SmartLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

/** Hash dari menu admin bisa berisi `%` tak valid; jangan sampai melempar error saat render. */
const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Tautan serbaguna untuk menu publik:
 * - `#templates` / `/#templates`: gulir halus berkurva (scroll.ts) bila section ada di halaman ini, kalau tidak buka
 *   beranda di section itu (beranda melompat ke hash setelah dimuat, lihat pages/public/Home.tsx);
 * - `/rute`: navigasi SPA; `https://…`: tab baru; `mailto:` / `tel:`: tautan biasa.
 */
export const SmartLink: React.FC<SmartLinkProps> = ({ href, onClick, children, ...rest }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const value = href.trim();

  if (/^https?:\/\//i.test(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }
  if (/^(mailto|tel):/i.test(value)) {
    return (
      <a href={value} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  if (value.startsWith('#') || value.startsWith('/#')) {
    const id = safeDecode(value.slice(value.indexOf('#') + 1));
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      if (scrollToSection(id)) {
        event.preventDefault();
        // Perbarui hash tanpa menambah riwayat (tombol kembali tetap ke halaman sebelumnya)
        navigate(`${pathname}#${id}`, { replace: true, preventScrollReset: true });
      }
    };
    return (
      <Link to={`/#${id}`} onClick={handleClick} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <Link to={value || '/'} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
};

export default SmartLink;
