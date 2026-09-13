import React from 'react';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle({ variant = 'compact' }) {
  const { theme, setTheme, cycleTheme } = useTheme();

  const themes = [
    { id: 'light', label: 'Light', icon: Sun, color: 'text-amber-500' },
    { id: 'dark', label: 'Dark', icon: Moon, color: 'text-indigo-400' },
    { id: 'midnight', label: 'Midnight', icon: Sparkles, color: 'text-cyan-400' },
  ];

  if (variant === 'segmented') {
    return (
      <div className="flex items-center p-1 bg-slate-100 dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-700">
        {themes.map((t) => {
          const Icon = t.icon;
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white dark:bg-surface-700 text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={14} className={isActive ? t.color : ''} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <button
      id="theme-toggle-btn"
      onClick={cycleTheme}
      className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-700 border border-transparent hover:border-slate-200 dark:hover:border-surface-600 transition-all text-xs font-medium"
      title={`Current: ${currentTheme.label} mode. Click to cycle (Light → Dark → Midnight).`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -45, scale: 0.8, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 45, scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="flex items-center gap-1.5"
      >
        <CurrentIcon size={16} className={currentTheme.color} />
        <span className="hidden sm:inline-block text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider">
          {currentTheme.label}
        </span>
      </motion.div>
    </button>
  );
}
