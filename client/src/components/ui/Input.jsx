import React from 'react';

export default function Input({ label, id, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <input id={id} className={`input ${error ? 'border-danger-500 focus:ring-danger-500' : ''}`} {...props} />
      {error && <p className="mt-1 text-xs text-danger-500">{error}</p>}
    </div>
  );
}
