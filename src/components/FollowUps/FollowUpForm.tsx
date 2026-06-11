'use client';

import { useEffect, useState } from 'react';
import { FollowUp, TaskPriority, TaskStatus, Company, Contact, Deal, Meeting } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
  followUp: FollowUp | null;
  onClose: () => void;
  onSave: (f: FollowUp) => void;
}

const PRIORITY_OPTS: { value: TaskPriority; label: string }[] = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const STATUS_OPTS: { value: TaskStatus; label: string }[] = [
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Done', label: 'Done' },
  { value: 'Deferred', label: 'Deferred' },
];

export function FollowUpForm({ followUp, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    title: followUp?.title ?? '',
    description: followUp?.description ?? '',
    due_date: followUp?.due_date ? followUp.due_date.slice(0, 10) : '',
    priority: (followUp?.priority ?? 'Medium') as TaskPriority,
    status: (followUp?.status ?? 'Open') as TaskStatus,
    assigned_to: followUp?.assigned_to ?? '',
    company_id: followUp?.company_id ?? '',
    contact_id: followUp?.contact_id ?? '',
    deal_id: followUp?.deal_id ?? '',
    source_meeting_id: followUp?.source_meeting_id ?? '',
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/companies?limit=500').then(r => r.json()),
      fetch('/api/contacts?limit=500').then(r => r.json()),
      fetch('/api/deals?limit=500').then(r => r.json()),
      fetch('/api/meetings?limit=200').then(r => r.json()),
    ]).then(([cos, cts, dls, mts]) => {
      setCompanies(Array.isArray(cos) ? cos : []);
      setContacts(Array.isArray(cts) ? cts : []);
      setDeals(Array.isArray(dls) ? dls : []);
      setMeetings(Array.isArray(mts) ? mts : []);
    }).catch(() => {});
  }, []);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Task title is required');

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        due_date: form.due_date || null,
        priority: form.priority,
        status: form.status,
        assigned_to: form.assigned_to || null,
        company_id: form.company_id || null,
        contact_id: form.contact_id || null,
        deal_id: form.deal_id || null,
        source_meeting_id: form.source_meeting_id || null,
      };

      const url = followUp ? `/api/followups/${followUp.id}` : '/api/followups';
      const method = followUp ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast.success(followUp ? 'Task updated' : 'Task added');
      onSave(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function handleEmailReminder() {
    const contactName = contacts.find(c => c.id === form.contact_id)?.full_name ?? '';
    const assignedTo = form.assigned_to || 'Team';
    const dueDateStr = form.due_date ? formatDate(form.due_date) : 'No due date';
    const subject = encodeURIComponent(`Reminder: ${form.title}`);
    const body = encodeURIComponent(
      [
        `Task: ${form.title}`,
        form.description ? `Description: ${form.description}` : '',
        `Due Date: ${dueDateStr}`,
        `Priority: ${form.priority}`,
        `Status: ${form.status}`,
        form.assigned_to ? `Assigned To: ${assignedTo}` : '',
        contactName ? `Contact: ${contactName}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }

  const companyOpts = [
    { value: '', label: '— No Company —' },
    ...companies.map(c => ({ value: c.id, label: c.name })),
  ];

  const contactOpts = [
    { value: '', label: '— No Contact —' },
    ...contacts.map(c => ({ value: c.id, label: c.full_name })),
  ];

  const dealOpts = [
    { value: '', label: '— No Deal —' },
    ...deals.map(d => ({ value: d.id, label: d.name })),
  ];

  const meetingOpts = [
    { value: '', label: '— No Source Meeting —' },
    ...meetings.map(m => ({
      value: m.id,
      label: `${formatDate(m.date_time)}${m.company ? ` · ${m.company.name}` : ''}${m.agenda ? ` — ${m.agenda.slice(0, 40)}` : ''}`,
    })),
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={followUp ? `Edit: ${followUp.title}` : 'Add Task'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Title */}
        <div className="col-span-2">
          <Input
            label="Task Title *"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Follow up on pitch deck feedback..."
          />
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={2}
          placeholder="Additional context or details..."
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Due Date */}
          <Input
            label="Due Date"
            type="date"
            value={form.due_date}
            onChange={e => set('due_date', e.target.value)}
          />

          {/* Priority */}
          <Select
            label="Priority"
            value={form.priority}
            onChange={e => set('priority', e.target.value as TaskPriority)}
            options={PRIORITY_OPTS}
          />

          {/* Status */}
          <Select
            label="Status"
            value={form.status}
            onChange={e => set('status', e.target.value as TaskStatus)}
            options={STATUS_OPTS}
          />

          {/* Assigned To */}
          <Input
            label="Assigned To"
            value={form.assigned_to}
            onChange={e => set('assigned_to', e.target.value)}
            placeholder="Jane Smith"
          />

          {/* Company */}
          <Select
            label="Company"
            value={form.company_id}
            onChange={e => set('company_id', e.target.value)}
            options={companyOpts}
          />

          {/* Contact */}
          <Select
            label="Contact"
            value={form.contact_id}
            onChange={e => set('contact_id', e.target.value)}
            options={contactOpts}
          />

          {/* Deal */}
          <Select
            label="Related Deal"
            value={form.deal_id}
            onChange={e => set('deal_id', e.target.value)}
            options={dealOpts}
          />

          {/* Source Meeting */}
          <Select
            label="Source Meeting"
            value={form.source_meeting_id}
            onChange={e => set('source_meeting_id', e.target.value)}
            options={meetingOpts}
          />
        </div>

        <div className="flex items-center gap-2 justify-between pt-2 border-t border-[#1e2a3a]">
          {/* Email Reminder button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEmailReminder}
          >
            <Mail size={13} /> Email Reminder
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : followUp ? 'Update Task' : 'Add Task'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
