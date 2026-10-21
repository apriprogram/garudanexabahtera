// Signature images of the open document (private pd_file downloads with the login token) as object URLs keyed by
// their `pdfile:sig:<id>` reference; old URLs are revoked when the set changes or the editor closes.
import { useEffect, useState } from 'react';
import { downloadPdFile } from '../../../../features/project-docs/api';

export function useSignatureSources(refs: string[]): Record<string, string> {
  const [sources, setSources] = useState<Record<string, string>>({});
  const key = [...refs].sort().join('|');

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    Promise.all(
      key.split('|').map(async (ref) => {
        try {
          return [ref, await downloadPdFile(ref)] as const;
        } catch {
          // A missing image keeps the slot empty in the preview; signing data stays intact
          return null;
        }
      }),
    ).then((entries) => {
      const loaded = Object.fromEntries(entries.filter((e): e is readonly [string, string] => e !== null));
      if (active) setSources(loaded);
      else Object.values(loaded).forEach((url) => URL.revokeObjectURL(url));
    });
    return () => {
      active = false;
    };
  }, [key]);

  // Release the previous images when a new set arrives, and the last set on unmount
  useEffect(() => () => Object.values(sources).forEach((url) => URL.revokeObjectURL(url)), [sources]);

  return sources;
}
