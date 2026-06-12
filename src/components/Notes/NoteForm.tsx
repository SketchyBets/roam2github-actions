'use client';

import { useEffect, useState } from 'react';
import { Company, Contact, Meeting, Note, OutlinerItem } from '@/types';
import { OutlinerEditor } from './OutlinerEditor';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { MultiSelect } from '@/components/ui/MultiSelect';
import toast from 'react-hot-toast';

interface Props {
  note: Note | null;
  initialMeetingId?: string;
  defaultCompanyIds?: string[];
  defaultContactIds?: string[];
  onClose: () => void;
  onSave: (note: Note) => void;
}

function makeItem(): OutlinerItem {
  return { id: crypto.randomUUID(), text: '', level: 0 };
}

export function NoteForm({ note, initialMeetingId, defaultCompanyIds, defaultContactIds, onClose, onSave }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(note?.title ?? '');
  const [date, setDate] = useState(note?.date ?? new Date().toISOString().slice(0, 10));
  const [meetingId, setMeetingId] = useState(note?.meeting_id ?? initialMeetingId ?? '');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(note?.company_ids ?? defaultCompanyIds ?? []);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(note?.contact_ids ?? defaultContactIds ?? []);
  const [content, setContent] = useState<OutlinerItem[]>(
    note?.content?.length ? note.content : [makeItem()]
  );

  useEffect(() => {
    Promise.all([
      fetch('/api/companies?limit=200').then(r => r.json()),
      fetch('/api/contacts?limit=200').then(r => r.json()),
      fetch('/api/meetings?limit=200').then(r => r.json()),
    ]).then(([c, ct, m]) => {
      setCompanies(Array.isArray(c) ? c : []);
      setContacts(Array.isArray(ct) ? ct : []);
      setMeetings(Array.isArray(m) ? m : []);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: title || date,
        date,
        content,
        meeting_id: meetingId || null,
        company_ids: selectedCompanyIds,
        contact_ids: selectedContactIds,
      };
      const url = note ? `/api/notes/${note.id}` : '/api/notes';
      const method = note ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast.success(note ? 'Note updated' : 'Note saved');
      onSave(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const meetingOpts = [
    { value: '', label: '— No Meeting —' },
    ...meetings.map(m => ({ value: m.id, label: m.agenda ?? m.date_time?.slice(0, 10) ?? m.id })),
  ];

  const companyOpts = companies.map(c => ({ value: c.id, label: c.name, sublabel: c.sector ?? undefined }));
  const contactOpts = contacts.map(c => ({ value: c.id, label: c.full_name, sublabel: c.company?.name ?? c.title ?? undefined }));

  return (
    <Modal open onClose={onClose} title={note ? 'Edit Note' : 'New Note'} size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* Title + Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={date}
              />
            </div>
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Meeting */}
          <Select
            label="Link to Meeting (optional)"
            value={meetingId}
            onChange={e => setMeetingId(e.target.value)}
            options={meetingOpts}
          />

          {/* Companies */}
          <MultiSelect
            label="Companies"
            options={companyOpts}
            selected={selectedCompanyIds}
            onChange={setSelectedCompanyIds}
            placeholder="Search companies..."
            accentColor="blue"
          />

          {/* Contacts */}
          <MultiSelect
            label="Contacts"
            options={contactOpts}
            selected={selectedContactIds}
            onChange={setSelectedContactIds}
            placeholder="Search contacts..."
            accentColor="purple"
          />

          {/* Outliner */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Notes</label>
            <div className="rounded-md border border-[#1e2a3a] bg-[#070d1a] p-3 min-h-[200px]">
              <OutlinerEditor
                items={content}
                onChange={setContent}
                placeholder="Start typing your notes..."
              />
            </div>
            <p className="text-xs text-slate-600 mt-1.5">
              Enter = new bullet · Tab = indent · Shift+Tab = outdent · Backspace on empty = delete
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end p-5 pt-3 border-t border-[#1e2a3a] flex-shrink-0">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : note ? 'Update Note' : 'Save Note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
