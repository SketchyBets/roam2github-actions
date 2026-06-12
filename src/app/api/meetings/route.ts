import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const company_id = searchParams.get('company_id');
  const deal_id = searchParams.get('deal_id');
  const upcoming = searchParams.get('upcoming');

  const db = supabaseAdmin();
  let query = db
    .from('meetings')
    .select('*, company:companies(id,name), deal:deals(id,name)')
    .order('date_time', { ascending: false });

  if (company_id) query = query.eq('company_id', company_id);
  if (deal_id) query = query.eq('deal_id', deal_id);
  if (upcoming === 'true') {
    const now = new Date().toISOString();
    const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('date_time', now).lte('date_time', weekOut).order('date_time');
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
    .from('meetings')
    .insert(body)
    .select('*, company:companies(id,name), deal:deals(id,name)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
