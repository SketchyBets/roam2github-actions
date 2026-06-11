'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  label?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  accentColor?: 'blue' | 'purple';
}

export function MultiSelect({ label, options, selected, onChange, placeholder = 'Search...', accentColor = 'blue' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.sublabel ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedOptions = options.filter(o => selected.includes(o.value));

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  }

  function remove(value: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter(v => v !== value));
  }

  const tagBg = accentColor === 'purple' ? 'bg-purple-900/40 text-purple-300' : 'bg-blue-900/40 text-blue-300';
  const checkColor = accentColor === 'purple' ? 'text-purple-400' : 'text-blue-400';
  const highlightBg = accentColor === 'purple' ? 'bg-purple-600/20' : 'bg-blue-600/20';

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          {label}
          {selected.length > 0 && (
            <span className={`ml-1.5 text-xs ${accentColor === 'purple' ? 'text-purple-400' : 'text-blue-400'}`}>
              ({selected.length})
            </span>
          )}
        </label>
      )}

      {/* Trigger */}
      <div
        className="min-h-[36px] w-full rounded-md border border-[#1e2a3a] bg-[#070d1a] px-2.5 py-1.5 cursor-text flex flex-wrap gap-1 items-center"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
      >
        {selectedOptions.map(opt => (
          <span key={opt.value} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${tagBg}`}>
            {opt.label}
            <button type="button" onClick={e => remove(opt.value, e)} className="hover:opacity-70">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none py-0.5"
        />
        <ChevronDown size={12} className="text-slate-600 flex-shrink-0 ml-auto" />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-[#1e2a3a] bg-[#0a1225] shadow-xl max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-600">No results</div>
          ) : (
            filtered.map(opt => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { toggle(opt.value); setSearch(''); inputRef.current?.focus(); }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors hover:bg-[#0d1730] ${isSelected ? highlightBg : ''}`}
                >
                  <span>
                    <span className="text-slate-200">{opt.label}</span>
                    {opt.sublabel && <span className="text-slate-600 ml-1.5">{opt.sublabel}</span>}
                  </span>
                  {isSelected && <span className={`text-xs ${checkColor}`}>✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
