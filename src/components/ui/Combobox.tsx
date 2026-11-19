"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { PlaceSuggestion } from "@/client/types";
import { useLocale } from "@/hooks/useLocale";
import { IconPin, IconSearch } from "./icons";
import styles from "./Combobox.module.css";

/** Props for the accessible place autocomplete combobox. */
export interface ComboboxProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (item: PlaceSuggestion) => void;
  suggestions: readonly PlaceSuggestion[];
  loading?: boolean | undefined;
  placeholder?: string | undefined;
  error?: string | undefined;
  /** Set when a finished search found nothing, to say so instead of showing an empty list. */
  noResultsFor?: string | undefined;
}

/**
 * Accessible ARIA combobox component for location search across Indian cities and areas.
 * Adheres to WAI-ARIA 1.2 Combobox pattern with full keyboard navigation and live state.
 */
export function Combobox({
  label,
  value,
  onChange,
  onSelect,
  suggestions,
  loading = false,
  placeholder,
  error,
  noResultsFor,
}: ComboboxProps) {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
    setActiveIndex(-1);
  }, [suggestions]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[activeIndex];
        if (selected) {
          onSelect(selected);
          setIsOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const activeOptionId = activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div className={styles.comboboxWrapper}>
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        {label}
      </label>
      <div className={styles.inputGroup}>
        <IconSearch className={styles.searchIcon} />
        <input
          id={`${listboxId}-input`}
          ref={inputRef}
          type="text"
          role="combobox"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={styles.input}
        />
        {loading && <div className={styles.spinner} aria-hidden="true" />}
      </div>

      {error && (
        <div id={errorId} className={styles.error} role="alert">
          {error}
        </div>
      )}

      {noResultsFor && !error && !loading && (
        <p className={styles.empty} role="status">
          {t("combobox_no_results", { query: noResultsFor })}
        </p>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul id={listboxId} role="listbox" className={styles.dropdown}>
          {suggestions.map((item, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <li
                key={item.placeId}
                id={`${listboxId}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <IconPin className={styles.pin} />
                <span className={styles.optionText}>
                  <span className={styles.mainText}>{item.mainText}</span>
                  <span className={styles.secondaryText}>{item.secondaryText}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
