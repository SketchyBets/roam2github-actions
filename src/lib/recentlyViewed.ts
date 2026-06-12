export interface RecentItem {
  type: 'contact' | 'company' | 'deal' | 'meeting' | 'note';
  id: string;
  name: string;
  url: string;
  viewedAt: string;
}

const KEY = 'recently_viewed';

export function trackView(item: Omit<RecentItem, 'viewedAt'>) {
  try {
    const existing: RecentItem[] = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    const filtered = existing.filter(i => !(i.type === item.type && i.id === item.id));
    const updated = [{ ...item, viewedAt: new Date().toISOString() }, ...filtered].slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export function getRecentlyViewed(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
