/** aria-describedby untuk kontrol di dalam FormField: pesan error (atau teks bantuan) + id tambahan (penghitung). */
export const describedBy = (id: string, { error, help, extra }: { error?: string; help?: boolean; extra?: string }) =>
  [error ? `${id}-error` : help ? `${id}-help` : '', extra ?? ''].filter(Boolean).join(' ') || undefined;
