"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiHome,
  FiInfo,
  FiHelpCircle,
  FiClock,
  FiGrid,
  FiBarChart2,
  FiDatabase,
  FiMap,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
} from 'react-icons/fi';

type NavLink = { href: string; label: string; icon: React.ReactElement };

// The single source of truth for inner-app navigation. Previously each page
// hand-copied its own subset of these links (or none at all) -- every
// authenticated page now renders the same set via this constant.
const LINKS: NavLink[] = [
  { href: '/', label: 'Home', icon: <FiHome /> },
  { href: '/about', label: 'About us', icon: <FiInfo /> },
  { href: '/help', label: 'Help', icon: <FiHelpCircle /> },
  { href: '/history', label: 'History', icon: <FiClock /> },
  { href: '/dashboard', label: 'Dashboard', icon: <FiGrid /> },
  { href: '/analytics', label: 'Analytics', icon: <FiBarChart2 /> },
  { href: '/species', label: 'Species', icon: <FiDatabase /> },
  { href: '/explore', label: 'Explore', icon: <FiMap /> },
  { href: '/settings', label: 'Settings', icon: <FiSettings /> },
];

const LOGO = (
  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1M12 8c-.112 0-.224.016-.335.035M2.004 15.197a4.5 4.5 0 011.026-.06C6.11 14.885 8.761 14 12 14c3.239 0 5.89.884 8.97.944a4.5 4.5 0 011.026.06l-.412 1.633a9.75 9.75 0 01-18.128 0l-.412-1.633zM12 21c-3.132 0-6.104-.633-8.875-1.761M12 21c3.132 0 6.104-.633 8.875-1.761M12 21v-3"
    />
  </svg>
);

export type AppNavbarProps = {
  username: string | null;
  onLogout: () => void | Promise<void>;
};

/** Unified nav for every authenticated inner page. Auth state (username,
 * logout) is passed in as props -- each page keeps computing it exactly as
 * it does today via getCurrentUser/getUsername/logout, so the existing
 * isLoggedIn() -> router.replace('/login') redirect logic in every page is
 * untouched. */
export default function AppNavbar({ username, onLogout }: AppNavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="relative z-30 bg-brand-900/80 backdrop-blur-sm shadow-lg">
      <nav className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center space-x-2 shrink-0">
          {LOGO}
          <span className="text-xl font-bold text-white">DEEPSEQ</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center space-x-5 text-sm">
          {LINKS.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center border-b-2 pb-1 transition-colors duration-200 ${
                  active
                    ? 'text-brand-300 font-semibold border-brand-300'
                    : 'text-slate-200 border-transparent hover:text-brand-200 hover:border-brand-300/40'
                }`}
              >
                <span className="mr-1">{icon}</span>
                {label}
              </Link>
            );
          })}
          {username && <span className="text-brand-200 text-sm">Hi, {username}</span>}
          <button
            onClick={() => onLogout()}
            className="flex items-center text-slate-200 hover:text-danger-400 transition-colors"
          >
            <FiLogOut className="mr-1" /> Logout
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-white p-2 -mr-2 transition-transform duration-200 active:scale-90"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          <span className="block transition-transform duration-200" style={{ transform: mobileOpen ? 'rotate(90deg)' : 'none' }}>
            {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </span>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden animate-slide-up border-t border-white/10 bg-brand-900/95 px-4 py-3">
          <div className="flex flex-col space-y-1">
            {LINKS.map(({ href, label, icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center rounded-(--radius-control) px-3 py-2.5 text-sm transition-colors ${
                    active ? 'bg-brand-500/20 text-brand-300 font-semibold' : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className="mr-2.5">{icon}</span>
                  {label}
                </Link>
              );
            })}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between px-3">
              {username && <span className="text-brand-200 text-sm">Hi, {username}</span>}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onLogout();
                }}
                className="flex items-center text-slate-200 hover:text-danger-400 text-sm transition-colors"
              >
                <FiLogOut className="mr-1" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
