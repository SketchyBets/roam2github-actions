'use client';

import { useEffect, useState } from 'react';
import { Meeting, MeetingType, Company, Deal, Contact, Note, OutlinerItem } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OutlinerEditor } from '@/components/Notes/OutlinerEditor';
import toast from 'react-hot-toast';

interface Props {
  meeting: Meeting | null;
  onClose: () => void;
  onSave: (m: Meeting) => void;
}

const MEETING_TYPE_OPTS: { value: MeetingType; label: string }[] = [
  { value: 'In-person', label: 'In-person' },
  { value: 'Call', label: 'Call' },
  { value: 'Video', label: 'Video' },
  { value: 'Conference/Event', label: 'Conference/Event' },
];

function toLocalDatetimeValue(iso: string | undefined | null): string {
  if (!iso) return '';
  // Convert ISO string to local datetime-local input value (YYYY-MM-DDTHH:mm)
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function makeItem(): OutlinerItem {
  return { id: crypto.randomUUID(), text: '', level: 0 };
}

type Tab = 'details' | 'notes';

export function MeetingForm({ meeting, onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [meetingNote, setMeetingNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState<OutlinerItem[]>([makeItem()]);
  const [savingNote, setSavingNote] = useState(false);

  const [form, setForm] = useState({
    date_time: toLocalDatetimeValue(meeting?.date_time) || toLocalDatetimeValue(new Date().toISOString()),
    meeting_type: (meeting?.meeting_type ?? 'In-person') as MeetingType,
    company_id: meeting?.company_id ?? '',
    deal_id: meeting?.deal_id ?? '',
    agenda: meeting?.agenda ?? '',
    notes: meeting?.notes ?? '',
    attendee_ids: meeting?.attendee_ids ?? [] as string[],
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [showQuickFollowup, setShowQuickFollowup] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDue, setQuickDue] = useState('');
  const [savingFollowup, setSavingFollowup] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/companies?limit=500').then(r => r.json()),
      fetch('/api/deals?limit=500').then(r => r.json()),
      fetch('/api/contacts?limit=500').then(r => r.json()),
    ]).then(([cos, dls, cts]) => {
      setCompanies(Array.isArray(cos) ? cos : []);
      setDeals(Array.isArray(dls) ? dls : []);
      setContacts(Array.isArray(cts) ? cts : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!meeting) return;
    fetch(`/api/notes?meeting_id=${meeting.id}`)
      .then(r => r.json())
      .then(data => {
        const existing = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (existing) {
          setMeetingNote(existing);
          setNoteContent(existing.content?.length ? existing.content : [makeItem()]);
        }
      })
      .catch(() => {});
  }, [meeting]);

  async function handleSaveNote() {
    setSavingNote(true);
    try {
      const attendeeIds = form.attendee_ids;
      const companyIds = form.company_id ? [form.company_id] : [];
      const payload = {
        title: form.agenda || (meeting?.date_time ? new Date(meeting.date_time).toLocaleDateString() : 'Meeting Notes'),
        date: meeting?.date_time ? meeting.date_time.slice(0, 10) : new Date().toISOString().slice(0, 10),
        content: noteContent,
        meeting_id: meeting?.id ?? null,
        company_ids: companyIds,
        contact_ids: attendeeIds,
      };
      const url = meetingNote ? `/api/notes/${meetingNote.id}` : '/api/notes';
      const method = meetingNote ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setMeetingNote(data);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleQuickFollowup() {
    if (!quickTitle.trim()) return;
    setSavingFollowup(true);
    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickTitle.trim(),
          due_date: quickDue || null,
          priority: 'Medium',
          status: 'Open',
          company_id: form.company_id || null,
          source_meeting_id: meeting?.id ?? null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Follow-up created');
      setShowQuickFollowup(false);
      setQuickTitle('');
      setQuickDue('');
    } catch {
      toast.error('Failed to create follow-up');
    } finally {
      setSavingFollowup(false);
    }
  }

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function toggleAttendee(id: string) {
    setForm(f => ({
      ...f,
      attendee_ids: f.attendee_ids.includes(id)
        ? f.attendee_ids.filter(x => x !== id)
        : [...f.attendee_ids, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date_time) return toast.error('Date & time is required');

    setSaving(true);
    try {
      const payload = {
        date_time: new Date(form.date_time).toISOString(),
        meeting_type: form.meeting_type,
        company_id: form.company_id || null,
        deal_id: form.deal_id || null,
        agenda: form.agenda || null,
        notes: form.notes || null,
        attendee_ids: form.attendee_ids,
      };

      const url = meeting ? `/api/meetings/${meeting.id}` : '/api/meetings';
      const method = meeting ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast.success(meeting ? 'Meeting updated' : 'Meeting logged');
      onSave(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const companyOpts = [
    { value: '', label: '— No Company —' },
    ...companies.map(c => ({ value: c.id, label: c.name })),
  ];

  const dealOpts = [
    { value: '', label: '— No Deal —' },
    ...deals.map(d => ({ value: d.id, label: d.name })),
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={meeting ? 'Edit Meeting' : 'Log Meeting'}
      size="lg"
    >
      {/* Tabs — only show when editing an existing meeting */}
      {meeting && (
        <div className="flex border-b border-[#1e2a3a] px-5">
          {(['details', 'notes'] as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'notes' && meeting ? (
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500">
            These notes are linked to this meeting and auto-linked to the meeting&apos;s company and attendees.
          </p>
          <div className="rounded-md border border-[#1e2a3a] bg-[#070d1a] p-3 min-h-[300px]">
            <OutlinerEditor
              items={noteContent}
              onChange={setNoteContent}
              placeholder="Start taking notes..."
            />
          </div>
          <p className="text-xs text-slate-600">
            Enter = new bullet · Tab = indent · Shift+Tab = outdent
          </p>
          <div className="flex justify-end pt-2 border-t border-[#1e2a3a]">
            <Button type="button" variant="primary" onClick={handleSaveNote} disabled={savingNote}>
              {savingNote ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Date/Time */}
          <div className="col-span-2">
            <Input
              label="Date & Time *"
              type="datetime-local"
              value={form.date_time}
              onChange={e => set('date_time', e.target.value)}
            />
          </div>

          {/* Meeting Type */}
          <Select
            label="Meeting Type"
            value={form.meeting_type}
            onChange={e => set('meeting_type', e.target.value as MeetingType)}
            options={MEETING_TYPE_OPTS}
          />

          {/* Company */}
          <Select
            label="Company"
            value={form.company_id}
            onChange={e => set('company_id', e.target.value)}
            options={companyOpts}
          />

          {/* Deal (optional) */}
          <Select
            label="Related Deal (optional)"
            value={form.deal_id}
            onChange={e => set('deal_id', e.target.value)}
            options={dealOpts}
          />

          {/* Agenda */}
          <Input
            label="Agenda / Purpose"
            value={form.agenda}
            onChange={e => set('agenda', e.target.value)}
            placeholder="Q3 coverage update, introductory call..."
          />
        </div>

        {/* Notes */}
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={4}
          placeholder="Key discussion points, action items, follow-ups..."
        />

        {/* Attendees (multi-select via checkboxes) */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400">
            Attendees{' '}
            {form.attendee_ids.length > 0 && (
              <span className="text-slate-600">({form.attendee_ids.length} selected)</span>
            )}
          </label>
          {contacts.length === 0 ? (
            <p className="text-xs text-slate-600">No contacts available.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-[#1e2a3a] rounded-md bg-[#070d1a] p-2 space-y-0.5">
              {contacts.map(contact => {
                const checked = form.attendee_ids.includes(contact.id);
                return (
                  <label
                    key={contact.id}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      checked ? 'bg-[#0d1730]' : 'hover:bg-[#0a1225]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAttendee(contact.id)}
                      className="w-3.5 h-3.5 rounded border-[#1e2a3a] bg-[#070d1a] accent-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-300">{contact.full_name}</span>
                    {contact.company && (
                      <span className="text-xs text-slate-600 ml-auto">{contact.company.name}</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Follow-up */}
        {meeting && (
          <div className="border-t border-[#1e2a3a] pt-3">
            {showQuickFollowup ? (
              <div className="space-y-2 bg-[#0a1225] rounded-md p-3 border border-[#1e2a3a]">
                <p className="text-xs font-medium text-slate-400">Quick Follow-up</p>
                <input
                  type="text"
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  placeholder="Follow-up title..."
                  className="input-field w-full text-xs py-1.5"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQuickFollowup(); } }}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={quickDue}
                    onChange={e => setQuickDue(e.target.value)}
                    className="input-field text-xs py-1.5 flex-1"
                  />
                  <Button type="button" variant="primary" size="sm" onClick={handleQuickFollowup} disabled={savingFollowup || !quickTitle.trim()}>
                    {savingFollowup ? 'Saving...' : 'Add'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowQuickFollowup(false); setQuickTitle(''); setQuickDue(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowQuickFollowup(true)}
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
              >
                + Quick Follow-up
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-[#1e2a3a]">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : meeting ? 'Update Meeting' : 'Log Meeting'}
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
}
