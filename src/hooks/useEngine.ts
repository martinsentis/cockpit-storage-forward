/**
 * useEngine — React hook that provides engine outputs, fetched from backend API.
 * Falls back to local computeEngine for initial rendering.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "@/contexts/ProjectContext";
import { useScenario } from "@/contexts/ScenarioContext";
import { computeEngine, phaseCAHT, phaseSurface } from "@/engine/engine";
import { mapEngineInputsToProjectionInputs, type ScenarioOverrides } from "@/engine/mapToProjectionInputs";
import { mapProjectionResultsToEngineOutputs } from "@/engine/mapFromProjectionResults";
import type { EngineOutputs, EngineInputs } from "@/engine/engineTypes";
import type { DebtItem } from "@/types/project";
import { API_URL } from "@/config";

async function fetchEngine(inputs: EngineInputs, overrides: ScenarioOverrides = {}): Promise<EngineOutputs> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const payload = mapEngineInputsToProjectionInputs(inputs, undefined, overrides);
  const res = await fetch(`${API_URL}/run-projection`, {
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
  const data = await res.json();
  // Le backend retourne { results: MonthlyResult[], investorMetrics: {...} }
  const results = Array.isArray(data) ? data : (data.results ?? []);
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
    queryKey: ["engine", JSON.stringify(inputs)],
    queryFn: () => fetchEngine(inputs),
    initialData: () => computeEngine(inputs),
    staleTime: 10_000,
    retry: 1,
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
  const { scenarioState } = useScenario();
  const overrides: ScenarioOverrides = { indexationCA: scenarioState.indexationCA };

  const { data } = useQuery({
    queryKey: ["engine", JSON.stringify(inputs), scenarioState.indexationCA],
    queryFn: () => fetchEngine(inputs, overrides),
    initialData: computeEngine(inputs),
    staleTime: 10_000,
    retry: 1,
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
  leasedSurface: number;
  activeSurface: number;
  leasedSurfacePercent: number;
  sciAmortization: number;
  projectedByCategory?: Record<string, number>;
  warnings?: string[];
}

async function fetchMonthlyResults(inputs: EngineInputs, overrides: ScenarioOverrides = {}): Promise<BackendMonthlyResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const payload = mapEngineInputsToProjectionInputs(inputs, undefined, overrides);
    const res = await fetch(`${API_URL}/run-projection`, {
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
    // Le backend retourne { results: MonthlyResult[], investorMetrics: {...} }
    return Array.isArray(data) ? data : (data.results ?? data.months ?? []);
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
  const { scenarioState } = useScenario();
  const overrides: ScenarioOverrides = { indexationCA: scenarioState.indexationCA };

  return useQuery<BackendMonthlyResult[]>({
    queryKey: ["monthly-results", JSON.stringify(inputs), scenarioState.indexationCA],
    queryFn: () => fetchMonthlyResults(inputs, overrides),
    staleTime: 30_000,
    initialData: () => computeLocalMonthlyResults(inputs, overrides),
    placeholderData: (prev) => prev,
    retry: 1,
  });
}
