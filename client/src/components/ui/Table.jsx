import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export function Table({ children, className = '' }) {
  return (
    <div className={`table-container ${className}`}>
      <table className="ledger-table">{children}</table>
    </div>
  );
}

export function Th({ children, sortable, sorted, onSort, className = '' }) {
  return (
    <th className={className} onClick={sortable ? onSort : undefined} style={sortable ? { cursor: 'pointer', userSelect: 'none' } : {}}>
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <span className="ml-1 flex flex-col">
            <ChevronUp size={10} className={sorted === 'asc' ? 'text-brand-500' : 'text-slate-300'} />
            <ChevronDown size={10} className={sorted === 'desc' ? 'text-brand-500' : 'text-slate-300'} />
          </span>
        )}
      </div>
    </th>
  );
}

export function EmptyRow({ colSpan, message = 'No records found' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-[var(--text-muted)] text-sm">
        {message}
      </td>
    </tr>
  );
}
