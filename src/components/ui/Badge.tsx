import { cn } from '@/lib/utils';

const variants: Record<string, string> = {
  // Coverage status
  Active: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40',
  Watch: 'bg-amber-900/40 text-amber-400 border border-amber-700/40',
  Inactive: 'bg-slate-800 text-slate-500 border border-slate-700',
  // Deal stage
  Prospect: 'bg-slate-800 text-slate-400 border border-slate-700',
  Pitching: 'bg-blue-900/40 text-blue-400 border border-blue-700/40',
  'Mandate Won': 'bg-violet-900/40 text-violet-400 border border-violet-700/40',
  'In Execution': 'bg-cyan-900/40 text-cyan-400 border border-cyan-700/40',
  Closing: 'bg-amber-900/40 text-amber-400 border border-amber-700/40',
  Closed: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40',
  Dead: 'bg-red-900/40 text-red-500 border border-red-800/40',
  // Priority
  High: 'bg-red-900/40 text-red-400 border border-red-800/40',
  Medium: 'bg-amber-900/40 text-amber-400 border border-amber-700/40',
  Low: 'bg-slate-800 text-slate-400 border border-slate-700',
  // Task status
  Open: 'bg-blue-900/40 text-blue-400 border border-blue-700/40',
  'In Progress': 'bg-violet-900/40 text-violet-400 border border-violet-700/40',
  Done: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40',
  Deferred: 'bg-slate-800 text-slate-500 border border-slate-700',
  // Project status
  'Not Started': 'bg-slate-800 text-slate-400 border border-slate-700',
  'On Hold': 'bg-amber-900/40 text-amber-400 border border-amber-700/40',
  Complete: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40',
  // Tier
  'Tier 1': 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40',
  'Tier 2': 'bg-blue-900/40 text-blue-400 border border-blue-700/40',
  'Tier 3': 'bg-slate-800 text-slate-400 border border-slate-700',
  // Default
  default: 'bg-slate-800 text-slate-400 border border-slate-700',
};

interface BadgeProps {
  value: string;
  className?: string;
}

export function Badge({ value, className }: BadgeProps) {
  const style = variants[value] ?? variants.default;
  return (
    <span className={cn('badge', style, className)}>
      {value}
    </span>
  );
}

export function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#0d1730] text-slate-400 border border-[#1e2a3a]">
      {tag}
    </span>
  );
}
