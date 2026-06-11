'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Download, Upload, Search, Users } from 'lucide-react';
import { Contact, RelationshipTier } from '@/types';
import { formatDate } from '@/lib/utils';
import { Badge, TagBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ContactForm } from './ContactForm';
import toast from 'react-hot-toast';
import { parseCSVImport } from '@/lib/export';

const TIERS: RelationshipTier[] = ['Tier 1', 'Tier 2', 'Tier 3'];

type SortField = 'full_name' | 'relationship_tier' | 'last_contact_date';

export function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('full_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTier) params.set('tier', filterTier);
      if (filterCompanyId) params.set('company_id', filterCompanyId);
      if (search) params.set('search', search);
      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) throw new Error('Failed to load contacts');
      const data = await res.json();
      setContacts(data ?? []);
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [filterTier, filterCompanyId, search]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const sorted = [...contacts].sort((a, b) => {
    let av = '';
    let bv = '';
    if (sortField === 'full_name') {
      av = a.full_name ?? '';
      bv = b.full_name ?? '';
    } else if (sortField === 'relationship_tier') {
      av = a.relationship_tier ?? '';
      bv = b.relationship_tier ?? '';
    } else if (sortField === 'last_contact_date') {
      av = a.last_contact_date ?? '';
      bv = b.last_contact_date ?? '';
    }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/contacts/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Contact deleted');
      setContacts(cs => cs.filter(c => c.id !== deleting.id));
    } catch {
      toast.error('Failed to delete contact');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  function handleExport() {
    const link = document.createElement('a');
    link.href = '/api/export?module=contacts';
    link.click();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseCSVImport(file);
      let imported = 0;
      for (const row of rows) {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: row['full_name'] || row['Full Name'] || row['Name'],
            title: row['title'] || row['Title'],
            email: row['email'] || row['Email'],
            phone: row['phone'] || row['Phone'],
            linkedin_url: row['linkedin_url'] || row['LinkedIn'],
            relationship_tier: row['relationship_tier'] || row['Tier'] || 'Tier 3',
            notes: row['notes'] || row['Notes'],
            tags: [],
          }),
        });
        if (res.ok) imported++;
      }
      toast.success(`Imported ${imported} contacts`);
      fetchContacts();
    } catch {
      toast.error('Import failed');
    }
    e.target.value = '';
  }

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-200 select-none"
      onClick={() => toggleSort(field)}
    >
      {label} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="space-y-4 animate-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full input-field pl-8 py-1.5 text-xs"
          />
        </div>
        <select
          value={filterTier}
          onChange={e => setFilterTier(e.target.value)}
          className="select-field w-auto text-xs py-1.5"
        >
          <option value="">All Tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={13} /> Export
          </Button>
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md font-medium hover:bg-[#0d1730] text-slate-400 hover:text-slate-200 transition-colors">
            <Upload size={13} /> Import
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleImport} />
          </label>
          <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={13} /> Add Contact
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-600 text-sm">Loading...</div>
        ) : !sorted.length ? (
          <EmptyState
            icon={Users}
            title="No contacts found"
            description="Add your first contact to start building your network."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
                <Plus size={13} /> Add Contact
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <SortHeader field="full_name" label="Full Name" />
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Title</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Company</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Email</th>
                  <SortHeader field="relationship_tier" label="Tier" />
                  <SortHeader field="last_contact_date" label="Last Contact" />
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Tags</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#111f3d] hover:bg-[#0d1730] transition-colors cursor-pointer"
                    onClick={() => { setEditing(c); setShowForm(true); }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200 text-sm">{c.full_name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{c.title || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {c.company ? (
                        <span className="text-blue-400 hover:text-blue-300">{c.company.name}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm" onClick={e => e.stopPropagation()}>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          {c.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={c.relationship_tier} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 num">
                      {formatDate(c.last_contact_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {(c.tags ?? []).slice(0, 2).map(t => <TagBadge key={t} tag={t} />)}
                        {(c.tags ?? []).length > 2 && (
                          <span className="text-xs text-slate-600">+{c.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setDeleting(c)}
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
        {sorted.length} {sorted.length === 1 ? 'contact' : 'contacts'}
      </p>

      {showForm && (
        <ContactForm
          contact={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={(saved) => {
            if (editing) setContacts(cs => cs.map(c => c.id === saved.id ? saved : c));
            else setContacts(cs => [saved, ...cs]);
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete "${deleting?.full_name}"? This cannot be undone.`}
        loading={deleteLoading}
      />
    </div>
  );
}
