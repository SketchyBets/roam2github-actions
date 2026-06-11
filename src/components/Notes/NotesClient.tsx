'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, FileText } from 'lucide-react';
import { Note, OutlinerItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NoteForm } from './NoteForm';
import toast from 'react-hot-toast';

export function NotesClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/notes?${params}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/notes/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Note deleted');
      setNotes(ns => ns.filter(n => n.id !== deleting.id));
    } catch {
      toast.error('Failed to delete note');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  function contentPreview(content: OutlinerItem[]) {
    return (content ?? []).slice(0, 2).map(i => i.text).filter(Boolean).join(' · ') || null;
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full input-field pl-8 py-1.5 text-xs"
          />
        </div>
        <div className="ml-auto">
          <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={13} /> New Note
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-600 text-sm">Loading...</div>
      ) : !notes.length ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="No notes yet"
            description="Capture meeting insights and daily notes linked to companies and contacts."
            action={
              <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
                <Plus size={13} /> New Note
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map(note => {
            const preview = contentPreview(note.content);
            return (
              <div
                key={note.id}
                className="card p-4 cursor-pointer hover:border-[#2a3a54] transition-colors"
                onClick={() => { setEditing(note); setShowForm(true); }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-500 num">{formatDate(note.date)}</span>
                      {note.meeting && (
                        <span className="text-xs bg-[#1e2a3a] text-slate-400 px-1.5 py-0.5 rounded">
                          {(note.meeting as { title?: string }).title ?? 'Meeting'}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-slate-200 text-sm mb-1">
                      {note.title || note.date}
                    </div>
                    {preview && (
                      <div className="text-xs text-slate-600 truncate">{preview}</div>
                    )}
                    {((note.companies?.length ?? 0) > 0 || (note.contacts?.length ?? 0) > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.companies?.map(c => (
                          <span key={c.id} className="text-xs bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">
                            {c.name}
                          </span>
                        ))}
                        {note.contacts?.map(c => (
                          <span key={c.id} className="text-xs bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded">
                            {c.full_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleting(note); }}
                    className="text-slate-700 hover:text-red-400 text-xs transition-colors flex-shrink-0 mt-0.5"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-600">
        {notes.length} {notes.length === 1 ? 'note' : 'notes'}
      </p>

      {showForm && (
        <NoteForm
          note={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={saved => {
            if (editing) setNotes(ns => ns.map(n => n.id === saved.id ? saved : n));
            else setNotes(ns => [saved, ...ns]);
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Note"
        message="Are you sure you want to delete this note? This cannot be undone."
        loading={deleteLoading}
      />
    </div>
  );
}
