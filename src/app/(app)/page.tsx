import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { DashboardClient } from '@/components/Dashboard/DashboardClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="flex flex-col flex-1">
      <TopNav title="Dashboard" />
      <main className="flex-1 p-6">
        <DashboardClient />
      </main>
    </div>
  );
}
