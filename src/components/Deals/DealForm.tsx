'use client';

import { useEffect, useState } from 'react';
import { Deal, DealType, DealStage, DealRole, Company } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Props {
  deal: Deal | null;
  onClose: () => void;
  onSave: (d: Deal) => void;
}

const DEAL_TYPE_OPTS: { value: DealType | ''; label: string }[] = [
  { value: '', label: '— Select Type —' },
  { value: 'M&A Buy-side', label: 'M&A Buy-side' },
  { value: 'M&A Sell-side', label: 'M&A Sell-side' },
  { value: 'Capital Raise', label: 'Capital Raise' },
  { value: 'IPO', label: 'IPO' },
  { value: 'Debt Advisory', label: 'Debt Advisory' },
  { value: 'Other', label: 'Other' },
];

const STAGE_OPTS: { value: DealStage; label: string }[] = [
  { value: 'Prospect', label: 'Prospect' },
  { value: 'Pitching', label: 'Pitching' },
  { value: 'Mandate Won', label: 'Mandate Won' },
  { value: 'In Execution', label: 'In Execution' },
  { value: 'Closing', label: 'Closing' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Dead', label: 'Dead' },
];

const ROLE_OPTS: { value: DealRole; label: string }[] = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Co-advisor', label: 'Co-advisor' },
  { value: 'Subadvisor', label: 'Subadvisor' },
];

export function DealForm({ deal, onClose, onSave }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: deal?.name ?? '',
    company_id: deal?.company_id ?? '',
    deal_type: (deal?.deal_type ?? '') as DealType | '',
    stage: (deal?.stage ?? 'Prospect') as DealStage,
    role: (deal?.role ?? 'Lead') as DealRole,
    estimated_fee: deal?.estimated_fee != null ? String(deal.estimated_fee) : '',
    expected_close_date: deal?.expected_close_date
      ? deal.expected_close_date.slice(0, 10)
      : '',
    deal_team: deal?.deal_team ? deal.deal_team.join(', ') : '',
    notes: deal?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch('/api/companies?limit=200')
      .then(r => r.json())
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const companyOpts = [
    { value: '', label: '— No Company —' },
    ...companies.map(c => ({ value: c.id, label: c.name })),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Deal name is required');
    if (!form.deal_type) return toast.error('Deal type is required');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        company_id: form.company_id || null,
        deal_type: form.deal_type,
        stage: form.stage,
        role: form.role,
        estimated_fee: form.estimated_fee ? Number(form.estimated_fee) : null,
        expected_close_date: form.expected_close_date || null,
        deal_team: form.deal_team
          ? form.deal_team.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        notes: form.notes,
      };

      const url = deal ? `/api/deals/${deal.id}` : '/api/deals';
      const method = deal ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast.success(deal ? 'Deal updated' : 'Deal added');
      onSave(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={deal ? `Edit: ${deal.name}` : 'Add Deal'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div className="col-span-2">
            <Input
              label="Deal Name *"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Project Falcon"
            />
          </div>

          {/* Company */}
          <Select
            label="Company"
            value={form.company_id}
            onChange={e => set('company_id', e.target.value)}
            options={companyOpts}
          />

          {/* Deal Type */}
          <Select
            label="Deal Type *"
            value={form.deal_type}
            onChange={e => set('deal_type', e.target.value)}
            options={DEAL_TYPE_OPTS as { value: string; label: string }[]}
          />

          {/* Stage */}
          <Select
            label="Stage"
            value={form.stage}
            onChange={e => set('stage', e.target.value)}
            options={STAGE_OPTS}
          />

          {/* Role */}
          <Select
            label="Role"
            value={form.role}
            onChange={e => set('role', e.target.value)}
            options={ROLE_OPTS}
          />

          {/* Estimated Fee */}
          <Input
            label="Estimated Fee ($)"
            type="number"
            min="0"
            step="any"
            value={form.estimated_fee}
            onChange={e => set('estimated_fee', e.target.value)}
            placeholder="1500000"
          />

          {/* Expected Close */}
          <Input
            label="Expected Close Date"
            type="date"
            value={form.expected_close_date}
            onChange={e => set('expected_close_date', e.target.value)}
          />

          {/* Deal Team */}
          <div className="col-span-2">
            <Input
              label="Deal Team (comma-separated)"
              value={form.deal_team}
              onChange={e => set('deal_team', e.target.value)}
              placeholder="Alice Chen, Bob Smith, Carol Wang"
            />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={4}
              placeholder="Deal background, key considerations, status updates..."
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-[#1e2a3a]">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : deal ? 'Update Deal' : 'Add Deal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
