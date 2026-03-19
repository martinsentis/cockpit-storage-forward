/**
 * useEngine — React hook that provides engine outputs, fetched from backend API.
 * Falls back to local computeEngine for initial rendering.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "@/contexts/ProjectContext";
import { useScenario } from "@/contexts/ScenarioContext";
import { computeEngine } from "@/engine/engine";
import { mapEngineInputsToProjectionInputs } from "@/engine/mapToProjectionInputs";
import { mapProjectionResultsToEngineOutputs } from "@/engine/mapFromProjectionResults";
import type { EngineOutputs, EngineInputs } from "@/engine/engineTypes";

async function fetchEngine(inputs: EngineInputs): Promise<EngineOutputs> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const payload = mapEngineInputsToProjectionInputs(inputs);
  const res = await fetch("https://pilotagebox-production.up.railway.app/run-projection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!res.ok) throw new Error("Engine API error");
  const results = await res.json();
  return mapProjectionResultsToEngineOutputs(results);
}

export { fetchEngine };

export function useEngine(): EngineOutputs {
  const { state } = useProject();

  const inputs = useMemo<EngineInputs>(
    () => ({
      projet: state.projet,
      build: state.build,
      financement: state.financement,
      exploitation: state.exploitation,
      fonciere: state.fonciere,
      loyerDynamique: state.loyerDynamique,
      gouvernance: state.gouvernance,
      fiscalite: state.fiscalite,
    }),
    [state],
  );

  const { data } = useQuery({
    queryKey: ["engine", inputs],
    queryFn: () => fetchEngine(inputs),
    placeholderData: computeEngine(inputs),
    staleTime: 10_000,
  });

  return data;
}


/**
 * useEngineWithScenario — Merges ScenarioState overrides into EngineInputs.
 */
export function useEngineWithScenario(): EngineOutputs {
  const { state } = useProject();
  const { scenarioState } = useScenario();

  const inputs = useMemo<EngineInputs>(() => {
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

    return {
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
  }, [state, scenarioState]);

  const { data } = useQuery({
    queryKey: ["engine", inputs],
    queryFn: () => fetchEngine(inputs),
    initialData: computeEngine(inputs),
    staleTime: 10_000,
  });

  return data;
}
