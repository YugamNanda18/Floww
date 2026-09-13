import React from 'react';

export default function Select({ label, id, error, options = [], className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <select
        id={id}
        className={`input ${error ? 'border-danger-500 focus:ring-danger-500' : ''}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-danger-500">{error}</p>}
    </div>
  );
}
