// Kotak "Fakta Garuda Nexa" (/tentang, /kontak); isi dari useFactRows (field null tidak dirender).
import React from 'react';
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import { formatDateId } from '../../../seo/format';
import { useFactRows } from './useFactRows';

export const CompanyFactsCard: React.FC<{ title?: string; updated?: string; className?: string }> = ({
  title = `Fakta ${COMPANY_FACTS.name}`,
  updated,
  className = '',
}) => {
  const rows = useFactRows();
  return (
    <div className={`card-flat p-5 sm:p-7 ${className}`}>
      <p className="eyebrow">{title}</p>
      <dl className="mt-4 divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5 text-sm sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:text-[15px]">
            <dt className="text-muted">{row.label}</dt>
            <dd className="font-medium text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
      {updated && (
        <p className="mt-4 text-xs text-subtle sm:text-[13px]">
          Diperbarui <time dateTime={updated}>{formatDateId(updated)}</time>
        </p>
      )}
    </div>
  );
};

export default CompanyFactsCard;
