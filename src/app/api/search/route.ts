import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = new URL(req.url).searchParams.get('q');
  if (!q || q.length < 2) return NextResponse.json({ companies: [], contacts: [], deals: [], projects: [] });

  const db = supabaseAdmin();
  const like = `%${q}%`;

  const [companies, contacts, deals, projects] = await Promise.all([
    db.from('companies').select('id,name,sector,coverage_status').ilike('name', like).limit(5),
    db.from('contacts').select('id,full_name,title,email').ilike('full_name', like).limit(5),
    db.from('deals').select('id,name,stage,deal_type').ilike('name', like).limit(5),
    db.from('projects').select('id,name,status,type').ilike('name', like).limit(5),
  ]);

  return NextResponse.json({
    companies: companies.data ?? [],
    contacts: contacts.data ?? [],
    deals: deals.data ?? [],
    projects: projects.data ?? [],
  });
}
