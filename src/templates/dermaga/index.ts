import type { TemplateDefinition } from '../types';
import Dermaga from './Dermaga';
import { dermagaContent } from './defaultContent';
import { dermagaSections } from './schema';

/** Dermaga — company profile ekspor-impor umum & freight forwarding dengan hero rute di atas foto terminal, layanan bernomor, pita pasar & Incoterm, proses kerja, dan formulir penawaran ke WhatsApp (demo: PT Lintas Dermaga Nusantara, Surabaya, fiktif). */
export const dermaga: TemplateDefinition = {
  code: 'dermaga',
  name: 'Dermaga',
  sections: dermagaSections,
  defaultContent: dermagaContent,
  Component: Dermaga,
};
