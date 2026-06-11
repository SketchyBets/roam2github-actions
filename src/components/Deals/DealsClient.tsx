'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutGrid,
  List,
  Plus,
  Download,
  Briefcase,
  ChevronUp,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { Deal, DealStage, DealType } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DealForm } from './DealForm';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: DealStage[] = [
  'Prospect',
  'Pitching',
  'Mandate Won',
  'In Execution',
  'Closing',
  'Closed',
  'Dead',
];

const DEAL_TYPES: DealType[] = [
  'M&A Buy-side',
  'M&A Sell-side',
  'Capital Raise',
  'IPO',
  'Debt Advisory',
  'Other',
];

const STAGE_ACCENT: Record<DealStage, string> = {
  Prospect: 'border-t-slate-600',
  Pitching: 'border-t-blue-500',
  'Mandate Won': 'border-t-violet-500',
  'In Execution': 'border-t-cyan-500',
  Closing: 'border-t-amber-500',
  Closed: 'border-t-emerald-500',
  Dead: 'border-t-red-600',
};

const STAGE_HEADER_TEXT: Record<DealStage, string> = {
  Prospect: 'text-slate-400',
  Pitching: 'text-blue-400',
  'Mandate Won': 'text-violet-400',
  'In Execution': 'text-cyan-400',
  Closing: 'text-amber-400',
  Closed: 'text-emerald-400',
  Dead: 'text-red-400',
};

// ─── Sort helper ──────────────────────────────────────────────────────────────

type SortField = 'name' | 'deal_type' | 'stage' | 'role' | 'estimated_fee' | 'expected_close_date' | 'updated_at';

function compareDeals(a: Deal, b: Deal, field: SortField, dir: 'asc' | 'desc'): number {
  let av: string | number = '';
  let bv: string | number = '';

  if (field === 'estimated_fee') {
    av = a.estimated_fee ?? -1;
    bv = b.estimated_fee ?? -1;
    return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  }

  if (field === 'expected_close_date') {
    av = a.expected_close_date ?? '';
    bv = b.expected_close_date ?? '';
  } else if (field === 'updated_at') {
    av = a.updated_at ?? '';
    bv = b.updated_at ?? '';
  } else if (field === 'name') {
    av = a.name ?? '';
    bv = b.name ?? '';
  } else if (field === 'deal_type') {
    av = a.deal_type ?? '';
    bv = b.deal_type ?? '';
  } else if (field === 'stage') {
    av = STAGES.indexOf(a.stage);
    bv = STAGES.indexOf(b.stage);
    return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  } else if (field === 'role') {
    av = a.role ?? '';
    bv = b.role ?? '';
  }

  return dir === 'asc'
    ? String(av).localeCompare(String(bv))
    : String(bv).localeCompare(String(av));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortHeader({
  field,
  label,
  current,
  dir,
  onSort,
  className = '',
}: {
  field: SortField;
  label: string;
  current: SortField;
  dir: 'asc' | 'desc';
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const active = current === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-slate-200 ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
        ) : (
          <span className="w-3" />
        )}
      </span>
    </th>
  );
}

interface KanbanCardProps {
  deal: Deal;
  onClick: () => void;
}

