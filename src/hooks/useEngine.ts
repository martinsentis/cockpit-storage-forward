/**
 * useEngine — React hook that provides engine outputs from project state.
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
      fiscalite: state.fiscalite,
    };
    return computeEngine(inputs);
  }, [state]);
}

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
      fiscalite: state.fiscalite,
      ...overrides,
    };
    return computeEngine(inputs);
  }, [state, overrides]);
}
