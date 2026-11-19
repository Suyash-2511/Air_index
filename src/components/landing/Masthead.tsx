"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "../ui/icons";
import styles from "./Masthead.module.css";

export interface MastheadProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  /** Smaller nameplate once the visitor is inside the steps. */
  compact: boolean;
}

/** The bulletin nameplate: a ruled dateline above the wordmark, with the theme switch. */
export function Masthead({ theme, onToggleTheme, compact }: MastheadProps) {
  const [today, setToday] = useState<Date | undefined>();

  // The date is read after mount so server and client markup match.
  useEffect(() => {
    setToday(new Date());
  }, []);

  return (
    <header className={`${styles.masthead} ${compact ? styles.compact : ""}`}>
      <div className={styles.dateline}>
        <span>Winter air bulletin</span>
        {today ? (
          <time dateTime={today.toISOString().slice(0, 10)} className={styles.date}>
            {today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </time>
        ) : (
          <span className={styles.date} />
        )}
        <span className={styles.note}>Estimates, not medical advice</span>
      </div>
      <div className={styles.nameplate}>
        <div className={styles.brand}>
          <h1 className={styles.title}>
            <span className={styles.mask}>
              <span className={styles.word}>Saans</span>
            </span>
          </h1>
          <p className={styles.tagline}>Winter air, measured for your family</p>
        </div>
        <button type="button" onClick={onToggleTheme} className={styles.themeButton}>
          {theme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
          <span className="sr-only">{theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}</span>
        </button>
      </div>
    </header>
  );
}
