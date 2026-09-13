import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ledgerx-theme');
    if (saved && ['light', 'dark', 'midnight'].includes(saved)) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'midnight');
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'midnight') {
      root.classList.add('dark', 'midnight');
    } else {
      root.classList.add('light');
    }
    localStorage.setItem('ledgerx-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((current) => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'midnight';
      return 'light';
    });
  };

  const toggle = cycleTheme;

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      cycleTheme,
      toggle,
      isDark: theme === 'dark' || theme === 'midnight',
      isMidnight: theme === 'midnight'
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

