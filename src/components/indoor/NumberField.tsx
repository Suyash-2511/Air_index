"use client";

import { useId } from "react";
import styles from "./PurifierCalculator.module.css";

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Decimal places the input steps by. */
  step?: number;
  onChange: (value: number) => void;
}

/** A labelled number input; text that is not a number falls back to the minimum instead of becoming NaN. */
export function NumberField({ label, value, min, max, step = 0.1, onChange }: NumberFieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value) || min)}
        className={styles.input}
      />
    </div>
  );
}
