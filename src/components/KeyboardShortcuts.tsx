'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if ((e.target as HTMLElement).isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const map: Record<string, string> = { n: 'note', c: 'contact', m: 'meeting', d: 'deal', f: 'followup' };
      const paths: Record<string, string> = { n: '/notes', c: '/contacts', m: '/meetings', d: '/deals', f: '/follow-ups' };
      if (!map[key]) return;
      e.preventDefault();
      sessionStorage.setItem('pendingNew', map[key]);
      window.dispatchEvent(new CustomEvent('open-new-modal', { detail: map[key] }));
      router.push(paths[key]);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  return null;
}
