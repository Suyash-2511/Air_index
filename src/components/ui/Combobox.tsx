"use client";

import { useId } from "react";
import type { PlaceSuggestion } from "@/client/types";
import { useComboboxNavigation } from "@/hooks";
import { useLocale } from "@/hooks";
import styles from "./Combobox.module.css";
import { IconPin, IconSearch } from "./icons";

/** Props for the accessible place autocomplete combobox. */
interface ComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: PlaceSuggestion) => void;
  suggestions: readonly PlaceSuggestion[];
  isLoading?: boolean | undefined;
  placeholder?: string | undefined;
  error?: string | undefined;
  /** Set when a finished search found nothing, to say so instead of showing an empty list. */
  noResultsFor?: string | undefined;
}

interface OptionListProps {
  listboxId: string;
  suggestions: readonly PlaceSuggestion[];
  activeIndex: number;
  onPick: (item: PlaceSuggestion) => void;
  onHover: (index: number) => void;
}

function OptionList({ listboxId, suggestions, activeIndex, onPick, onHover }: OptionListProps) {
  return (
    <ul id={listboxId} role="listbox" className={styles.dropdown}>
      {suggestions.map((item, index) => {
        const isSelected = index === activeIndex;
        return (
          <li
            key={item.placeId}
            id={`${listboxId}-opt-${index}`}
            role="option"
            aria-selected={isSelected}
            className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}
            // mousedown, not click: the input's blur would otherwise close the list before a click lands.
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(item);
            }}
            onMouseEnter={() => onHover(index)}
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
  );
}

interface ComboboxStatusProps {
  error: string | undefined;
  errorId: string;
  noResultsFor: string | undefined;
}

/** A failure, or a note that the finished search found nothing; a failure takes precedence. */
function ComboboxStatus({ error, errorId, noResultsFor }: ComboboxStatusProps) {
  const { t } = useLocale();
  if (error) {
    return (
      <div id={errorId} className={styles.error} role="alert">
        {error}
      </div>
    );
  }
  if (!noResultsFor) return null;
  return (
    <p className={styles.empty} role="status">
      {t("combobox_no_results", { query: noResultsFor })}
    </p>
  );
}

/**
 * Accessible ARIA combobox component for location search across Indian cities and areas.
 * Adheres to WAI-ARIA 1.2 Combobox pattern with full keyboard navigation and live state.
 */
export function Combobox({ label, value, onChange, onSelect, suggestions, isLoading = false, placeholder, error, noResultsFor }: ComboboxProps) {
  const listboxId = useId();
  const errorId = useId();
  const nav = useComboboxNavigation(suggestions, onSelect);
  const activeOptionId = nav.activeIndex >= 0 ? `${listboxId}-opt-${nav.activeIndex}` : undefined;

  return (
    <div className={styles.comboboxWrapper}>
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        {label}
      </label>
      <div className={styles.inputGroup}>
        <IconSearch className={styles.searchIcon} />
        <input
          id={`${listboxId}-input`}
          type="text"
          role="combobox"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={nav.handleKeyDown}
          onFocus={nav.openIfAny}
          placeholder={placeholder}
          aria-expanded={nav.isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={styles.input}
        />
        {isLoading && <div className={styles.spinner} aria-hidden="true" />}
      </div>

      <ComboboxStatus error={error} errorId={errorId} noResultsFor={isLoading ? undefined : noResultsFor} />

      {nav.isOpen && suggestions.length > 0 && (
        <OptionList listboxId={listboxId} suggestions={suggestions} activeIndex={nav.activeIndex} onPick={nav.select} onHover={nav.setActiveIndex} />
      )}
    </div>
  );
}
