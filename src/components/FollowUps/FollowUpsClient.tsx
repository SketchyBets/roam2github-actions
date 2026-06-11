'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Download, CheckSquare } from 'lucide-react';
import { FollowUp, TaskStatus, TaskPriority } from '@/types';
import { formatDate, isOverdue } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FollowUpForm } from './FollowUpForm';
import toast from 'react-hot-toast';

const STATUSES: TaskStatus[] = ['Open', 'In Progress', 'Done', 'Deferred'];
const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  'Open': 'In Progress',
  'In Progress': 'Done',
  'Done': 'Open',
  'Deferred': 'Open',
};

export function FollowUpsClient() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [deleting, setDeleting] = useState<FollowUp | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      const res = await fetch(`/api/followups?${params}`);
      if (!res.ok) throw new Error('Failed to load follow-ups');
      const data = await res.json();
      // Sort: overdue first, then by due_date ascending, undated last
      const sorted = (data ?? [] as FollowUp[]).sort((a: FollowUp, b: FollowUp) => {
        const aOverdue = isOverdue(a.due_date) && a.status !== 'Done';
        const bOverdue = isOverdue(b.due_date) && b.status !== 'Done';
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
      setFollowUps(sorted);
    } catch {
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/followups/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Task deleted');
      setFollowUps(fs => fs.filter(f => f.id !== deleting.id));
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  async function handleStatusToggle(fu: FollowUp) {
    const nextStatus = STATUS_CYCLE[fu.status];
    setTogglingId(fu.id);
    try {
      const res = await fetch(`/api/followups/${fu.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fu, status: nextStatus, company_id: fu.company_id ?? null, contact_id: fu.contact_id ?? null, deal_id: fu.deal_id ?? null, source_meeting_id: fu.source_meeting_id ?? null }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updated: FollowUp = await res.json();
      setFollowUps(fs => fs.map(f => f.id === updated.id ? updated : f));
    } catch {
      toast.error('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  }

  function handleExport() {
    const link = document.createElement('a');
    link.href = '/api/export?module=followups';
    link.click();
  }

  return (
    <div className="space-y-4 animate-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="select-field w-auto text-xs py-1.5"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="select-field w-auto text-xs py-1.5"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={13} /> Export
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={13} /> Add Task
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-600 text-sm">Loading...</div>
        ) : !followUps.length ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks found"
            description="Add your first follow-up task to stay on top of your pipeline."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
                <Plus size={13} /> Add Task
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Task</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Priority</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Due Date</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Company</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Contact</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Source Meeting</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Assigned To</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {followUps.map((fu) => {
                  const overdue = isOverdue(fu.due_date) && fu.status !== 'Done';
                  return (
                    <tr
                      key={fu.id}
                      className={`border-b border-[#111f3d] transition-colors cursor-pointer ${
                        overdue
                          ? 'bg-red-900/10 hover:bg-red-900/20'
                          : 'hover:bg-[#0d1730]'
                      }`}
                      onClick={() => { setEditing(fu); setShowForm(true); }}
                    >
                      {/* Title */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-slate-200 text-sm truncate">{fu.title}</div>
                        {fu.description && (
                          <div className="text-xs text-slate-600 truncate mt-0.5 max-w-[200px]">
                            {fu.description}
                          </div>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        <Badge value={fu.priority} />
                      </td>

                      {/* Status — clicking cycles through */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleStatusToggle(fu)}
                          disabled={togglingId === fu.id}
                          title={`Click to advance to: ${STATUS_CYCLE[fu.status]}`}
                          className="focus:outline-none disabled:opacity-50 transition-opacity"
                        >
                          <Badge value={fu.status} />
                        </button>
                      </td>

                      {/* Due Date */}
                      <td className={`px-4 py-3 text-xs num whitespace-nowrap ${overdue ? 'text-red-400 font-semibold' : 'text-slate-500'}`}>
                        {fu.due_date ? (
                          <span className={overdue ? 'text-red-400' : ''}>
                            {formatDate(fu.due_date)}
                            {overdue && <span className="ml-1 text-red-500">!</span>}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {fu.company?.name ?? '—'}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {fu.contact?.full_name ?? '—'}
                      </td>

                      {/* Source Meeting */}
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {fu.source_meeting
                          ? formatDate(fu.source_meeting.date_time)
                          : '—'}
                      </td>

                      {/* Assigned To */}
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {fu.assigned_to || '—'}
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setDeleting(fu)}
                          className="text-slate-700 hover:text-red-400 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600">
        {followUps.length} {followUps.length === 1 ? 'task' : 'tasks'}
      </p>

      {showForm && (
        <FollowUpForm
          followUp={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={(saved) => {
            if (editing) setFollowUps(fs => fs.map(f => f.id === saved.id ? saved : f));
            else setFollowUps(fs => [saved, ...fs]);
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleting?.title}"? This cannot be undone.`}
        loading={deleteLoading}
      />
    </div>
  );
}
