'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Download, Upload, Search, Building2, ExternalLink } from 'lucide-react';
import { Company } from '@/types';
import { formatDate } from '@/lib/utils';
import { Badge, TagBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CompanyForm } from './CompanyForm';
import toast from 'react-hot-toast';
import { parseCSVImport } from '@/lib/export';

const COVERAGE_STATUSES = ['Active', 'Watch', 'Inactive'];
const SECTORS = ['Technology', 'Healthcare', 'Financial Services', 'Industrials', 'Consumer', 'Energy', 'Real Estate', 'Media', 'Other'];

export function CompaniesClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sortField, setSortField] = useState<keyof Company>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterSector) params.set('sector', filterSector);
    if (search) params.set('search', search);
    const res = await fetch(`/api/companies?${params}`);
    const data = await res.json();
    setCompanies(data ?? []);
    setLoading(false);
  }, [filterStatus, filterSector, search]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const sorted = [...companies].sort((a, b) => {
    const av = String(a[sortField] ?? '');
    const bv = String(b[sortField] ?? '');
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  function toggleSort(field: keyof Company) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/companies/${deleting.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Company deleted');
      setCompanies(cs => cs.filter(c => c.id !== deleting.id));
    } else toast.error('Failed to delete');
    setDeleteLoading(false);
    setDeleting(null);
  }

  async function handleExport() {
    const link = document.createElement('a');
    link.href = '/api/export?module=companies';
    link.click();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseCSVImport(file);
      let imported = 0;
      for (const row of rows) {
        const res = await fetch('/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: row['name'] || row['Company Name'] || row['Company'],
            ticker: row['ticker'] || row['Ticker'],
            sector: row['sector'] || row['Sector'],
            industry: row['industry'] || row['Industry'],
            hq_location: row['hq_location'] || row['Location'] || row['HQ'],
            coverage_status: row['coverage_status'] || row['Status'] || 'Active',
            relationship_owner: row['relationship_owner'] || row['Owner'],
            notes: row['notes'] || row['Notes'],
            tags: [],
          }),
        });
        if (res.ok) imported++;
      }
      toast.success(`Imported ${imported} companies`);
      fetchCompanies();
    } catch {
      toast.error('Import failed');
    }
    e.target.value = '';
  }

  const SortHeader = ({ field, label }: { field: keyof Company; label: string }) => (
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
            placeholder="Search companies..."
            className="w-full input-field pl-8 py-1.5 text-xs"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-field w-auto text-xs py-1.5">
          <option value="">All Status</option>
          {COVERAGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="select-field w-auto text-xs py-1.5">
          <option value="">All Sectors</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport}><Download size={13} /> Export</Button>
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md font-medium hover:bg-[#0d1730] text-slate-400 hover:text-slate-200 transition-colors">
            <Upload size={13} /> Import
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleImport} />
          </label>
          <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={13} /> Add Company
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-600 text-sm">Loading...</div>
        ) : !sorted.length ? (
          <EmptyState
            icon={Building2}
            title="No companies found"
            description="Add your first company to start building your coverage universe."
            action={<Button variant="primary" size="sm" onClick={() => setShowForm(true)}><Plus size={13} /> Add Company</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <SortHeader field="name" label="Company" />
                  <SortHeader field="sector" label="Sector" />
                  <SortHeader field="coverage_status" label="Status" />
                  <SortHeader field="relationship_owner" label="Owner" />
                  <SortHeader field="last_activity_date" label="Last Activity" />
                  <th className="px-4 py-3 text-xs text-slate-400 uppercase tracking-wider">Tags</th>
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
                      <div className="font-medium text-slate-200 text-sm">{c.name}</div>
                      {c.ticker && <div className="text-xs text-slate-600 num">{c.ticker}{c.exchange ? ` · ${c.exchange}` : ''}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{c.sector || '—'}</td>
                    <td className="px-4 py-3"><Badge value={c.coverage_status} /></td>
                    <td className="px-4 py-3 text-sm text-slate-400">{c.relationship_owner || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 num">{formatDate(c.last_activity_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).slice(0, 2).map(t => <TagBadge key={t} tag={t} />)}
                        {(c.tags ?? []).length > 2 && <span className="text-xs text-slate-600">+{c.tags.length - 2}</span>}
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

      <p className="text-xs text-slate-600">{sorted.length} {sorted.length === 1 ? 'company' : 'companies'}</p>

      {showForm && (
        <CompanyForm
          company={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={(saved) => {
            if (editing) setCompanies(cs => cs.map(c => c.id === saved.id ? saved : c));
            else setCompanies(cs => [saved, ...cs]);
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        loading={deleteLoading}
      />
    </div>
  );
}
