import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="mb-6 animate-fade-in">
      {breadcrumbs && (
        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-2">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={12} />}
              <span className={i === breadcrumbs.length - 1 ? 'text-[var(--text-secondary)]' : ''}>{b}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
