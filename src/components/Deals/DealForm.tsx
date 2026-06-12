'use client';

import { useEffect, useState } from 'react';
import { Deal, DealType, DealStage, DealRole, Company, Meeting } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils';
import { CalendarDays, FileText } from 'lucide-react';
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

type Tab = 'details' | 'timeline';

interface TimelineNote {
  id: string;
  title: string;
  date: string;
  meeting_id?: string | null;
}

export function DealForm({ deal, onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);
  const [timeline, setTimeline] = useState<{ meetings: Meeting[]; notes: TimelineNote[] }>({ meetings: [], notes: [] });
  const [loadingTimeline, setLoadingTimeline] = useState(false);

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

  useEffect(() => {
    if (!deal || activeTab !== 'timeline') return;
    setLoadingTimeline(true);
    Promise.all([
      fetch(`/api/meetings?deal_id=${deal.id}`).then(r => r.json()),
      deal.company_id ? fetch(`/api/notes?company_id=${deal.company_id}`).then(r => r.json()) : Promise.resolve([]),
    ]).then(([meetings, notes]) => {
      setTimeline({
        meetings: Array.isArray(meetings) ? meetings : [],
        notes: Array.isArray(notes) ? notes : [],
      });
    }).catch(() => {}).finally(() => setLoadingTimeline(false));
  }, [deal, activeTab]);

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

  // Build chronological timeline entries
  const timelineEntries = [
    ...timeline.meetings.map(m => ({
      type: 'meeting' as const,
      date: m.date_time,
      label: m.agenda || m.meeting_type,
      sub: m.company?.name ?? '',
      badge: m.meeting_type,
      id: m.id,
    })),
    ...timeline.notes.map(n => ({
      type: 'note' as const,
      date: n.date,
      label: n.title || n.date,
      sub: n.meeting_id ? 'Linked to meeting' : '',
      badge: '',
      id: n.id,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Modal
      open
      onClose={onClose}
      title={deal ? `Edit: ${deal.name}` : 'Add Deal'}
      size="lg"
    >
      {deal && (
        <div className="flex border-b border-[#1e2a3a] px-5">
          {(['details', 'timeline'] as Tab[]).map(tab => (
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

      {activeTab === 'timeline' && deal ? (
        <div className="p-5">
          {loadingTimeline ? (
            <p className="text-xs text-slate-600 text-center py-8">Loading...</p>
          ) : timelineEntries.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-8">No meetings or notes linked to this deal yet.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[#1e2a3a]" />
              <div className="space-y-4 pl-10">
                {timelineEntries.map(entry => (
                  <div key={`${entry.type}-${entry.id}`} className="relative">
                    <div className={`absolute -left-[26px] w-4 h-4 rounded-full flex items-center justify-center ${
                      entry.type === 'meeting' ? 'bg-violet-600/30 border border-violet-600' : 'bg-blue-600/30 border border-blue-600'
                    }`}>
                      {entry.type === 'meeting'
                        ? <CalendarDays size={8} className="text-violet-400" />
                        : <FileText size={8} className="text-blue-400" />
                      }
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300 truncate">{entry.label}</p>
                        {entry.sub && <p className="text-[11px] text-slate-600">{entry.sub}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {entry.badge && <Badge value={entry.badge} className="text-[10px]" />}
                        <span className="text-[11px] text-slate-600 num whitespace-nowrap">
                          {entry.type === 'meeting' ? formatDateTime(entry.date) : entry.date}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Deal Name *"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Project Falcon"
              />
            </div>

            <Select
              label="Company"
              value={form.company_id}
              onChange={e => set('company_id', e.target.value)}
              options={companyOpts}
            />

            <Select
              label="Deal Type *"
              value={form.deal_type}
              onChange={e => set('deal_type', e.target.value)}
              options={DEAL_TYPE_OPTS as { value: string; label: string }[]}
            />

            <Select
              label="Stage"
              value={form.stage}
              onChange={e => set('stage', e.target.value)}
              options={STAGE_OPTS}
            />

            <Select
              label="Role"
              value={form.role}
              onChange={e => set('role', e.target.value)}
              options={ROLE_OPTS}
            />

            <Input
              label="Estimated Fee ($)"
              type="number"
              min="0"
              step="any"
              value={form.estimated_fee}
              onChange={e => set('estimated_fee', e.target.value)}
              placeholder="1500000"
            />

            <Input
              label="Expected Close Date"
              type="date"
              value={form.expected_close_date}
              onChange={e => set('expected_close_date', e.target.value)}
            />

            <div className="col-span-2">
              <Input
                label="Deal Team (comma-separated)"
                value={form.deal_team}
                onChange={e => set('deal_team', e.target.value)}
                placeholder="Alice Chen, Bob Smith, Carol Wang"
              />
            </div>

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
      )}
    </Modal>
  );
}
