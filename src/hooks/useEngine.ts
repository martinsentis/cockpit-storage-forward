/**
 * useEngine — React hook that provides engine outputs from project state.
 * 
 * All financial calculations are delegated to the engine.
 * Components consume this hook instead of computing values themselves.
 * 
 * FUTURE: When the backend engine is ready, this hook will call the API
 * instead of the local engine. No component changes needed.
 */

import { useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { computeEngine } from "@/engine/engine";
import type { EngineOutputs, EngineInputs } from "@/engine/engineTypes";

export function useEngine(): EngineOutputs {
  const { state } = useProject();

  return useMemo(() => {
    const inputs: EngineInputs = {
      projet: state.projet,
      build: state.build,
      financement: state.financement,
      exploitation: state.exploitation,
      fonciere: state.fonciere,
      loyerDynamique: state.loyerDynamique,
      gouvernance: state.gouvernance,
    };
    return computeEngine(inputs);
  }, [state]);
}

/**
 * Compute engine outputs from arbitrary inputs (e.g., local form state).
 * Used when a page has unsaved form state that differs from context.
 */
export function useEngineWithOverrides(overrides: Partial<EngineInputs>): EngineOutputs {
  const { state } = useProject();

  return useMemo(() => {
    const inputs: EngineInputs = {
      projet: state.projet,
      build: state.build,
      financement: state.financement,
      exploitation: state.exploitation,
      fonciere: state.fonciere,
      loyerDynamique: state.loyerDynamique,
      gouvernance: state.gouvernance,
      ...overrides,
    };
    return computeEngine(inputs);
  }, [state, overrides]);
}
