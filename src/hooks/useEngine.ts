/**
 * useEngine — React hook that provides engine outputs, fetched from backend API.
 * Projection pages must only use Railway backend results.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "@/contexts/ProjectContext";
import { useScenario } from "@/contexts/ScenarioContext";
import { mapEngineInputsToProjectionInputs, type ScenarioOverrides } from "@/engine/mapToProjectionInputs";
import { mapProjectionResultsToEngineOutputs } from "@/engine/mapFromProjectionResults";
import type { EngineOutputs, EngineInputs } from "@/engine/engineTypes";
import { API_URL } from "@/config";

const ENGINE_TIMEOUT_MS = 45_000;

async function postProjection(inputs: EngineInputs, overrides: ScenarioOverrides = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ENGINE_TIMEOUT_MS);

  try {
    const payload = mapEngineInputsToProjectionInputs(inputs, undefined, overrides);
    const res = await fetch(`${API_URL}/run-projection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Engine API ${res.status}: ${errBody}`);
    }

    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Railway n'a pas répondu avant 45 secondes.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

const railwayQueryOptions = {
  staleTime: 30_000,
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(2_000 * 2 ** attemptIndex, 10_000),
  refetchOnReconnect: true,
  refetchOnWindowFocus: true,
} as const;

async function fetchEngine(inputs: EngineInputs, overrides: ScenarioOverrides = {}): Promise<EngineOutputs> {
  const data = await postProjection(inputs, overrides);
  // Le backend retourne { results: MonthlyResult[], investorMetrics: {...} }
  const results = Array.isArray(data) ? data : (data.results ?? []);
  return mapProjectionResultsToEngineOutputs(results);
}

export { fetchEngine };

export function useEngine(): EngineOutputs | undefined {
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
    ...railwayQueryOptions,
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
export function useEngineWithScenario(): EngineOutputs | undefined {
  const inputs = useBuildScenarioInputs();
  const { scenarioState } = useScenario();
  const overrides: ScenarioOverrides = { indexationCA: scenarioState.indexationCA };

  const { data } = useQuery({
    queryKey: ["engine", JSON.stringify(inputs), scenarioState.indexationCA],
    queryFn: () => fetchEngine(inputs, overrides),
    ...railwayQueryOptions,
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
  const data = await postProjection(inputs, overrides);
  // Le backend retourne { results: MonthlyResult[], investorMetrics: {...} }
  return Array.isArray(data) ? data : (data.results ?? data.months ?? []);
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
    ...railwayQueryOptions,
  });
}
