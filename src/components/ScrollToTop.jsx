import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls the window back to the top whenever the route changes so users
// don't land mid-page after navigating from a long list.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [pathname]);
  return null;
}
