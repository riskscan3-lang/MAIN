// @ts-nocheck
import { createContext, useContext, useState, ReactNode } from 'react';

interface MiningContextType {
  activePlan: number | null;
  setActivePlan: (planId: number | null) => void;
  isMining: boolean;
  setIsMining: (mining: boolean) => void;
}

const MiningContext = createContext<MiningContextType | undefined>(undefined);

export function MiningProvider({ children }: { children: ReactNode }) {
  const [activePlan, setActivePlan] = useState<number | null>(null);
  const [isMining, setIsMining] = useState(false);

  return (
    <MiningContext.Provider value={{ activePlan, setActivePlan, isMining, setIsMining }}>
      {children}
    </MiningContext.Provider>
  );
}

export function useMining() {
  const context = useContext(MiningContext);
  if (context === undefined) {
    throw new Error('useMining must be used within a MiningProvider');
  }
  return context;
}