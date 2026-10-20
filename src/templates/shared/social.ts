// Daftar ikon media sosial untuk footer template (dipisah dari ./icons agar file komponen hanya mengekspor komponen).
import { Facebook, Instagram, Linkedin, Youtube, type LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import { TikTokIcon, type IconProps } from './icons';

/** Kunci field footer → label + ikon. Urutan = urutan tampil. */
export const SOCIAL_FIELDS: { key: string; label: string; Icon: LucideIcon | ComponentType<IconProps> }[] = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
];
