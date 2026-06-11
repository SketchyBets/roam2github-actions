import { TopNav } from '@/components/TopNav';
import { CompaniesClient } from '@/components/Companies/CompaniesClient';

export default function CompaniesPage() {
  return (
    <div className="flex flex-col flex-1">
      <TopNav title="Companies" />
      <main className="flex-1 p-6">
        <CompaniesClient />
      </main>
    </div>
  );
}
