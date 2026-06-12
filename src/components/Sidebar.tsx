'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, Building2, Users, CalendarDays,
  CheckSquare, TrendingUp, FolderKanban, LogOut, Activity, FileText, Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface FollowUpItem {
  due_date?: string;
  status: string;
}

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/meetings', label: 'Meetings', icon: CalendarDays },
  { href: '/follow-ups', label: 'Follow-ups', icon: CheckSquare },
  { href: '/deals', label: 'Deals', icon: TrendingUp },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/notes', label: 'Notes', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    fetch('/api/followups?open_only=true')
      .then(r => r.json())
      .then((data: FollowUpItem[]) => {
        const now = new Date();
        const count = (data ?? []).filter(f => f.due_date && new Date(f.due_date) < now).length;
        setOverdueCount(count);
      })
      .catch(() => {});
  }, [pathname]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-[#0a1225] border border-[#1e2a3a] text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-56 bg-[#070d1a] border-r border-[#1e2a3a] flex flex-col z-50 transition-transform duration-200',
          // Desktop: always visible
          'lg:translate-x-0',
          // Mobile: slide in/out
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo + close button */}
        <div className="px-4 py-5 border-b border-[#1e2a3a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-100 leading-tight">Dealflow</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">IB Tracker</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1 text-slate-600 hover:text-slate-300 transition-colors"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#0d1730]'
                )}
              >
                <Icon size={15} className={active ? 'text-blue-400' : ''} />
                {label}
                {label === 'Follow-ups' && overdueCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {overdueCount > 99 ? '99+' : overdueCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-[#1e2a3a]">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 hover:text-red-400 hover:bg-red-900/20 w-full transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
