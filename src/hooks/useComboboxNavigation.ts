"use client";

import { type KeyboardEvent, useEffect, useState } from "react";

/** Index after pressing the arrow key, wrapping at either end of the list. */
function stepIndex(key: "ArrowDown" | "ArrowUp", current: number, count: number): number {
  if (key === "ArrowDown") return current < count - 1 ? current + 1 : 0;
  return current > 0 ? current - 1 : count - 1;
}

/** Open state and keyboard handling for a listbox following the WAI-ARIA 1.2 combobox pattern. */
export function useComboboxNavigation<T>(items: readonly T[], onSelect: (item: T) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // A new result set replaces the old one, so the highlight starts over.
  useEffect(() => {
    setIsOpen(items.length > 0);
    setActiveIndex(-1);
  }, [items]);

  const select = (item: T) => {
    onSelect(item);
    setIsOpen(false);
  };

  const handleClosedKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowDown" || items.length === 0) return;
    event.preventDefault();
    setIsOpen(true);
    setActiveIndex(0);
  };

  const handleOpenKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const { key } = event;
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => stepIndex(key, current, items.length));
    } else if (key === "Enter") {
      const highlighted = items[activeIndex];
      if (highlighted === undefined) return;
      event.preventDefault();
      select(highlighted);
    } else if (key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && items.length > 0) handleOpenKey(event);
    else handleClosedKey(event);
  };

  return {
    isOpen,
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    select,
    openIfAny: () => items.length > 0 && setIsOpen(true),
  };
}
