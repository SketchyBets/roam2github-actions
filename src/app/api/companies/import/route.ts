import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await req.json();
  if (!Array.isArray(rows)) return NextResponse.json({ error: 'Expected array' }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db.from('companies').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: data?.length ?? 0 });
}
