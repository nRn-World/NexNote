import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('nexnote-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('nexnote-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(d => !d) };
}
