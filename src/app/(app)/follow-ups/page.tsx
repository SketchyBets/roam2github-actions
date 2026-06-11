import { TopNav } from '@/components/TopNav';
import { FollowUpsClient } from '@/components/FollowUps/FollowUpsClient';

export default function FollowUpsPage() {
  return (
    <div className="flex flex-col flex-1">
      <TopNav title="Follow-Ups" />
      <main className="flex-1 p-6">
        <FollowUpsClient />
      </main>
    </div>
  );
}
