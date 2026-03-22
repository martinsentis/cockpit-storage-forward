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
  console.log("FETCH ENGINE CALLED");
  console.log("PAYLOAD", JSON.stringify(inputs, null, 2));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const payload = mapEngineInputsToProjectionInputs(inputs);
  const res = await fetch("https://pilotagebox-production.up.railway.app/run-projection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Engine API ${res.status}: ${errBody}`);
  }
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

// ══════════════════════════════════════════════════════════════
// Shared inputs builder for scenario-aware hooks
// ══════════════════════════════════════════════════════════════

function useBuildScenarioInputs(): EngineInputs {
  const { state } = useProject();
  const { scenarioState } = useScenario();

  return useMemo<EngineInputs>(() => {
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
}

/**
 * useEngineWithScenario — Merges ScenarioState overrides into EngineInputs.
 */
export function useEngineWithScenario(): EngineOutputs {
  const inputs = useBuildScenarioInputs();

  const { data } = useQuery({
    queryKey: ["engine", inputs],
    queryFn: () => fetchEngine(inputs),
    initialData: computeEngine(inputs),
    staleTime: 10_000,
  });

  return data;
}

// ══════════════════════════════════════════════════════════════
// Type brut renvoyé par le backend (série mensuelle complète)
// ══════════════════════════════════════════════════════════════
export interface BackendMonthlyResult {
  monthIndex: number;
  cashEnd: number;
  sciCashEnd: number;
  dscr: number;
  projectedByCategory?: Record<string, number>;
  warnings?: string[];
}

const API_BASE_URL = "https://pilotagebox-production.up.railway.app";

async function fetchMonthlyResults(inputs: EngineInputs): Promise<BackendMonthlyResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const payload = mapEngineInputsToProjectionInputs(inputs);
    const res = await fetch(`${API_BASE_URL}/run-projection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Backend error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data.months ?? []);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// =============================================
// HOOK CENTRAL — useMonthlyResults
// Uses shared inputs from useBuildScenarioInputs
// =============================================
export function useMonthlyResults() {
  const inputs = useBuildScenarioInputs();

  return useQuery<BackendMonthlyResult[]>({
    queryKey: ["monthly-results", inputs],
    queryFn: () => fetchMonthlyResults(inputs),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
