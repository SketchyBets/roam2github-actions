import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-[#0d1730] mb-4">
        <Icon size={24} className="text-slate-600" />
      </div>
      <h3 className="text-sm font-medium text-slate-400 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-600 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
