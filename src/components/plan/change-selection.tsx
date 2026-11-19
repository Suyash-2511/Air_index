"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

/** Which plan changes are switched on, and how to switch one. */
interface ChangeSelection {
  activeIds: readonly string[];
  toggle: (id: string, isActive: boolean) => void;
}

const ChangeSelectionContext = createContext<ChangeSelection | undefined>(undefined);

interface ProviderProps extends ChangeSelection {
  children: ReactNode;
}

/** Lets the rows of the routine timeline read and flip the selection without every level passing it down. */
export function ChangeSelectionProvider({ activeIds, toggle, children }: ProviderProps) {
  const value = useMemo(() => ({ activeIds, toggle }), [activeIds, toggle]);
  return <ChangeSelectionContext.Provider value={value}>{children}</ChangeSelectionContext.Provider>;
}

/** The selection from the nearest provider; throws if a row is rendered outside one, since that is a wiring mistake. */
export function useChangeSelection(): ChangeSelection {
  const selection = useContext(ChangeSelectionContext);
  if (!selection) throw new Error("useChangeSelection must be used inside a ChangeSelectionProvider");
  return selection;
}
