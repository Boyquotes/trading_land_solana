import '@/styles/globals.css'

import { ThemeProvider } from "./ThemeProvider";

export default function RootLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <main className="bg-white dark:bg-[#151c2c] min-h-screen">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
