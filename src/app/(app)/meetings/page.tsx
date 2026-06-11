import { TopNav } from '@/components/TopNav';
import { MeetingsClient } from '@/components/Meetings/MeetingsClient';

export default function MeetingsPage() {
  return (
    <div className="flex flex-col flex-1">
      <TopNav title="Meetings" />
      <main className="flex-1 p-6">
        <MeetingsClient />
      </main>
    </div>
  );
}
