// id aria-describedby untuk field CMS: pesan error (atau teks bantuan) + penghitung karakter.
export const describedBy = (id: string, { help, error, counter }: { help?: string; error?: string; counter?: boolean }) =>
  [error ? `${id}-error` : help ? `${id}-help` : '', counter ? `${id}-count` : ''].filter(Boolean).join(' ') || undefined;
