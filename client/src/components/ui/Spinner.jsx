import React from 'react';

export default function Spinner({ size = 24, className = '' }) {
  return (
    <div
      className={`border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size={32} />
    </div>
  );
}
