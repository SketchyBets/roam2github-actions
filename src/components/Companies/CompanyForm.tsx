'use client';

import { useEffect, useState } from 'react';
import { Company } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TagBadge } from '@/components/ui/Badge';
import { PinnedNotes } from '@/components/Notes/PinnedNotes';
import { X, Plus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  company: Company | null;
  onClose: () => void;
  onSave: (c: Company) => void;
}

const STATUS_OPTS = [
  { value: 'Active', label: 'Active' },
  { value: 'Watch', label: 'Watch' },
  { value: 'Inactive', label: 'Inactive' },
];

const SECTORS = ['Technology', 'Healthcare', 'Financial Services', 'Industrials', 'Consumer', 'Energy', 'Real Estate', 'Media', 'Other'].map(s => ({ value: s, label: s }));

type Tab = 'details' | 'notes';

export function CompanyForm({ company, onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [form, setForm] = useState({
    name: company?.name ?? '',
    ticker: company?.ticker ?? '',
    exchange: company?.exchange ?? '',
    sector: company?.sector ?? '',
    industry: company?.industry ?? '',
    sub_sector: company?.sub_sector ?? '',
    hq_location: company?.hq_location ?? '',
    coverage_status: company?.coverage_status ?? 'Active',
    relationship_owner: company?.relationship_owner ?? '',
    notes: company?.notes ?? '',
    tags: company?.tags ?? [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<Company[]>([]);

  // Duplicate detection for new companies
  useEffect(() => {
    if (company || !form.name.trim() || form.name.trim().length < 2) {
      setDuplicates([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies?search=${encodeURIComponent(form.name)}`);
        const data = await res.json();
        setDuplicates((data ?? []).slice(0, 3));
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [form.name, company]);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function addTag() {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Company name is required');
    setSaving(true);
    try {
      const url = company ? `/api/companies/${company.id}` : '/api/companies';
      const method = company ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(company ? 'Company updated' : 'Company added');
      onSave(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={company ? `Edit: ${company.name}` : 'Add Company'}
      size="lg"
    >
      {company && (
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

      {activeTab === 'notes' && company ? (
        <div className="p-5">
          <PinnedNotes companyId={company.id} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {duplicates.length > 0 && !company && (
            <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/40 rounded-md p-3">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-300">
                <span className="font-medium">Possible duplicates:</span>{' '}
                {duplicates.map(d => d.name).join(', ')}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Company Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Corp" />
            </div>
            <Input label="Ticker" value={form.ticker} onChange={e => set('ticker', e.target.value)} placeholder="ACME" />
            <Input label="Exchange" value={form.exchange} onChange={e => set('exchange', e.target.value)} placeholder="NYSE" />
            <Select label="Sector" value={form.sector} onChange={e => set('sector', e.target.value)}
              options={[{ value: '', label: '— Select —' }, ...SECTORS]} />
            <Input label="Industry" value={form.industry} onChange={e => set('industry', e.target.value)} />
            <Input label="Sub-Sector" value={form.sub_sector} onChange={e => set('sub_sector', e.target.value)} />
            <Input label="HQ Location" value={form.hq_location} onChange={e => set('hq_location', e.target.value)} placeholder="New York, NY" />
            <Select label="Coverage Status" value={form.coverage_status} onChange={e => set('coverage_status', e.target.value)}
              options={STATUS_OPTS} />
            <Input label="Relationship Owner" value={form.relationship_owner} onChange={e => set('relationship_owner', e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add tag..."
                className="input-field flex-1 text-xs py-1.5"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addTag}><Plus size={12} /></Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1">
                    <TagBadge tag={t} />
                    <button type="button" onClick={() => set('tags', form.tags.filter(x => x !== t))} className="text-slate-600 hover:text-red-400">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Textarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Coverage rationale, key relationships..." />

          <div className="flex gap-2 justify-end pt-2 border-t border-[#1e2a3a]">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : company ? 'Update' : 'Add Company'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
