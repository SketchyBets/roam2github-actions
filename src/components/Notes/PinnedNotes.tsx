'use client';

import { useEffect, useState } from 'react';
import { Note, OutlinerItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NoteForm } from './NoteForm';

interface Props {
  companyId?: string;
  contactId?: string;
}

function contentPreview(content: OutlinerItem[]) {
  return (content ?? []).slice(0, 2).map(i => i.text).filter(Boolean).join(' · ') || null;
}

export function PinnedNotes({ companyId, contactId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (companyId) params.set('company_id', companyId);
    if (contactId) params.set('contact_id', contactId);
    fetch(`/api/notes?${params}`)
      .then(r => r.json())
      .then(data => setNotes(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId, contactId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {loading ? 'Loading...' : `${notes.length} linked ${notes.length === 1 ? 'note' : 'notes'}`}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={12} /> New Note
        </Button>
      </div>

      {!loading && notes.length === 0 && (
        <p className="text-xs text-slate-600 text-center py-6">No notes linked to this record.</p>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {notes.map(note => {
          const preview = contentPreview(note.content);
          return (
            <div
              key={note.id}
              className="border border-[#1e2a3a] rounded-md p-3 cursor-pointer hover:bg-[#0a1225] transition-colors"
              onClick={() => { setEditing(note); setShowForm(true); }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] text-slate-500 num">{formatDate(note.date)}</span>
                {note.meeting && (
                  <span className="text-[11px] bg-[#1e2a3a] text-slate-500 px-1.5 py-0.5 rounded">Meeting</span>
                )}
              </div>
              <div className="text-xs font-medium text-slate-300">{note.title || note.date}</div>
              {preview && <div className="text-[11px] text-slate-600 mt-0.5 truncate">{preview}</div>}
            </div>
          );
        })}
      </div>

      {showForm && (
        <NoteForm
          note={editing}
          defaultCompanyIds={!editing && companyId ? [companyId] : undefined}
          defaultContactIds={!editing && contactId ? [contactId] : undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={saved => {
            if (editing) setNotes(ns => ns.map(n => n.id === saved.id ? saved : n));
            else setNotes(ns => [saved, ...ns]);
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
