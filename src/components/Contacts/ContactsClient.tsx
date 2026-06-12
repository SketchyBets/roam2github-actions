'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Download, Upload, Search, Users, Trash2 } from 'lucide-react';
import { Contact, RelationshipTier } from '@/types';
import { formatDate } from '@/lib/utils';
import { Badge, TagBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ContactForm } from './ContactForm';
import toast from 'react-hot-toast';
import { parseCSVImport } from '@/lib/export';
import { trackView } from '@/lib/recentlyViewed';

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Keyboard shortcut: open new contact form
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingNew');
    if (pending === 'contact') {
      sessionStorage.removeItem('pendingNew');
      setEditing(null);
      setShowForm(true);
    }
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === 'contact') {
        sessionStorage.removeItem('pendingNew');
        setEditing(null);
        setShowForm(true);
      }
    };
    window.addEventListener('open-new-modal', handler);
    return () => window.removeEventListener('open-new-modal', handler);
  }, []);

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
      setSelected(new Set());
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [filterTier, filterCompanyId, search]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const sorted = [...contacts].sort((a, b) => {
    let av = '', bv = '';
    if (sortField === 'full_name') { av = a.full_name ?? ''; bv = b.full_name ?? ''; }
    else if (sortField === 'relationship_tier') { av = a.relationship_tier ?? ''; bv = b.relationship_tier ?? ''; }
    else if (sortField === 'last_contact_date') { av = a.last_contact_date ?? ''; bv = b.last_contact_date ?? ''; }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(c => c.id)));
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

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const ids = Array.from(selected);
    let deleted = 0;
    for (const id of ids) {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) deleted++;
    }
    toast.success(`Deleted ${deleted} contacts`);
    setContacts(cs => cs.filter(c => !selected.has(c.id)));
    setSelected(new Set());
    setBulkDeleting(false);
    setShowBulkConfirm(false);
  }

  function handleExport() {
    const link = document.createElement('a');
    link.href = '/api/export?module=contacts';
    link.click();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const loadingToast = toast.loading('Importing contacts...');
    try {
      const rows = await parseCSVImport(file);
      if (rows.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('No rows found in file');
        e.target.value = '';
        return;
      }
      // Build company name → id map for auto-matching
      const companiesRes = await fetch('/api/companies?limit=500');
      const companiesData = companiesRes.ok ? await companiesRes.json() : [];
      const companyMap: Record<string, string> = {};
      (companiesData ?? []).forEach((c: { id: string; name: string }) => {
        companyMap[c.name.trim().toLowerCase()] = c.id;
      });

      let imported = 0;
      const errors: string[] = [];
      for (const row of rows) {
        const firstName = row['First Name'] || row['first_name'] || '';
        const lastName = row['Last Name'] || row['last_name'] || '';
        const full_name =
          (firstName && lastName) ? `${firstName} ${lastName}`.trim()
          : firstName || lastName
          || row['full_name'] || row['Full Name'] || row['Name'] || row['name'] || '';
        if (!full_name) continue;
        const companyName = (row['Company'] || row['Company Name'] || row['Employer'] || row['company'] || '').trim();
        const company_id = companyName ? (companyMap[companyName.toLowerCase()] ?? null) : null;
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name,
            title: row['title'] || row['Title'] || row['Job Title'] || null,
            email: row['email'] || row['Email'] || row['Email Address'] || null,
            phone: row['phone'] || row['Phone'] || row['Business Phone'] || row['Mobile'] || null,
            linkedin_url: row['linkedin_url'] || row['LinkedIn'] || null,
            relationship_tier: row['relationship_tier'] || row['Tier'] || 'Tier 3',
            notes: row['notes'] || row['Notes'] || null,
            company_id,
            tags: [],
          }),
        });
        if (res.ok) {
          imported++;
        } else {
          const err = await res.json().catch(() => ({}));
          errors.push(err.error ?? 'Unknown error');
        }
      }
      toast.dismiss(loadingToast);
      if (imported > 0) {
        toast.success(`Imported ${imported} of ${rows.length} contacts`);
        fetchContacts();
      } else {
        toast.error(`Import failed: ${errors[0] ?? 'No contacts imported'}`);
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err instanceof Error ? err.message : 'Import failed');
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

  const allSelected = sorted.length > 0 && selected.size === sorted.length;
  const someSelected = selected.size > 0;

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
          {someSelected && (
            <Button variant="danger" size="sm" onClick={() => setShowBulkConfirm(true)}>
              <Trash2 size={13} /> Delete {selected.size}
            </Button>
          )}
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
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-[#1e2a3a] bg-[#070d1a] accent-blue-500 cursor-pointer"
                    />
                  </th>
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
                    className={`border-b border-[#111f3d] hover:bg-[#0d1730] transition-colors cursor-pointer ${selected.has(c.id) ? 'bg-blue-900/10' : ''}`}
                    onClick={() => { setEditing(c); setShowForm(true); trackView({ type: 'contact', id: c.id, name: c.full_name, url: '/contacts' }); }}
                  >
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(c.id); }}>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="w-3.5 h-3.5 rounded border-[#1e2a3a] bg-[#070d1a] accent-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200 text-sm">{c.full_name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{c.title || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {c.company ? <span className="text-blue-400">{c.company.name}</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm" onClick={e => e.stopPropagation()}>
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-blue-400 hover:underline" onClick={e => e.stopPropagation()}>
                          {c.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3"><Badge value={c.relationship_tier} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 num">{formatDate(c.last_contact_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {(c.tags ?? []).slice(0, 2).map(t => <TagBadge key={t} tag={t} />)}
                        {(c.tags ?? []).length > 2 && <span className="text-xs text-slate-600">+{c.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setDeleting(c)} className="text-slate-700 hover:text-red-400 text-xs transition-colors">
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
        {someSelected && <span className="ml-2 text-blue-400">· {selected.size} selected</span>}
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

      <ConfirmDialog
        open={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Contacts"
        message={`Are you sure you want to delete ${selected.size} contacts? This cannot be undone.`}
        loading={bulkDeleting}
      />
    </div>
  );
}
