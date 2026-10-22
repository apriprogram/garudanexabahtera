// Tabel perbandingan (src/content/pricing.ts) sebagai <table> asli di dalam kartu datar. Di HP tabel bisa digeser ke
// samping DI DALAM kartunya (halaman tidak pernah bergulir horizontal, design.md), kolom label tetap terlihat.
import React from 'react';
import { Link } from 'react-router-dom';
import type { ComparisonTable as ComparisonTableData } from '../../../content/pricing';

interface ComparisonTableProps {
  table: ComparisonTableData;
  /** Keterangan tabel untuk pembaca layar (dan judul visual bila `showCaption`). */
  caption: string;
  showCaption?: boolean;
  /** Kolom pilihan yang disorot (indeks kolom isi, mulai 0). */
  highlight?: number;
  className?: string;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ table, caption, showCaption = false, highlight, className = '' }) => (
  <div className={`card-flat overflow-hidden ${className}`}>
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${caption} (bisa digeser ke samping)`}>
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px] sm:text-[15px]">
        <caption className={showCaption ? 'px-5 pt-5 text-left text-sm font-semibold text-fg sm:px-6' : 'sr-only'}>{caption}</caption>
        <thead>
          <tr>
            <td className="sticky left-0 z-10 w-[24%] bg-surface px-4 py-4 sm:px-6" />
            {table.columns.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={`px-4 py-4 align-bottom text-[13px] font-semibold text-fg sm:px-5 sm:text-base ${
                  index === highlight ? 'bg-brand-50/70 text-primary' : ''
                }`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.label} className="border-t border-line">
              <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-3.5 align-top font-medium text-fg sm:px-6 sm:py-4">
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <td
                  key={`${row.label}-${index}`}
                  className={`px-4 py-3.5 align-top leading-relaxed text-muted sm:px-5 sm:py-4 ${index === highlight ? 'bg-brand-50/70' : ''}`}
                >
                  {cell.href ? (
                    <Link to={cell.href} className={`btn btn-sm ${index === highlight ? 'btn-primary' : 'btn-outline'}`}>
                      {cell.text}
                    </Link>
                  ) : (
                    cell.text
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ComparisonTable;
