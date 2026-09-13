import React from 'react';

export default function FlowwLogo({
  size = 36,
  className = '',
  showText = false,
  textClassName = 'text-lg font-extrabold',
  subText = '',
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm shrink-0 flex items-center justify-center p-0.5 group hover:scale-105 transition-transform"
        style={{ width: size, height: size }}
      >
        <img
          src="/floww-logo.png"
          alt="Floww"
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <div className="leading-tight">
          <span className={`tracking-tight text-[var(--text-primary)] font-black ${textClassName}`}>
            Floww
          </span>
          {subText && (
            <p className="text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase">
              {subText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
