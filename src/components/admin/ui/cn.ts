import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Gabung kelas Tailwind; kelas belakangan menang bila bentrok (tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Cincin fokus keyboard standar panel admin. */
export const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-adm-surface';

/** Cincin fokus tanpa offset (untuk elemen yang sudah punya garis). */
export const FOCUS_INSET = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt';
