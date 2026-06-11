import { TopNav } from '@/components/TopNav';
import { ProjectsClient } from '@/components/Projects/ProjectsClient';

export default function ProjectsPage() {
  return (
    <div className="flex flex-col flex-1">
      <TopNav title="Projects" />
      <main className="flex-1 p-6">
        <ProjectsClient />
      </main>
    </div>
  );
}
