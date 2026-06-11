import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const deal_type = searchParams.get('deal_type');
  const active_only = searchParams.get('active_only');

  const db = supabaseAdmin();
  let query = db
    .from('deals')
    .select('*, company:companies(id,name)')
    .order('last_updated', { ascending: false });

  if (stage) query = query.eq('stage', stage);
  if (deal_type) query = query.eq('deal_type', deal_type);
  if (active_only === 'true') {
    query = query.not('stage', 'in', '("Closed","Dead")');
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('deals')
    .insert({ ...body, last_updated: new Date().toISOString() })
    .select('*, company:companies(id,name)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
