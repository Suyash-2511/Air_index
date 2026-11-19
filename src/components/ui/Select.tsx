"use client";

/** One choice in a Select: the typed value handed back on change, and the text shown. */
export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  id?: string | undefined;
  className?: string | undefined;
  ariaLabel?: string | undefined;
}

/**
 * A native select that hands back the option's own value, so callers get a typed
 * choice and never have to cast the string the DOM reports.
 */
export function Select<T extends string | number>({ value, options, onChange, id, className, ariaLabel }: SelectProps<T>) {
  const pick = (raw: string) => {
    const picked = options.find((option) => String(option.value) === raw);
    if (picked) onChange(picked.value);
  };

  return (
    <select id={id} value={value} aria-label={ariaLabel} className={className} onChange={(event) => pick(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
