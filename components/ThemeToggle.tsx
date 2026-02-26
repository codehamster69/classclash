"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
      {(["light", "dark", "system"] as const).map((mode) => (
        <button
          key={mode}
          className={`rounded-md px-2 py-1 text-xs capitalize ${theme === mode ? "bg-indigo-600 text-white" : "text-slate-500"}`}
          onClick={() => setTheme(mode)}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
