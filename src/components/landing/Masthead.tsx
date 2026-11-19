"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { IconMoon, IconSun } from "../ui/icons";
import styles from "./Masthead.module.css";

/** Props for the Masthead bulletin header component. */
export interface MastheadProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  compact: boolean;
}

/** The bulletin nameplate: a ruled dateline above the wordmark, with language and theme switches. */
export function Masthead({ theme, onToggleTheme, compact }: MastheadProps) {
  const [today, setToday] = useState<Date | undefined>();
  const { locale, toggleLocale, t } = useLocale();

  useEffect(() => {
    setToday(new Date());
  }, []);

  return (
    <header className={`${styles.masthead} ${compact ? styles.compact : ""}`}>
      <div className={styles.dateline}>
        <span>{t("masthead_bulletin")}</span>
        {today ? (
          <time dateTime={today.toISOString().slice(0, 10)} className={styles.date}>
            {today.toLocaleDateString(t("masthead_date_locale"), {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        ) : (
          <span className={styles.date} />
        )}
        <span className={styles.note}>{t("masthead_note")}</span>
      </div>
      <div className={styles.nameplate}>
        <div className={styles.brand}>
          <h1 className={styles.title}>
            <span className={styles.mask}>
              <span className={styles.word}>{t("appName")}</span>
            </span>
          </h1>
          <p className={styles.tagline}>{t("appTagline")}</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={toggleLocale}
            className={styles.langButton}
            aria-label={t("lang_toggle_aria")}
          >
            {locale === "en" ? "हिन्दी" : "English"}
          </button>
          <button type="button" onClick={onToggleTheme} className={styles.themeButton}>
            {theme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
            <span className="sr-only">
              {theme === "light" ? t("theme_dark") : t("theme_light")}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
