'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Download,
  FolderOpen,
  ChevronUp,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { Project, ProjectStatus, TaskPriority } from '@/types';
import { formatDate, isOverdue } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProjectForm } from './ProjectForm';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES: ProjectStatus[] = ['Not Started', 'In Progress', 'On Hold', 'Complete'];
const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortField = 'name' | 'type' | 'status' | 'priority' | 'due_date' | 'owner' | 'updated_at';

const PRIORITY_ORDER: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };
const STATUS_ORDER: Record<ProjectStatus, number> = {
  'In Progress': 0,
  'Not Started': 1,
  'On Hold': 2,
  Complete: 3,
};

function compareProjects(
  a: Project,
  b: Project,
  field: SortField,
  dir: 'asc' | 'desc',
): number {
  const sign = dir === 'asc' ? 1 : -1;

  if (field === 'priority') {
    return sign * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }
  if (field === 'status') {
    return sign * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }
  if (field === 'due_date') {
    const av = a.due_date ?? '';
    const bv = b.due_date ?? '';
    return sign * av.localeCompare(bv);
  }
  if (field === 'updated_at') {
    return sign * (a.updated_at ?? '').localeCompare(b.updated_at ?? '');
  }

  const av = String((a as unknown as Record<string, unknown>)[field] ?? '');
  const bv = String((b as unknown as Record<string, unknown>)[field] ?? '');
  return sign * av.localeCompare(bv);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortHeader({
  field,
  label,
  current,
  dir,
  onSort,
}: {
  field: SortField;
  label: string;
  current: SortField;
  dir: 'asc' | 'desc';
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th
      onClick={() => onSort(field)}
      className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-slate-200"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
        ) : (
          <span className="w-3" />
        )}
      </span>
    </th>
  );
}

function SubtaskProgress({ project }: { project: Project }) {
  const total = project.subtasks?.length ?? 0;
  const done = project.subtasks?.filter(s => s.completed).length ?? 0;
  if (total === 0) return <span className="text-xs text-slate-600">—</span>;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-[#0d1730] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done === total ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 num whitespace-nowrap">{done}/{total}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      const res = await fetch(`/api/projects?${params}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  const filtered = projects.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => compareProjects(a, b, sortField, sortDir));

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/projects/${deleting.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Project deleted');
        setProjects(ps => ps.filter(p => p.id !== deleting.id));
      } else {
        throw new Error('Delete failed');
      }
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  function handleExport() {
    const link = document.createElement('a');
    link.href = '/api/export?module=projects';
    link.click();
  }

  function openAdd() { setEditing(null); setShowForm(true); }
  function openEdit(p: Project) { setEditing(p); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  function handleSave(saved: Project) {
    if (editing) setProjects(ps => ps.map(p => p.id === saved.id ? saved : p));
    else setProjects(ps => [saved, ...ps]);
    closeForm();
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
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="select-field w-auto text-xs py-1.5"
        >
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={13} /> Export
          </Button>
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={13} /> Add Project
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-slate-600 text-sm">Loading...</div>
      ) : !sorted.length ? (
        <div className="card">
          <EmptyState
            icon={FolderOpen}
            title="No projects found"
            description="Add your first project to start tracking deliverables."
            action={
              <Button variant="primary" size="sm" onClick={openAdd}>
                <Plus size={13} /> Add Project
              </Button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <SortHeader field="name" label="Project Name" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortHeader field="type" label="Type" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortHeader field="status" label="Status" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortHeader field="priority" label="Priority" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortHeader field="due_date" label="Due Date" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortHeader field="owner" label="Owner" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Company</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Subtasks</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(project => (
                  <tr
                    key={project.id}
                    className="border-b border-[#111f3d] hover:bg-[#0d1730] transition-colors cursor-pointer"
                    onClick={() => openEdit(project)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200 text-sm">{project.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={project.type} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={project.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={project.priority} />
                    </td>
                    <td className="px-4 py-3 text-xs num whitespace-nowrap">
                      {project.due_date ? (
                        <span className={isOverdue(project.due_date) && project.status !== 'Complete' ? 'text-red-400 font-medium' : 'text-slate-500'}>
                          {formatDate(project.due_date)}
                          {isOverdue(project.due_date) && project.status !== 'Complete' && (
                            <span className="ml-1 text-red-500">●</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{project.owner || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{project.company?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <SubtaskProgress project={project} />
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={e => { e.stopPropagation(); setDeleting(project); }}
                    >
                      <button className="text-slate-700 hover:text-red-400 transition-colors p-1 rounded">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <p className="text-xs text-slate-600">{sorted.length} {sorted.length === 1 ? 'project' : 'projects'}</p>
      )}

      {showForm && (
        <ProjectForm project={editing} onClose={closeForm} onSave={handleSave} />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        loading={deleteLoading}
      />
    </div>
  );
}
