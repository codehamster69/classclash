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
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <h1 className="text-lg font-bold">ClassClash</h1>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto max-w-3xl p-4">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
