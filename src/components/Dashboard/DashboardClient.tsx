'use client';

import { useEffect, useState } from 'react';
import {
  CheckSquare, AlertTriangle, TrendingUp, CalendarDays,
  Users, Building2, Mail, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatDateTime, isOverdue } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface StatsData {
  open_followups: number;
  overdue: number;
  active_deals: number;
  meetings_this_week: number;
  recent_contacts: { id: string; full_name: string; title?: string; company?: { name: string } }[];
  upcoming_meetings: { id: string; date_time: string; meeting_type: string; company?: { name: string }; agenda?: string }[];
  deals_by_stage: Record<string, number>;
  overdue_tasks: { id: string; title: string; due_date: string; priority: string; company?: { name: string } }[];
}

const DEAL_STAGES = ['Prospect', 'Pitching', 'Mandate Won', 'In Execution', 'Closing'];

export function DashboardClient() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [digestLoading, setDigestLoading] = useState(false);

  useEffect(() => {
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
      (deals ?? []).forEach((d: { stage: string }) => {
        dealsByStage[d.stage] = (dealsByStage[d.stage] ?? 0) + 1;
      });

      setStats({
        open_followups: (followups ?? []).length,
        overdue: overdueTasks.length,
        active_deals: (deals ?? []).length,
        meetings_this_week: (meetings ?? []).length,
        recent_contacts: (contacts ?? []).slice(0, 5),
        upcoming_meetings: (meetings ?? []).slice(0, 5),
        deals_by_stage: dealsByStage,
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

        <Link href="/meetings" className="card p-4 hover:border-blue-700/50 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Meetings This Week</p>
              <p className="text-3xl font-bold text-slate-100 num">{stats?.meetings_this_week ?? 0}</p>
            </div>
            <CalendarDays size={18} className="text-violet-500 mt-0.5" />
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
              const max = Math.max(...DEAL_STAGES.map((s) => stats?.deals_by_stage[s] ?? 0), 1);
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-slate-500 truncate">{stage}</div>
                  <div className="flex-1 h-4 bg-[#0a1225] rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-600/60 rounded transition-all"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <div className="w-5 text-right text-xs font-medium text-slate-400 num">{count}</div>
                </div>
              );
            })}
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

      {/* Actions row */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="ghost" size="sm" onClick={fetchStats}>
          <RefreshCw size={13} /> Refresh
        </Button>
        <Button variant="secondary" size="sm" onClick={sendDigest} disabled={digestLoading}>
          <Mail size={13} /> {digestLoading ? 'Sending...' : 'Send Weekly Digest'}
        </Button>
      </div>
    </div>
  );
}
