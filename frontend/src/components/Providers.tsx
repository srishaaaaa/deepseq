'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MotionProvider } from '@/lib/motion';

/** Watches every [data-reveal] element and adds .is-visible as it scrolls into view. */
function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.classList.add('js-ready');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    const scan = () => document.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => io.observe(el));
    scan();
    // pick up content rendered after async loads
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <RevealObserver />
      {children}
    </MotionProvider>
  );
}
