'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiGrid, FiUploadCloud, FiCode, FiBarChart2, FiGlobe, FiClock, FiChevronsLeft, FiChevronsRight, FiMenu, FiX, FiLogOut, FiHome, FiSettings,
} from 'react-icons/fi';
import { LogoMark } from '@/components/ui/Logo';
import ServiceStatus from '@/components/ui/ServiceStatus';
import DnaSpinner from '@/components/ui/DnaSpinner';
import { MotionToggle } from '@/components/site/SiteNav';
import { getCurrentUser, getUsername, isLoggedIn, logout } from '@/lib/api';

// Only features that genuinely exist in the app are listed here.
const NAV = [
  { href: '/dashboard', label: 'Overview', icon: FiGrid },
  { href: '/upload', label: 'New Analysis', icon: FiUploadCloud },
  { href: '/sequences', label: 'Sequence Explorer', icon: FiCode },
  { href: '/report', label: 'Classification & Abundance', icon: FiBarChart2 },
  { href: '/globe', label: 'Geographic Exploration', icon: FiGlobe },
  { href: '/history', label: 'Reports & History', icon: FiClock },
  { href: '/settings', label: 'Settings', icon: FiSettings },
];

type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Redirect to /login when there is no Supabase session (matches original page behaviour). */
  requireAuth?: boolean;
  /** remove inner padding for full-bleed canvases (globe) */
  bleed?: boolean;
};

export default function WorkspaceShell({ title, subtitle, actions, children, requireAuth = false, bleed = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem('deepseq.sidebar') === 'collapsed'); } catch {}
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await isLoggedIn().catch(() => false);
      if (!alive) return;
      setSignedIn(ok);
      if (!ok) {
        if (requireAuth) router.replace('/login');
        return;
      }
      const user = await getCurrentUser().catch(() => null);
      if (alive) setUsername(getUsername(user));
    })();
    return () => { alive = false; };
  }, [requireAuth, router]);

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem('deepseq.sidebar', c ? 'open' : 'collapsed'); } catch {}
      return !c;
    });
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navList = (compact: boolean) => (
    <ul className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              title={compact ? label : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active ? 'bg-biolum/10 text-ink' : 'text-mute hover:bg-white/[0.04] hover:text-ink'
              }`}
            >
              {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-biolum shadow-[0_0_12px_#41E8FF]" />}
              <Icon className={`shrink-0 ${active ? 'text-biolum' : ''}`} aria-hidden />
              <span className={compact ? 'sr-only' : 'truncate'}>{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const blocked = requireAuth && signedIn !== true;

  return (
    <div className="flex min-h-[100svh]">
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-[100svh] shrink-0 flex-col border-r border-line bg-midnight/70 backdrop-blur-xl transition-[width] duration-500 ease-[var(--ease-abyss)] lg:flex ${collapsed ? 'w-[76px]' : 'w-[264px]'}`}
        aria-label="Workspace"
      >
        <div className={`flex items-center gap-2.5 px-5 py-5 ${collapsed ? 'justify-center px-0' : ''}`}>
          <Link href="/" aria-label="DeepSeq home" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8 text-ink" />
            {!collapsed && <span className="font-display text-sm font-semibold tracking-[0.2em]">DEEPSEQ</span>}
          </Link>
        </div>
        {!collapsed && <p className="mono-meta px-6 pb-2 !text-[0.6rem]">ANALYSIS WORKSPACE</p>}
        <nav className="flex-1 overflow-y-auto px-3 scrollbar-thin" aria-label="Workspace sections">{navList(collapsed)}</nav>
        <div className="space-y-2 border-t border-line p-3">
          <Link href="/" title="Back to site" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-mute hover:text-ink">
            <FiHome aria-hidden /> {!collapsed && 'Back to site'}
          </Link>
          <button onClick={toggle} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-mute hover:text-ink" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <FiChevronsRight aria-hidden /> : <><FiChevronsLeft aria-hidden /> Collapse</>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Workspace navigation">
          <button className="absolute inset-0 bg-abyss/70 backdrop-blur-sm" aria-label="Close navigation" onClick={() => setDrawer(false)} style={{ animation: 'fade 0.3s both' }} />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-[300px] border-r border-line bg-midnight p-4" style={{ animation: 'rise 0.4s var(--ease-abyss) both' }}>
            <div className="mb-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2"><LogoMark className="h-7 w-7 text-ink" /><span className="font-display text-sm tracking-[0.2em]">DEEPSEQ</span></Link>
              <button onClick={() => setDrawer(false)} aria-label="Close navigation" className="rounded-full p-2 text-mute hover:text-ink"><FiX /></button>
            </div>
            {navList(false)}
            <div className="mt-6 border-t border-line pt-4"><MotionToggle /></div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-abyss/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button className="rounded-full p-2 text-ink lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation" aria-expanded={drawer}>
            <FiMenu />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-medium sm:text-xl">{title}</h1>
            {subtitle && <p className="truncate text-xs text-mute">{subtitle}</p>}
          </div>
          <div className="hidden 2xl:block"><ServiceStatus compact /></div>
          <div className="hidden md:block"><MotionToggle /></div>
          {username && <span className="hidden font-mono text-xs text-mute sm:inline">@{username}</span>}
          {signedIn ? (
            <button onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-mute hover:text-danger" aria-label="Log out">
              <FiLogOut aria-hidden /> <span className="hidden sm:inline">Logout</span>
            </button>
          ) : signedIn === false ? (
            <Link href="/login" className="rounded-full px-3 py-1.5 text-sm text-mute hover:text-ink">Sign in</Link>
          ) : null}
        </header>

        {actions && <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-6">{actions}</div>}

        <main id="main" className={`relative flex-1 ${bleed ? '' : 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8'}`}>
          {blocked ? (
            <div className="flex h-[50vh] items-center justify-center"><DnaSpinner size={32} label="Checking your session…" /></div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
