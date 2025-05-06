"use client";
import '@/styles/globals.css'

import ThemeProviderClient from "./ThemeProviderClient";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProviderClient>
          {children}
        </ThemeProviderClient>
      </body>
    </html>
  );
}
