import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const companyId = searchParams.get('company_id');
  const contactId = searchParams.get('contact_id');
  const meetingId = searchParams.get('meeting_id');

  let query = supabaseAdmin()
    .from('notes')
    .select('*, meeting:meetings(id, title, date_time)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,content::text.ilike.%${search}%`);
  }
  if (companyId) query = query.contains('company_ids', [companyId]);
  if (contactId) query = query.contains('contact_ids', [contactId]);
  if (meetingId) query = query.eq('meeting_id', meetingId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allCompanyIds = Array.from(new Set((data ?? []).flatMap(n => n.company_ids ?? [])));
  const allContactIds = Array.from(new Set((data ?? []).flatMap(n => n.contact_ids ?? [])));

  const [companiesRes, contactsRes] = await Promise.all([
    allCompanyIds.length > 0
      ? supabaseAdmin().from('companies').select('id, name').in('id', allCompanyIds)
      : { data: [] },
    allContactIds.length > 0
      ? supabaseAdmin().from('contacts').select('id, full_name').in('id', allContactIds)
      : { data: [] },
  ]);

  const companyMap = Object.fromEntries((companiesRes.data ?? []).map(c => [c.id, c]));
  const contactMap = Object.fromEntries((contactsRes.data ?? []).map(c => [c.id, c]));

  const enriched = (data ?? []).map(note => ({
    ...note,
    companies: (note.company_ids ?? []).map((id: string) => companyMap[id]).filter(Boolean),
    contacts: (note.contact_ids ?? []).map((id: string) => contactMap[id]).filter(Boolean),
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabaseAdmin()
    .from('notes')
    .insert({
      title: body.title || '',
      date: body.date || new Date().toISOString().slice(0, 10),
      content: body.content || [],
      meeting_id: body.meeting_id || null,
      company_ids: body.company_ids || [],
      contact_ids: body.contact_ids || [],
    })
    .select('*, meeting:meetings(id, title, date_time)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
