// ScenarioContext — provides scenario state to projection pages
import React, { createContext, useContext, useState, useCallback } from "react";
import type { ScenarioState, ExitHypotheses, PhaseOverride } from "@/types/scenario";
import { DEFAULT_SCENARIO_STATE } from "@/types/scenario";

interface ScenarioContextValue {
  scenarioState: ScenarioState;
  setScenarioState: React.Dispatch<React.SetStateAction<ScenarioState>>;
  updateScenarioField: <K extends keyof ScenarioState>(field: K, value: ScenarioState[K]) => void;
  updateExitHypotheses: (partial: Partial<ExitHypotheses>) => void;
  updatePhaseOverride: (phaseId: string, partial: Partial<PhaseOverride>) => void;
  resetToDefaults: () => void;
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const [scenarioState, setScenarioState] = useState<ScenarioState>(DEFAULT_SCENARIO_STATE);

  const updateScenarioField = useCallback(<K extends keyof ScenarioState>(field: K, value: ScenarioState[K]) => {
    setScenarioState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateExitHypotheses = useCallback((partial: Partial<ExitHypotheses>) => {
    setScenarioState((prev) => ({
      ...prev,
      exitHypotheses: { ...prev.exitHypotheses, ...partial },
    }));
  }, []);

  const updatePhaseOverride = useCallback((phaseId: string, partial: Partial<PhaseOverride>) => {
    setScenarioState((prev) => ({
      ...prev,
      phaseOverrides: {
        ...prev.phaseOverrides,
        [phaseId]: {
          ...prev.phaseOverrides[phaseId],
          ...partial,
        },
      },
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setScenarioState(DEFAULT_SCENARIO_STATE);
  }, []);

  return (
    <ScenarioContext.Provider
      value={{
        scenarioState,
        setScenarioState,
        updateScenarioField,
        updateExitHypotheses,
        updatePhaseOverride,
        resetToDefaults,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario(): ScenarioContextValue {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario must be used within ScenarioProvider");
  return ctx;
}