function KanbanCard({ deal, onClick }: KanbanCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-[#070d1a] border border-[#1e2a3a] rounded-md p-3 cursor-pointer hover:bg-[#0d1730] hover:border-[#2a3a50] transition-all space-y-2"
    >
      <div className="font-medium text-slate-200 text-sm leading-tight">{deal.name}</div>
      {deal.company && (
        <div className="text-xs text-slate-500 truncate">{deal.company.name}</div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge value={deal.deal_type} />
      </div>
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-xs text-slate-600 num">
          {deal.expected_close_date ? formatDate(deal.expected_close_date) : '—'}
        </span>
        {deal.estimated_fee != null && (
          <span className="text-xs font-medium text-slate-400 num">
            {formatCurrency(deal.estimated_fee)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DealsClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('deal_type', filterType);
      const res = await fetch(`/api/deals?${params}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setDeals(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  const filtered = filterType ? deals.filter(d => d.deal_type === filterType) : deals;
  const sorted = [...filtered].sort((a, b) => compareDeals(a, b, sortField, sortDir));

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/deals/${deleting.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Deal deleted');
        setDeals(ds => ds.filter(d => d.id !== deleting.id));
      } else {
        throw new Error('Delete failed');
      }
    } catch {
      toast.error('Failed to delete deal');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  function handleExport() {
    const link = document.createElement('a');
    link.href = '/api/export?module=deals';
    link.click();
  }

  function openAdd() { setEditing(null); setShowForm(true); }
  function openEdit(deal: Deal) { setEditing(deal); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  function handleSave(saved: Deal) {
    if (editing) setDeals(ds => ds.map(d => d.id === saved.id ? saved : d));
    else setDeals(ds => [saved, ...ds]);
    closeForm();
  }

  return (
    <div className="space-y-4 animate-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View Toggle */}
        <div className="flex items-center bg-[#0a1225] border border-[#1e2a3a] rounded-md p-0.5">
          <button
            onClick={() => setView('table')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              view === 'table'
                ? 'bg-[#162549] text-slate-200'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <List size={13} /> Table
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
              view === 'kanban'
                ? 'bg-[#162549] text-slate-200'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutGrid size={13} /> Kanban
          </button>
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="select-field w-auto text-xs py-1.5"
        >
          <option value="">All Types</option>
          {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={13} /> Export
          </Button>
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus size={13} /> Add Deal
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-slate-600 text-sm">Loading...</div>
      ) : !sorted.length ? (
        <div className="card">
          <EmptyState
            icon={Briefcase}
            title="No deals found"
            description="Add your first deal to start tracking your pipeline."
            action={
              <Button variant="primary" size="sm" onClick={openAdd}>
                <Plus size={13} /> Add Deal
              </Button>
            }
          />
        </div>
      ) : view === 'table' ? (
        <TableView
          deals={sorted}
          sortField={sortField}
          sortDir={sortDir}
          onSort={toggleSort}
          onEdit={openEdit}
          onDelete={d => setDeleting(d)}
        />
      ) : (
        <KanbanView deals={sorted} onEdit={openEdit} />
      )}

      {sorted.length > 0 && (
        <p className="text-xs text-slate-600">{sorted.length} {sorted.length === 1 ? 'deal' : 'deals'}</p>
      )}

      {showForm && (
        <DealForm deal={editing} onClose={closeForm} onSave={handleSave} />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Deal"
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        loading={deleteLoading}
      />
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  deals,
  sortField,
  sortDir,
  onSort,
  onEdit,
  onDelete,
}: {
  deals: Deal[];
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onSort: (f: SortField) => void;
  onEdit: (d: Deal) => void;
  onDelete: (d: Deal) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <SortHeader field="name" label="Deal Name" current={sortField} dir={sortDir} onSort={onSort} />
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Company</th>
              <SortHeader field="deal_type" label="Type" current={sortField} dir={sortDir} onSort={onSort} />
              <SortHeader field="stage" label="Stage" current={sortField} dir={sortDir} onSort={onSort} />
              <SortHeader field="role" label="Role" current={sortField} dir={sortDir} onSort={onSort} />
              <SortHeader field="estimated_fee" label="Est. Fee" current={sortField} dir={sortDir} onSort={onSort} />
              <SortHeader field="expected_close_date" label="Expected Close" current={sortField} dir={sortDir} onSort={onSort} />
              <SortHeader field="updated_at" label="Last Updated" current={sortField} dir={sortDir} onSort={onSort} />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {deals.map(deal => (
              <tr
                key={deal.id}
                className="border-b border-[#111f3d] hover:bg-[#0d1730] transition-colors cursor-pointer"
                onClick={() => onEdit(deal)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-200 text-sm">{deal.name}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {deal.company?.name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge value={deal.deal_type} />
                </td>
                <td className="px-4 py-3">
                  <Badge value={deal.stage} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{deal.role}</td>
                <td className="px-4 py-3 text-sm text-slate-300 num font-medium">
                  {deal.estimated_fee != null ? formatCurrency(deal.estimated_fee) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 num">
                  {formatDate(deal.expected_close_date)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 num">
                  {formatDate(deal.updated_at)}
                </td>
                <td
                  className="px-4 py-3"
                  onClick={e => { e.stopPropagation(); onDelete(deal); }}
                >
                  <button className="text-slate-700 hover:text-red-400 transition-colors p-1 rounded">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({
  deals,
  onEdit,
}: {
  deals: Deal[];
  onEdit: (d: Deal) => void;
}) {
  const byStage = STAGES.reduce<Record<DealStage, Deal[]>>((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage);
    return acc;
  }, {} as Record<DealStage, Deal[]>);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {STAGES.map(stage => {
          const stageDeals = byStage[stage];
          return (
            <div
              key={stage}
              className={`flex flex-col w-56 rounded-lg bg-[#0a1225] border border-[#1e2a3a] border-t-2 ${STAGE_ACCENT[stage]} overflow-hidden`}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-[#1e2a3a] flex items-center justify-between flex-shrink-0">
                <span className={`text-xs font-semibold uppercase tracking-wider ${STAGE_HEADER_TEXT[stage]}`}>
                  {stage}
                </span>
                <span className="text-xs text-slate-600 bg-[#070d1a] border border-[#1e2a3a] rounded-full px-1.5 py-0.5 num">
                  {stageDeals.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-260px)] min-h-[120px]">
                {stageDeals.length === 0 ? (
                  <div className="flex items-center justify-center h-16 text-xs text-slate-700">
                    No deals
                  </div>
                ) : (
                  stageDeals.map(deal => (
                    <KanbanCard key={deal.id} deal={deal} onClick={() => onEdit(deal)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
