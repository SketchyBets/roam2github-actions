'use client';

import { useEffect, useState } from 'react';
import { Company, Contact, Meeting, Note, OutlinerItem } from '@/types';
import { OutlinerEditor } from './OutlinerEditor';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Props {
  note: Note | null;
  initialMeetingId?: string;
  onClose: () => void;
  onSave: (note: Note) => void;
}

function makeItem(): OutlinerItem {
  return { id: crypto.randomUUID(), text: '', level: 0 };
}

export function NoteForm({ note, initialMeetingId, onClose, onSave }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(note?.title ?? '');
  const [date, setDate] = useState(note?.date ?? new Date().toISOString().slice(0, 10));
  const [meetingId, setMeetingId] = useState(note?.meeting_id ?? initialMeetingId ?? '');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(note?.company_ids ?? []);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(note?.contact_ids ?? []);
  const [content, setContent] = useState<OutlinerItem[]>(
    note?.content?.length ? note.content : [makeItem()]
  );

  const [companySearch, setCompanySearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');

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

  function toggleCompany(id: string) {
    setSelectedCompanyIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleContact(id: string) {
    setSelectedContactIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

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

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );
  const filteredContacts = contacts.filter(c =>
    c.full_name.toLowerCase().includes(contactSearch.toLowerCase())
  );

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
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Companies
              {selectedCompanyIds.length > 0 && (
                <span className="ml-1.5 text-blue-400">({selectedCompanyIds.length} selected)</span>
              )}
            </label>
            {companies.length > 5 && (
              <input
                value={companySearch}
                onChange={e => setCompanySearch(e.target.value)}
                placeholder="Filter companies..."
                className="input-field text-xs py-1 mb-2 w-full"
              />
            )}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {filteredCompanies.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCompany(c.id)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    selectedCompanyIds.includes(c.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1e2a3a] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Contacts */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Contacts
              {selectedContactIds.length > 0 && (
                <span className="ml-1.5 text-purple-400">({selectedContactIds.length} selected)</span>
              )}
            </label>
            {contacts.length > 5 && (
              <input
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                placeholder="Filter contacts..."
                className="input-field text-xs py-1 mb-2 w-full"
              />
            )}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {filteredContacts.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleContact(c.id)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    selectedContactIds.includes(c.id)
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#1e2a3a] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c.full_name}
                </button>
              ))}
            </div>
          </div>

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
              Enter = new bullet · Tab = indent · Shift+Tab = outdent · Shift+Enter = line break · Backspace on empty = delete
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
