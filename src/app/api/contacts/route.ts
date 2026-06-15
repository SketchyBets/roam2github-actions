import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tier = searchParams.get('tier');
  const company_id = searchParams.get('company_id');
  const search = searchParams.get('search');

  const db = supabaseAdmin();
  let query = db.from('contacts').select('*, company:companies(id,name)').order('full_name').limit(10000);

  if (tier) query = query.eq('relationship_tier', tier);
  if (company_id) query = query.eq('company_id', company_id);
  if (search) query = query.ilike('full_name', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = supabaseAdmin();
  const { data, error } = await db.from('contacts').insert(body).select('*, company:companies(id,name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
