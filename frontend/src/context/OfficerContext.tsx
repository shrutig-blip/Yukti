import React, { createContext, useContext, useState, useEffect } from 'react';
import { OfficerProfile, OFFICERS } from '../constants/officer';

const STORAGE_KEY = 'yukti_selected_officer';

interface OfficerContextValue {
  officer: OfficerProfile | null;
  setOfficer: (officer: OfficerProfile) => void;
  clearOfficer: () => void;
}

const OfficerContext = createContext<OfficerContextValue | undefined>(undefined);

export const OfficerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [officer, setOfficerState] = useState<OfficerProfile | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      // Re-match against the current OFFICERS list by name, in case the
      // list definition changes — avoids trusting stale localStorage data.
      return OFFICERS.find((o) => o.name === parsed.name) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (officer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(officer));
    }
  }, [officer]);

  const setOfficer = (o: OfficerProfile) => setOfficerState(o);
  const clearOfficer = () => {
    localStorage.removeItem(STORAGE_KEY);
    setOfficerState(null);
  };

  return (
    <OfficerContext.Provider value={{ officer, setOfficer, clearOfficer }}>
      {children}
    </OfficerContext.Provider>
  );
};

/** Returns the currently selected officer's profile (name, designation, etc).
 * Use this wherever CURRENT_OFFICER was previously imported directly. */
export function useCurrentOfficer(): OfficerProfile {
  const ctx = useContext(OfficerContext);
  if (!ctx || !ctx.officer) {
    throw new Error('useCurrentOfficer() called before an officer was selected — check App.tsx gating.');
  }
  return ctx.officer;
}

/** Full read/write access — used by the identity picker and any "switch
 * officer" control. */
export function useOfficerContext(): OfficerContextValue {
  const ctx = useContext(OfficerContext);
  if (!ctx) throw new Error('useOfficerContext() must be used within <OfficerProvider>');
  return ctx;
}