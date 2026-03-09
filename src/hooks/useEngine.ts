/**
 * useEngine — React hook that provides engine outputs from project state.
 */

import { useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useScenario } from "@/contexts/ScenarioContext";
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

/**
 * useEngineWithScenario — Merges ScenarioState overrides into EngineInputs.
 * Scenario overrides (targetOccupancy, phaseOverrides) are applied on top of
 * the project configuration before calling the engine.
 * The engine itself is NOT modified.
 */
export function useEngineWithScenario(): EngineOutputs {
  const { state } = useProject();
  const { scenarioState } = useScenario();

  return useMemo(() => {
    // Apply scenario overrides to exploitation phases
    const exploitation = {
      ...state.exploitation,
      capacityPhases: state.exploitation.capacityPhases.map((phase) => {
        const override = scenarioState.phaseOverrides[phase.id];
        return {
          ...phase,
          targetOccupancy: scenarioState.targetOccupancy,
          ...(override?.rampUpMonths !== undefined ? { rampUpMonths: override.rampUpMonths } : {}),
          ...(override?.rampCurve !== undefined ? { rampCurve: override.rampCurve } : {}),
        };
      }),
    };

    const inputs: EngineInputs = {
      projet: {
        ...state.projet,
        horizonMonths: scenarioState.horizonMonths,
      },
      build: state.build,
      financement: state.financement,
      exploitation,
      fonciere: state.fonciere,
      loyerDynamique: state.loyerDynamique,
      gouvernance: state.gouvernance,
      fiscalite: state.fiscalite,
    };
    return computeEngine(inputs);
  }, [state, scenarioState]);
}
