'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FiMenu, FiX, FiActivity, FiLogOut } from 'react-icons/fi';
import Logo from '@/components/ui/Logo';
import { LinkButton } from '@/components/ui/Button';
import { useMotion } from '@/lib/motion';
import { supabase } from '@/lib/supabase';
import { logout } from '@/lib/api';

const LINKS = [
  { href: '/#explore', label: 'Explore', match: '/__explore' },
  { href: '/dashboard', label: 'Analysis Workspace', match: '/dashboard' },
  { href: '/globe', label: 'Biodiversity', match: '/globe' },
  { href: '/about', label: 'Research', match: '/about' },
  { href: '/help', label: 'Documentation', match: '/help' },
];

export function MotionToggle() {
  const { reduced, setPref } = useMotion();
  return (
    <button
      type="button"
      onClick={() => setPref(reduced ? 'full' : 'reduced')}
      aria-pressed={reduced}
      className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-mute transition hover:border-line-strong hover:text-ink"
      title="Toggle reduced motion"
    >
      <FiActivity aria-hidden />
      <span>{reduced ? 'Motion reduced' : 'Reduce motion'}</span>
    </button>
  );
}

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(0);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(Math.min(1, window.scrollY / 240));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)).catch(() => setSignedIn(false));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    menuRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-[max(1rem,env(safe-area-inset-left))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-7xl items-center justify-between rounded-full border px-4 py-2.5 transition-[background,border-color,box-shadow] duration-500 sm:px-5"
        style={{
          background: `rgba(6, 21, 37, ${0.15 + scrolled * 0.7})`,
          borderColor: `rgba(140, 166, 185, ${0.06 + scrolled * 0.12})`,
          backdropFilter: `blur(${4 + scrolled * 10}px)`,
          boxShadow: scrolled > 0.5 ? '0 20px 50px -30px rgba(0,0,0,0.9)' : 'none',
        }}
      >
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = pathname === l.match;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative rounded-full px-3.5 py-2 text-sm transition-colors ${active ? 'text-ink' : 'text-mute hover:text-ink'}`}
                >
                  {l.label}
                  <span
                    className={`absolute inset-x-3.5 -bottom-0.5 h-px origin-left bg-biolum transition-transform duration-500 ease-[var(--ease-abyss)] ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          <MotionToggle />
          {signedIn === false && (
            <Link href="/login" className="link-underline text-sm text-mute hover:text-ink">Sign in</Link>
          )}
          {signedIn && (
            <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-danger">
              <FiLogOut aria-hidden /> Logout
            </button>
          )}
          <LinkButton href="/upload" magnetic className="!px-5 !py-2 text-sm">Launch Analysis</LinkButton>
        </div>

        <button
          className="rounded-full p-2 text-ink lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className="panel mx-auto mt-2 max-w-7xl p-4 lg:hidden"
          style={{ animation: 'rise 0.45s var(--ease-abyss) both' }}
        >
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block rounded-xl px-3 py-3 text-base text-ink hover:bg-white/5">{l.label}</Link>
              </li>
            ))}
            <li>
              {signedIn ? (
                <button onClick={handleLogout} className="block w-full rounded-xl px-3 py-3 text-left text-base text-mute hover:bg-white/5">Logout</button>
              ) : (
                <Link href="/login" className="block rounded-xl px-3 py-3 text-base text-mute hover:bg-white/5">Sign in</Link>
              )}
            </li>
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <MotionToggle />
            <LinkButton href="/upload" className="!px-5 !py-2 text-sm">Launch Analysis</LinkButton>
          </div>
        </div>
      )}
    </header>
  );
}
