import { Compass } from 'lucide-react';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';

export default function EmptyState({
  icon: Icon = Compass,
  title = 'No items found',
  description = 'There are currently no items to display.',
  actionText,
  actionHref,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/30">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-muted-foreground">
        <Icon className="w-8 h-8" />
      </div>
      <h3
        className="text-2xl font-normal text-foreground mb-2"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        {description}
      </p>
      {actionText && (actionHref || onAction) && (
        actionHref ? (
          <Link to={actionHref}>
            <button
              className="rounded-full px-6 py-2.5 text-sm font-medium transition-transform hover:scale-[1.03] cursor-pointer bg-black text-white dark:bg-white dark:text-black"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {actionText}
            </button>
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="rounded-full px-6 py-2.5 text-sm font-medium transition-transform hover:scale-[1.03] cursor-pointer bg-black text-white dark:bg-white dark:text-black"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {actionText}
          </button>
        )
      )}
    </div>
  );
}
