import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const module = new URL(req.url).searchParams.get('module');

  const db = supabaseAdmin();
  let data: Record<string, unknown>[] = [];

  switch (module) {
    case 'companies':
      ({ data } = await db.from('companies').select('*').order('name') as { data: Record<string, unknown>[] });
      break;
    case 'contacts':
      ({ data } = await db.from('contacts').select('*, company:companies(name)').order('full_name') as { data: Record<string, unknown>[] });
      data = (data ?? []).map((c) => ({
        ...c,
        company_name: (c.company as { name?: string } | null)?.name ?? '',
        company: undefined,
      }));
      break;
    case 'meetings':
      ({ data } = await db.from('meetings').select('*, company:companies(name), deal:deals(name)').order('date_time', { ascending: false }) as { data: Record<string, unknown>[] });
      data = (data ?? []).map((m) => ({
        ...m,
        company_name: (m.company as { name?: string } | null)?.name ?? '',
        deal_name: (m.deal as { name?: string } | null)?.name ?? '',
        company: undefined,
        deal: undefined,
      }));
      break;
    case 'followups':
      ({ data } = await db.from('follow_ups').select('*, company:companies(name), contact:contacts(full_name), deal:deals(name)').order('due_date') as { data: Record<string, unknown>[] });
      data = (data ?? []).map((f) => ({
        ...f,
        company_name: (f.company as { name?: string } | null)?.name ?? '',
        contact_name: (f.contact as { full_name?: string } | null)?.full_name ?? '',
        deal_name: (f.deal as { name?: string } | null)?.name ?? '',
        company: undefined, contact: undefined, deal: undefined,
      }));
      break;
    case 'deals':
      ({ data } = await db.from('deals').select('*, company:companies(name)').order('last_updated', { ascending: false }) as { data: Record<string, unknown>[] });
      data = (data ?? []).map((d) => ({
        ...d,
        company_name: (d.company as { name?: string } | null)?.name ?? '',
        company: undefined,
      }));
      break;
    case 'projects':
      ({ data } = await db.from('projects').select('*, company:companies(name), deal:deals(name)').order('due_date') as { data: Record<string, unknown>[] });
      data = (data ?? []).map((p) => ({
        ...p,
        company_name: (p.company as { name?: string } | null)?.name ?? '',
        deal_name: (p.deal as { name?: string } | null)?.name ?? '',
        subtasks: JSON.stringify(p.subtasks),
        company: undefined, deal: undefined,
      }));
      break;
    default:
      return NextResponse.json({ error: 'Invalid module' }, { status: 400 });
  }

  const ws = XLSX.utils.json_to_sheet(data ?? []);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, module ?? 'Sheet1');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${module}-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}
