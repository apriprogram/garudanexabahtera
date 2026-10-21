// A4 preview of a DocModel (screen + print). Always paper-white, also inside the dark admin theme.
// PLACEHOLDER (foundation): one continuous page with kop, blocks, signatures and footer. The engine owner adds the
// real page layout (page breaks, "Halaman x dari y" per page, print CSS); keep the props stable.
import type { FC, ReactNode } from 'react';
import { LogoMark } from '../../../components/ui/LogoMark';
import type { Block, DocModel, SignatureSlot, TextRun } from './model';

const ALIGN: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify' };

const runs = (items: TextRun[]): ReactNode =>
  items.map((run, i) => (
    <span key={i} className={`${run.bold ? 'font-semibold' : ''} ${run.italic ? 'italic' : ''}`}>
      {run.text}
    </span>
  ));

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const size = block.level === 1 ? 'text-[15px] font-bold' : block.level === 2 ? 'mt-4 text-[13px] font-semibold' : 'mt-3 text-[12px] font-semibold';
      return <p className={`${size} ${ALIGN[block.align ?? 'left']}`}>{block.text}</p>;
    }
    case 'paragraph':
      return <p className={`mt-1.5 ${ALIGN[block.align ?? 'left']}`}>{runs(block.runs)}</p>;
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag className={`mt-1.5 space-y-0.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item, i) => (
            <li key={i}>{runs(item)}</li>
          ))}
        </ListTag>
      );
    }
    case 'table':
      return (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                {block.columns.map((col, i) => (
                  <th key={i} className="border border-line bg-alt px-2 py-1 text-left font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border border-line px-2 py-1 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'keyValue':
      return (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          {block.rows.map((row, i) => (
            <div key={i} className="contents">
              <dt className="text-muted">{row.label}</dt>
              <dd>: {row.value}</dd>
            </div>
          ))}
        </dl>
      );
    case 'spacer':
      return <div style={{ height: block.size ?? 12 }} aria-hidden />;
    case 'pageBreak':
      return <hr className="my-6 border-dashed border-line print:break-after-page" />;
    case 'meteraiBox':
      return (
        <div className="mt-4 flex h-16 w-28 items-center justify-center border border-dashed border-line-strong text-[10px] text-subtle">e-Meterai</div>
      );
  }
}

function SignatureView({ slot }: { slot: SignatureSlot }) {
  return (
    <div className="text-center">
      <p className="font-semibold">{slot.label}</p>
      <p>{slot.organization}</p>
      <div className="flex h-20 items-center justify-center">
        {slot.image_src ? <img src={slot.image_src} alt={`Tanda tangan ${slot.signer_name}`} className="max-h-16" /> : null}
      </div>
      <p className="font-semibold underline">{slot.signer_name || '(.............................)'}</p>
      {slot.signer_title && <p>{slot.signer_title}</p>}
      {slot.signed_at && <p className="mt-1 text-[10px] text-subtle">Ditandatangani secara elektronik {slot.signed_at}</p>}
    </div>
  );
}

/** A4 page look of a document model. */
export const DocumentPreview: FC<{ model: DocModel; className?: string }> = ({ model, className = '' }) => {
  const { company } = model.kop;
  const contact = [company.address, company.city, company.phone, company.email, company.website].filter(Boolean).join(' · ');
  return (
    <article
      aria-label={`Pratinjau ${model.meta.title}`}
      className={`mx-auto w-full max-w-[210mm] bg-white px-[7%] py-[6%] text-[12px] leading-relaxed text-fg ring-1 ring-line print:ring-0 ${className}`}
    >
      <header className="flex items-center gap-3 border-b-2 border-primary pb-3">
        <LogoMark className="h-9 text-primary" />
        <div className="min-w-0">
          <p className="text-[14px] font-bold">{company.name}</p>
          {contact && <p className="text-[10px] text-muted">{contact}</p>}
        </div>
      </header>
      <div className="mt-5">
        {model.blocks.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </div>
      {model.signatures.length > 0 && (
        <div className={`mt-8 grid gap-6 ${model.signatures.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {model.signatures.map((slot) => (
            <SignatureView key={slot.party} slot={slot} />
          ))}
        </div>
      )}
      <footer className="mt-10 flex justify-between border-t border-line pt-2 text-[10px] text-subtle">
        <span>{model.footer.text}</span>
        <span>Halaman 1 dari 1</span>
      </footer>
    </article>
  );
};
