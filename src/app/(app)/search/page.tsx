'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building2, User, Briefcase, FolderOpen, Search } from 'lucide-react';
import { TopNav } from '@/components/TopNav';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

// ─── Types for search result shapes (partial, matches search API) ─────────────

interface CompanyResult {
  id: string;
  name: string;
  sector?: string;
  coverage_status?: string;
}

interface ContactResult {
  id: string;
  full_name: string;
  title?: string;
  email?: string;
}

interface DealResult {
  id: string;
  name: string;
  stage?: string;
  deal_type?: string;
}

interface ProjectResult {
  id: string;
  name: string;
  status?: string;
  type?: string;
}

interface SearchResults {
  companies: CompanyResult[];
  contacts: ContactResult[];
  deals: DealResult[];
  projects: ProjectResult[];
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="card divide-y divide-[#1e2a3a] overflow-hidden">
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#0a1225]">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-slate-500" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</span>
      </div>
      <span className="text-xs text-slate-600 num">{count} result{count !== 1 ? 's' : ''}</span>
    </div>
  );
}

function ResultRow({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#0d1730] cursor-pointer transition-colors"
    >
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') ?? '';

  const [results, setResults] = useState<SearchResults>({
    companies: [],
    contacts: [],
    deals: [],
    projects: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      const data: SearchResults = await res.json();
      setResults(data);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) fetchResults(query);
    else setResults({ companies: [], contacts: [], deals: [], projects: [] });
  }, [query, fetchResults]);

  const totalResults =
    results.companies.length +
    results.contacts.length +
    results.deals.length +
    results.projects.length;

  const categoriesWithResults = [
    results.companies.length,
    results.contacts.length,
    results.deals.length,
    results.projects.length,
  ].filter(n => n > 0).length;

  const hasResults = totalResults > 0;

  return (
    <div className="flex flex-col flex-1">
      <TopNav title="Search" />
      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        {/* Header */}
        {query && (
          <div className="mb-5">
            {loading ? (
              <p className="text-sm text-slate-500">Searching for &ldquo;{query}&rdquo;...</p>
            ) : hasResults ? (
              <p className="text-sm text-slate-400">
                <span className="text-slate-200 font-medium">{totalResults}</span> result{totalResults !== 1 ? 's' : ''}{' '}
                across{' '}
                <span className="text-slate-200 font-medium">{categoriesWithResults}</span>{' '}
                {categoriesWithResults === 1 ? 'category' : 'categories'} for{' '}
                <span className="text-slate-300 font-medium">&ldquo;{query}&rdquo;</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                No results for <span className="text-slate-300 font-medium">&ldquo;{query}&rdquo;</span>
              </p>
            )}
          </div>
        )}

        {/* Empty state — no query */}
        {!query && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 rounded-full bg-[#0d1730] mb-4">
              <Search size={24} className="text-slate-600" />
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-1">Search the tracker</h3>
            <p className="text-xs text-slate-600 max-w-xs">
              Use the search bar above to find companies, contacts, deals, and projects.
            </p>
          </div>
        )}

        {/* Empty state — no results */}
        {query && !loading && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-full bg-[#0d1730] mb-4">
              <Search size={24} className="text-slate-600" />
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-1">No results found</h3>
            <p className="text-xs text-slate-600 max-w-xs">
              Try a different search term, or check spelling.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && hasResults && (
          <div className="space-y-4 animate-in">
            {/* Companies */}
            {results.companies.length > 0 && (
              <div>
                <SectionCard>
                  <SectionHeader icon={Building2} title="Companies" count={results.companies.length} />
                  {results.companies.map(company => (
                    <ResultRow
                      key={company.id}
                      onClick={() => router.push('/companies')}
                    >
                      <div className="p-1.5 rounded bg-[#0d1730] flex-shrink-0">
                        <Building2 size={12} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">
                          {company.name}
                        </div>
                        {company.sector && (
                          <div className="text-xs text-slate-500 truncate">{company.sector}</div>
                        )}
                      </div>
                      {company.coverage_status && (
                        <Badge value={company.coverage_status} />
                      )}
                    </ResultRow>
                  ))}
                </SectionCard>
              </div>
            )}

            {/* Contacts */}
            {results.contacts.length > 0 && (
              <div>
                <SectionCard>
                  <SectionHeader icon={User} title="Contacts" count={results.contacts.length} />
                  {results.contacts.map(contact => (
                    <ResultRow
                      key={contact.id}
                      onClick={() => router.push('/contacts')}
                    >
                      <div className="p-1.5 rounded bg-[#0d1730] flex-shrink-0">
                        <User size={12} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">
                          {contact.full_name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {[contact.title, contact.email].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </ResultRow>
                  ))}
                </SectionCard>
              </div>
            )}

            {/* Deals */}
            {results.deals.length > 0 && (
              <div>
                <SectionCard>
                  <SectionHeader icon={Briefcase} title="Deals" count={results.deals.length} />
                  {results.deals.map(deal => (
                    <ResultRow
                      key={deal.id}
                      onClick={() => router.push('/deals')}
                    >
                      <div className="p-1.5 rounded bg-[#0d1730] flex-shrink-0">
                        <Briefcase size={12} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">
                          {deal.name}
                        </div>
                        {deal.deal_type && (
                          <div className="text-xs text-slate-500">{deal.deal_type}</div>
                        )}
                      </div>
                      {deal.stage && (
                        <Badge value={deal.stage} />
                      )}
                    </ResultRow>
                  ))}
                </SectionCard>
              </div>
            )}

            {/* Projects */}
            {results.projects.length > 0 && (
              <div>
                <SectionCard>
                  <SectionHeader icon={FolderOpen} title="Projects" count={results.projects.length} />
                  {results.projects.map(project => (
                    <ResultRow
                      key={project.id}
                      onClick={() => router.push('/projects')}
                    >
                      <div className="p-1.5 rounded bg-[#0d1730] flex-shrink-0">
                        <FolderOpen size={12} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">
                          {project.name}
                        </div>
                        {project.type && (
                          <div className="text-xs text-slate-500">{project.type}</div>
                        )}
                      </div>
                      {project.status && (
                        <Badge value={project.status} />
                      )}
                    </ResultRow>
                  ))}
                </SectionCard>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
