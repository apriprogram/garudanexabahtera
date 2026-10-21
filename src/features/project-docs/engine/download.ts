// Browser download of a generated file (PDF / DOCX export).

/** `name` with `ext` appended unless it already ends with it (case-insensitive). */
export const withExtension = (name: string, ext: string) => (name.toLowerCase().endsWith(ext) ? name : `${name}${ext}`);

/** Saves `blob` as `fileName` through a temporary link. */
export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked later: some browsers start the download asynchronously
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
