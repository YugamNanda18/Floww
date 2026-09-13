import React from 'react';

const variants = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  brand: 'badge-brand',
  neutral: 'badge-neutral',
};

export default function Badge({ children, variant = 'neutral', dot = false }) {
  return (
    <span className={`badge ${variants[variant] || 'badge-neutral'}`}>
      {dot && <span className={`status-dot ${
        variant === 'success' ? 'bg-success-500' :
        variant === 'warning' ? 'bg-warning-500' :
        variant === 'danger' ? 'bg-danger-500' :
        variant === 'info' ? 'bg-info-500' :
        variant === 'brand' ? 'bg-brand-500' : 'bg-slate-400'
      }`} />}
      {children}
    </span>
  );
}
