'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Download, Search, Calendar } from 'lucide-react';
import { Meeting, MeetingType } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { MeetingForm } from './MeetingForm';
import toast from 'react-hot-toast';

const MEETING_TYPES: MeetingType[] = ['In-person', 'Call', 'Video', 'Conference/Event'];

export function MeetingsClient() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [deleting, setDeleting] = useState<Meeting | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (search) params.set('search', search);
      const res = await fetch(`/api/meetings?${params}`);
      if (!res.ok) throw new Error('Failed to load meetings');
      const data = await res.json();
      // Sort by date desc
      const sorted = (data ?? []).sort(
        (a: Meeting, b: Meeting) =>
          new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
      );
      setMeetings(sorted);
    } catch {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, [filterType, search]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/meetings/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Meeting deleted');
      setMeetings(ms => ms.filter(m => m.id !== deleting.id));
    } catch {
      toast.error('Failed to delete meeting');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  function handleExport() {
    const link = document.createElement('a');
    link.href = '/api/export?module=meetings';
    link.click();
  }

  function truncate(str: string | undefined, len: number): string {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '…' : str;
  }

  return (
    <div className="space-y-4 animate-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search meetings..."
            className="w-full input-field pl-8 py-1.5 text-xs"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="select-field w-auto text-xs py-1.5"
        >
          <option value="">All Types</option>
          {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={13} /> Export
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={13} /> Log Meeting
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-600 text-sm">Loading...</div>
        ) : !meetings.length ? (
          <EmptyState
            icon={Calendar}
            title="No meetings logged"
            description="Log your first meeting to start tracking client interactions."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
                <Plus size={13} /> Log Meeting
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    Date / Time
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    Type
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    Company
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    Agenda / Purpose
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    Attendees
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    Notes
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {meetings.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-[#111f3d] hover:bg-[#0d1730] transition-colors cursor-pointer"
                    onClick={() => { setEditing(m); setShowForm(true); }}
                  >
                    <td className="px-4 py-3 text-xs text-slate-400 num whitespace-nowrap">
                      {formatDateTime(m.date_time)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={m.meeting_type} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {m.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 max-w-xs">
                      {truncate(m.agenda, 60)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 num text-center">
                      {m.attendee_ids?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">
                      {truncate(m.notes, 60)}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setDeleting(m)}
                        className="text-slate-700 hover:text-red-400 text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600">
        {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}
      </p>

      {showForm && (
        <MeetingForm
          meeting={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={(saved) => {
            if (editing) setMeetings(ms => ms.map(m => m.id === saved.id ? saved : m));
            else setMeetings(ms => [saved, ...ms]);
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Meeting"
        message={`Are you sure you want to delete this meeting? This cannot be undone.`}
        loading={deleteLoading}
      />
    </div>
  );
}
