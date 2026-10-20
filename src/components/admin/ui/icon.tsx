import { cloneElement, createElement, isValidElement, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { cn } from './cn';

/** Ikon boleh berupa elemen (<Plus />) atau komponen (Plus). */
export type IconLike = ReactNode | ComponentType<{ className?: string; strokeWidth?: number }>;

/** Render ikon lucide dengan ukuran & stroke standar (1.75). */
export function renderIcon(icon: IconLike, className?: string): ReactNode {
  if (!icon) return null;
  if (isValidElement(icon)) {
    const el = icon as ReactElement<{ className?: string; strokeWidth?: number }>;
    return cloneElement(el, {
      className: cn(className, el.props.className),
      strokeWidth: el.props.strokeWidth ?? 1.75,
      'aria-hidden': true,
    } as Record<string, unknown>);
  }
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)) {
    return createElement(icon as ComponentType<{ className?: string; strokeWidth?: number }>, {
      className,
      strokeWidth: 1.75,
      'aria-hidden': true,
    } as Record<string, unknown>);
  }
  return icon as ReactNode;
}
