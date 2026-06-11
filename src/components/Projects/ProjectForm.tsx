'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  Project,
  ProjectType,
  ProjectStatus,
  TaskPriority,
  Subtask,
  Company,
  Deal,
} from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Props {
  project: Project | null;
  onClose: () => void;
  onSave: (p: Project) => void;
}

const TYPE_OPTS: { value: ProjectType | ''; label: string }[] = [
  { value: '', label: '— Select Type —' },
  { value: 'Pitch', label: 'Pitch' },
  { value: 'Research', label: 'Research' },
  { value: 'Model', label: 'Model' },
  { value: 'Regulatory/Compliance', label: 'Regulatory/Compliance' },
  { value: 'Other', label: 'Other' },
];

const STATUS_OPTS: { value: ProjectStatus; label: string }[] = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Complete', label: 'Complete' },
];

const PRIORITY_OPTS: { value: TaskPriority; label: string }[] = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export function ProjectForm({ project, onClose, onSave }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [saving, setSaving] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [form, setForm] = useState({
    name: project?.name ?? '',
    type: (project?.type ?? '') as ProjectType | '',
    status: (project?.status ?? 'Not Started') as ProjectStatus,
    priority: (project?.priority ?? 'Medium') as TaskPriority,
    due_date: project?.due_date ? project.due_date.slice(0, 10) : '',
    owner: project?.owner ?? '',
    company_id: project?.company_id ?? '',
    deal_id: project?.deal_id ?? '',
    description: project?.description ?? '',
    notes: project?.notes ?? '',
  });

  const [subtasks, setSubtasks] = useState<Subtask[]>(
    project?.subtasks ? [...project.subtasks] : []
  );

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      fetch('/api/companies?limit=200').then(r => r.json()),
      fetch('/api/deals?limit=200').then(r => r.json()),
    ])
      .then(([compData, dealData]) => {
        setCompanies(Array.isArray(compData) ? compData : []);
        setDeals(Array.isArray(dealData) ? dealData : []);
      })
      .catch(() => {});
  }, []);

  const companyOpts = [
    { value: '', label: '— No Company —' },
    ...companies.map(c => ({ value: c.id, label: c.name })),
  ];

  const dealOpts = [
    { value: '', label: '— No Deal —' },
    ...deals.map(d => ({ value: d.id, label: d.name })),
  ];

  // ── Subtask helpers ────────────────────────────────────────────────────────

  function addSubtask() {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setSubtasks(prev => [
      ...prev,
      { id, title, completed: false },
    ]);
    setNewSubtaskTitle('');
  }

  function toggleSubtask(id: string) {
    setSubtasks(prev =>
      prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    );
  }

  function removeSubtask(id: string) {
    setSubtasks(prev => prev.filter(s => s.id !== id));
  }

  const doneCount = subtasks.filter(s => s.completed).length;

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name is required');
    if (!form.type) return toast.error('Project type is required');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        owner: form.owner || null,
        company_id: form.company_id || null,
        deal_id: form.deal_id || null,
        description: form.description || null,
        notes: form.notes || null,
        subtasks,
      };

      const url = project ? `/api/projects/${project.id}` : '/api/projects';
      const method = project ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast.success(project ? 'Project updated' : 'Project added');
      onSave(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={project ? `Edit: ${project.name}` : 'Add Project'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div className="col-span-2">
            <Input
              label="Project Name *"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Q3 Healthcare Pitch Deck"
            />
          </div>

          {/* Type */}
          <Select
            label="Type *"
            value={form.type}
            onChange={e => set('type', e.target.value)}
            options={TYPE_OPTS as { value: string; label: string }[]}
          />

          {/* Status */}
          <Select
            label="Status"
            value={form.status}
            onChange={e => set('status', e.target.value)}
            options={STATUS_OPTS}
          />

          {/* Priority */}
          <Select
            label="Priority"
            value={form.priority}
            onChange={e => set('priority', e.target.value)}
            options={PRIORITY_OPTS}
          />

          {/* Due Date */}
          <Input
            label="Due Date"
            type="date"
            value={form.due_date}
            onChange={e => set('due_date', e.target.value)}
          />

          {/* Owner */}
          <Input
            label="Owner"
            value={form.owner}
            onChange={e => set('owner', e.target.value)}
            placeholder="Alice Chen"
          />

          {/* Company */}
          <Select
            label="Company"
            value={form.company_id}
            onChange={e => set('company_id', e.target.value)}
            options={companyOpts}
          />

          {/* Deal */}
          <div className="col-span-2">
            <Select
              label="Related Deal"
              value={form.deal_id}
              onChange={e => set('deal_id', e.target.value)}
              options={dealOpts}
            />
          </div>

          {/* Description */}
          <div className="col-span-2">
            <Textarea
              label="Description"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Brief summary of the project scope..."
            />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Additional context, blockers, links..."
            />
          </div>
        </div>

        {/* ── Subtasks ─────────────────────────────────────────────────────── */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-slate-400">
              Subtasks
            </label>
            {subtasks.length > 0 && (
              <span className="text-xs text-slate-500 num">
                {doneCount}/{subtasks.length} complete
              </span>
            )}
          </div>

          {/* Subtask list */}
          {subtasks.length > 0 && (
            <div className="space-y-1 rounded-md border border-[#1e2a3a] bg-[#070d1a] p-2">
              {subtasks.map(subtask => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2 group px-1 py-1 rounded hover:bg-[#0d1730] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleSubtask(subtask.id)}
                    className="flex-shrink-0 text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    {subtask.completed ? (
                      <CheckSquare size={14} className="text-emerald-500" />
                    ) : (
                      <Square size={14} />
                    )}
                  </button>
                  <span
                    className={`flex-1 text-xs ${
                      subtask.completed
                        ? 'text-slate-600 line-through'
                        : 'text-slate-300'
                    }`}
                  >
                    {subtask.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(subtask.id)}
                    className="flex-shrink-0 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {subtasks.length > 0 && (
            <div className="h-1 bg-[#0d1730] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  doneCount === subtasks.length ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{
                  width: subtasks.length > 0
                    ? `${Math.round((doneCount / subtasks.length) * 100)}%`
                    : '0%',
                }}
              />
            </div>
          )}

          {/* Add subtask input */}
          <div className="flex gap-2">
            <input
              value={newSubtaskTitle}
              onChange={e => setNewSubtaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSubtask();
                }
              }}
              placeholder="Add a subtask..."
              className="input-field flex-1 text-xs py-1.5"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addSubtask}
              disabled={!newSubtaskTitle.trim()}
            >
              <Plus size={12} /> Add
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end pt-2 border-t border-[#1e2a3a]">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : project ? 'Update Project' : 'Add Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
