"use client";

import { useEffect, useState } from "react";

/** The two colour themes; the CSS tokens switch on the data-theme attribute. */
export type Theme = "light" | "dark";

/** Light by default; mirrors the choice onto the root element so the CSS tokens switch. */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((previous) => (previous === "light" ? "dark" : "light"));
  return { theme, toggleTheme };
}
