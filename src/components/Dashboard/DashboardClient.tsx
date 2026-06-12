'use client';

import { useEffect, useState } from 'react';
import {
  CheckSquare, AlertTriangle, TrendingUp, CalendarDays,
  Mail, RefreshCw, Clock, Building2, Users, FileText
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatDateTime, isOverdue } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getRecentlyViewed, RecentItem } from '@/lib/recentlyViewed';
import toast from 'react-hot-toast';

interface StatsData {
  open_followups: number;
  overdue: number;
  active_deals: number;
  meetings_this_week: number;
  recent_contacts: { id: string; full_name: string; title?: string; company?: { name: string } }[];
  upcoming_meetings: { id: string; date_time: string; meeting_type: string; company?: { name: string }; agenda?: string }[];
  deals_by_stage: Record<string, number>;
  fees_by_stage: Record<string, number>;
  overdue_tasks: { id: string; title: string; due_date: string; priority: string; company?: { name: string } }[];
}

const DEAL_STAGES = ['Prospect', 'Pitching', 'Mandate Won', 'In Execution', 'Closing'];

function formatFee(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const RECENT_ICONS: Record<string, React.ElementType> = {
  contact: Users,
  company: Building2,
  deal: TrendingUp,
  meeting: CalendarDays,
  note: FileText,
};

export function DashboardClient() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [digestLoading, setDigestLoading] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setRecentItems(getRecentlyViewed().slice(0, 5));
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const [followupsRes, dealsRes, meetingsRes, contactsRes] = await Promise.all([
        fetch('/api/followups?open_only=true'),
        fetch('/api/deals?active_only=true'),
        fetch('/api/meetings?upcoming=true'),
        fetch('/api/contacts'),
      ]);

      const [followups, deals, meetings, contacts] = await Promise.all([
        followupsRes.json(),
        dealsRes.json(),
        meetingsRes.json(),
        contactsRes.json(),
      ]);

      const overdueTasks = (followups ?? []).filter((f: { due_date?: string; status: string }) =>
        f.due_date && isOverdue(f.due_date)
      );

      const dealsByStage: Record<string, number> = {};
      const feesByStage: Record<string, number> = {};
      (deals ?? []).forEach((d: { stage: string; estimated_fee?: number }) => {
        dealsByStage[d.stage] = (dealsByStage[d.stage] ?? 0) + 1;
        if (d.estimated_fee) feesByStage[d.stage] = (feesByStage[d.stage] ?? 0) + d.estimated_fee;
      });

      setStats({
        open_followups: (followups ?? []).length,
        overdue: overdueTasks.length,
        active_deals: (deals ?? []).length,
        meetings_this_week: (meetings ?? []).length,
        recent_contacts: (contacts ?? []).slice(0, 5),
        upcoming_meetings: (meetings ?? []).slice(0, 5),
        deals_by_stage: dealsByStage,
        fees_by_stage: feesByStage,
        overdue_tasks: overdueTasks.slice(0, 5),
      });
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function sendDigest() {
    setDigestLoading(true);
    try {
      const res = await fetch('/api/digest', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Digest sent — ${data.count} tasks`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to send digest');
    } finally {
      setDigestLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-600 text-sm">Loading...</div>;

  const totalFee = Object.values(stats?.fees_by_stage ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 animate-in">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/follow-ups?status=Open" className="card p-4 hover:border-blue-700/50 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Open Tasks</p>
              <p className="text-3xl font-bold text-slate-100 num">{stats?.open_followups ?? 0}</p>
            </div>
            <CheckSquare size={18} className="text-blue-500 mt-0.5" />
          </div>
        </Link>

        <Link href="/follow-ups" className="card p-4 hover:border-red-700/50 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Overdue</p>
              <p className={`text-3xl font-bold num ${(stats?.overdue ?? 0) > 0 ? 'text-red-400' : 'text-slate-100'}`}>
                {stats?.overdue ?? 0}
              </p>
            </div>
            <AlertTriangle size={18} className={`mt-0.5 ${(stats?.overdue ?? 0) > 0 ? 'text-red-500' : 'text-slate-600'}`} />
          </div>
        </Link>

        <Link href="/deals" className="card p-4 hover:border-blue-700/50 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active Deals</p>
              <p className="text-3xl font-bold text-slate-100 num">{stats?.active_deals ?? 0}</p>
            </div>
            <TrendingUp size={18} className="text-emerald-500 mt-0.5" />
          </div>
        </Link>

        <Link href="/deals" className="card p-4 hover:border-emerald-700/50 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pipeline Fees</p>
              <p className="text-3xl font-bold text-emerald-400 num">{totalFee > 0 ? formatFee(totalFee) : '—'}</p>
            </div>
            <TrendingUp size={18} className="text-emerald-500 mt-0.5" />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline by stage */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Pipeline by Stage</h2>
            <Link href="/deals" className="text-xs text-blue-500 hover:text-blue-400">View all →</Link>
          </div>
          <div className="space-y-2">
            {DEAL_STAGES.map((stage) => {
              const count = stats?.deals_by_stage[stage] ?? 0;
              const fee = stats?.fees_by_stage[stage] ?? 0;
              const max = Math.max(...DEAL_STAGES.map((s) => stats?.deals_by_stage[s] ?? 0), 1);
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-slate-500 truncate">{stage}</div>
                  <div className="flex-1 h-4 bg-[#0a1225] rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-600/60 rounded transition-all"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <div className="w-5 text-right text-xs font-medium text-slate-400 num">{count}</div>
                  {fee > 0 && <div className="w-12 text-right text-[11px] text-emerald-500 num">{formatFee(fee)}</div>}
                </div>
              );
            })}
            {totalFee > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-[#1e2a3a]">
                <span className="text-xs text-slate-500">Total Pipeline</span>
                <span className="text-sm font-semibold text-emerald-400 num">{formatFee(totalFee)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming meetings */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Upcoming Meetings</h2>
            <Link href="/meetings" className="text-xs text-blue-500 hover:text-blue-400">View all →</Link>
          </div>
          {!stats?.upcoming_meetings.length ? (
            <p className="text-xs text-slate-600 py-4 text-center">No upcoming meetings</p>
          ) : (
            <div className="space-y-2">
              {stats.upcoming_meetings.map((m) => (
                <div key={m.id} className="flex items-start gap-3 py-2 border-b border-[#111f3d] last:border-0">
                  <CalendarDays size={13} className="text-violet-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-300 truncate">{m.company?.name ?? m.agenda ?? 'Meeting'}</p>
                    <p className="text-[11px] text-slate-600 num">{formatDateTime(m.date_time)}</p>
                  </div>
                  <Badge value={m.meeting_type} className="ml-auto flex-shrink-0 text-[10px]" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue tasks */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Overdue Tasks</h2>
            <Link href="/follow-ups" className="text-xs text-blue-500 hover:text-blue-400">View all →</Link>
          </div>
          {!stats?.overdue_tasks.length ? (
            <p className="text-xs text-slate-600 py-4 text-center">All caught up</p>
          ) : (
            <div className="space-y-2">
              {stats.overdue_tasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2 py-2 border-b border-[#111f3d] last:border-0">
                  <AlertTriangle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-red-300 truncate">{t.title}</p>
                    <p className="text-[11px] text-slate-600">{t.company?.name} · Due {formatDate(t.due_date)}</p>
                  </div>
                  <Badge value={t.priority} className="text-[10px]" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recently viewed */}
      {recentItems.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-300">Recently Viewed</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentItems.map(item => {
              const Icon = RECENT_ICONS[item.type] ?? FileText;
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.url}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-[#0a1225] border border-[#1e2a3a] text-slate-300 hover:border-blue-700/50 hover:text-slate-100 transition-colors"
                >
                  <Icon size={11} className="text-slate-500" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="ghost" size="sm" onClick={fetchStats}>
          <RefreshCw size={13} /> Refresh
        </Button>
        <Button variant="secondary" size="sm" onClick={sendDigest} disabled={digestLoading}>
          <Mail size={13} /> {digestLoading ? 'Sending...' : 'Send Weekly Digest'}
        </Button>
        <p className="text-xs text-slate-700 ml-auto">
          Shortcuts: <span className="font-mono">C</span> contacts · <span className="font-mono">N</span> notes · <span className="font-mono">M</span> meetings · <span className="font-mono">D</span> deals · <span className="font-mono">F</span> follow-ups
        </p>
      </div>
    </div>
  );
}
