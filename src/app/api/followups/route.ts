import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const open_only = searchParams.get('open_only');
  const due_week = searchParams.get('due_week');

  const db = supabaseAdmin();
  let query = db
    .from('follow_ups')
    .select('*, company:companies(id,name), contact:contacts(id,full_name), deal:deals(id,name)')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (open_only === 'true') query = query.in('status', ['Open', 'In Progress']);
  if (due_week === 'true') {
    const now = new Date().toISOString().split('T')[0];
    const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    query = query.gte('due_date', now).lte('due_date', weekOut);
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
    .from('follow_ups')
    .insert(body)
    .select('*, company:companies(id,name), contact:contacts(id,full_name), deal:deals(id,name)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
