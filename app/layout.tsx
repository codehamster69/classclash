import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "ClassClash",
  description: "Realtime classroom mini games",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <header className="sticky top-0 z-20 border-b border-white/40 bg-white/50 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/50">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <h1 className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-lg font-extrabold text-transparent dark:from-indigo-300 dark:via-violet-300 dark:to-fuchsia-300">ClassClash</h1>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto max-w-3xl p-4">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
