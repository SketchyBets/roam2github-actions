'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TopNavProps {
  title: string;
  actions?: React.ReactNode;
}

export function TopNav({ title, actions }: TopNavProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="h-14 bg-[#070d1a]/80 backdrop-blur border-b border-[#1e2a3a] flex items-center px-6 gap-4 sticky top-0 z-30">
      <h1 className="text-sm font-semibold text-slate-200 min-w-0 truncate flex-shrink-0">{title}</h1>

      <div className="flex-1 max-w-md mx-4">
        <form onSubmit={handleSearch} className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies, contacts, deals..."
            className="w-full bg-[#0a1225] border border-[#1e2a3a] rounded-md pl-8 pr-8 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
              <X size={12} />
            </button>
          )}
        </form>
      </div>

      <div className="flex items-center gap-2 ml-auto">{actions}</div>
    </header>
  );
}
