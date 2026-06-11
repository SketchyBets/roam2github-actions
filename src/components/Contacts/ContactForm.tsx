'use client';

import { useEffect, useState } from 'react';
import { Contact, Company, RelationshipTier } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TagBadge } from '@/components/ui/Badge';
import { X, Plus, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  contact: Contact | null;
  onClose: () => void;
  onSave: (c: Contact) => void;
}

const TIER_OPTS: { value: RelationshipTier; label: string }[] = [
  { value: 'Tier 1', label: 'Tier 1 — Priority' },
  { value: 'Tier 2', label: 'Tier 2 — Active' },
  { value: 'Tier 3', label: 'Tier 3 — Passive' },
];

export function ContactForm({ contact, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    full_name: contact?.full_name ?? '',
    title: contact?.title ?? '',
    company_id: contact?.company_id ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    linkedin_url: contact?.linkedin_url ?? '',
    relationship_tier: (contact?.relationship_tier ?? 'Tier 2') as RelationshipTier,
    notes: contact?.notes ?? '',
    tags: contact?.tags ?? [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/companies?limit=500')
      .then(r => r.json())
      .then(data => setCompanies(data ?? []))
      .catch(() => {});
  }, []);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function addTag() {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error('Full name is required');
    setSaving(true);
    try {
      const url = contact ? `/api/contacts/${contact.id}` : '/api/contacts';
      const method = contact ? 'PUT' : 'POST';
      const body = { ...form, company_id: form.company_id || null };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      toast.success(contact ? 'Contact updated' : 'Contact added');
      onSave(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const companyOpts = [
    { value: '', label: '— No Company —' },
    ...companies.map(c => ({ value: c.id, label: c.name })),
  ];

  const tierOpts = [
    { value: '', label: '— Select Tier —' },
    ...TIER_OPTS,
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={contact ? `Edit: ${contact.full_name}` : 'Add Contact'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Full Name *"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <Input
            label="Title"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Managing Director"
          />
          <Select
            label="Company"
            value={form.company_id}
            onChange={e => set('company_id', e.target.value)}
            options={companyOpts}
          />

          {/* Email with Send Email action */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400">Email</label>
            <div className="flex gap-2 items-center">
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="jane@example.com"
                className="input-field flex-1"
              />
              {form.email && (
                <a
                  href={`mailto:${form.email}`}
                  title="Send Email"
                  className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#111f3d] hover:bg-[#162549] text-slate-300 border border-[#1e2a3a] transition-colors"
                >
                  <Mail size={12} />
                  Send
                </a>
              )}
            </div>
          </div>

          <Input
            label="Phone"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+1 (555) 000-0000"
          />
          <div className="col-span-2">
            <Input
              label="LinkedIn URL"
              value={form.linkedin_url}
              onChange={e => set('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/janesmith"
            />
          </div>
          <Select
            label="Relationship Tier"
            value={form.relationship_tier}
            onChange={e => set('relationship_tier', e.target.value as RelationshipTier)}
            options={tierOpts}
          />
        </div>

        {/* Tags */}
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
            <Button type="button" variant="secondary" size="sm" onClick={addTag}>
              <Plus size={12} />
            </Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {form.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1">
                  <TagBadge tag={t} />
                  <button
                    type="button"
                    onClick={() => set('tags', form.tags.filter(x => x !== t))}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Background, relationship context, meeting history..."
        />

        <div className="flex gap-2 justify-end pt-2 border-t border-[#1e2a3a]">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
