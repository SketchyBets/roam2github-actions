import { TopNav } from '@/components/TopNav';
import { DealsClient } from '@/components/Deals/DealsClient';

export default function DealsPage() {
  return (
    <div className="flex flex-col flex-1">
      <TopNav title="Live Deals" />
      <main className="flex-1 p-6">
        <DealsClient />
      </main>
    </div>
  );
}
