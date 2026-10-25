import type { TemplateDefinition } from '../types';
import Cakrawala from './Cakrawala';
import { cakrawalaContent } from './defaultContent';
import { cakrawalaSections } from './schema';

/** Cakrawala — website sekolah SMK/SMA dengan hero slider, PPDB, berita, BKK, dan alumni (demo: SMK Cakrawala Karya, Bandung, fiktif). */
export const cakrawala: TemplateDefinition = {
  code: 'cakrawala',
  name: 'Cakrawala',
  sections: cakrawalaSections,
  defaultContent: cakrawalaContent,
  Component: Cakrawala,
};
