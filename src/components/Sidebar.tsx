'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, Building2, Users, CalendarDays,
  CheckSquare, TrendingUp, FolderKanban, LogOut, Activity, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#070d1a] border-r border-[#1e2a3a] flex flex-col z-40">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1e2a3a]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
            <Activity size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 leading-tight">Dealflow</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">IB Tracker</div>
          </div>
        </div>
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
  );
}
