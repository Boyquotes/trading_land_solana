"use client";
import { ThemeProvider } from "./ThemeProvider";
import { useEffect, useState } from "react";

export default function ThemeProviderClient({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // or a loading spinner

  return (
    <ThemeProvider>
      <main className="bg-white dark:bg-[#151c2c] min-h-screen">{children}</main>
    </ThemeProvider>
  );
}
