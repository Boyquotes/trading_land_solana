"use client";
import React from 'react';
import { useTheme } from 'next-themes';

export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a placeholder for hydration safety
    return <button className="w-14 h-8" aria-label="Toggle Dark/Light Theme" disabled />;
  }

  return (
    <button
      aria-label="Toggle Dark/Light Theme"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative flex items-center w-14 h-8 rounded-full border-2 border-gray-400 dark:border-[#3b4252] bg-gradient-to-r from-gray-200 via-white to-gray-300 dark:from-[#222c3a] dark:via-[#151c2c] dark:to-[#1e253a] shadow-inner transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {/* Track */}
      <span className="absolute left-1 top-1 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-100 to-white dark:from-[#3b4252] dark:via-[#151c2c] dark:to-[#222c3a] shadow-md transition-transform duration-300 transform-gpu"
        style={{ transform: theme === 'dark' ? 'translateX(24px)' : 'translateX(0)' }}
      >
        <span className="flex items-center justify-center w-full h-full">
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-blue-300 drop-shadow-glow"><path d="M21 12.79A9 9 0 0 1 12.79 3a7 7 0 1 0 8.21 9.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-yellow-400"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/><path d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.95 7.07l-1.41-1.41M6.34 6.34L4.93 4.93m12.02 0l-1.41 1.41M6.34 17.66l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          )}
        </span>
      </span>
      {/* Glow effect on dark */}
      <span className="pointer-events-none absolute inset-0 rounded-full dark:bg-blue-900/30 dark:shadow-[0_0_16px_4px_rgba(32,72,240,0.25)] transition-all duration-300" />
    </button>
  );
}
