// The router keeps the window scroll between pages; the project pages are long, so a page opened from a link (a
// document from the middle of the project page, the project after a revision request) starts at the top. Back /
// forward (POP) keeps the browser's position.
import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function useScrollReset() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useLayoutEffect(() => {
    if (type !== 'POP') window.scrollTo({ top: 0 });
  }, [pathname, type]);
}
