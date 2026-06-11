import { TopNav } from '@/components/TopNav';
import { ContactsClient } from '@/components/Contacts/ContactsClient';

export default function ContactsPage() {
  return (
    <div className="flex flex-col flex-1">
      <TopNav title="Contacts" />
      <main className="flex-1 p-6">
        <ContactsClient />
      </main>
    </div>
  );
}
