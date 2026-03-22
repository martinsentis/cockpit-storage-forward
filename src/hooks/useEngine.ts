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

async function fetchMonthlyResults(inputs: EngineInputs): Promise<BackendMonthlyResult[]> {
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
  return res.json();
}

// =============================================
// CONSTANTE PARTAGÉE — un seul horizonMonths
// =============================================
const DEFAULT_HORIZON_MONTHS = 60;

// =============================================
// HOOK CENTRAL — useMonthlyResults
// UN SEUL appel backend, mis en cache React Query
// =============================================
export function useMonthlyResults() {
  const { project } = useProject();
  const { state: scenarioState } = useScenario();

  const inputs = useMemo(() => {
    if (!project) return null;
    try {
      // Merge scénario dans les inputs
      const base = mapToProjectionInputs(project, DEFAULT_HORIZON_MONTHS);

      // Override gestionnaire
      if (scenarioState.gestionnaireNetMensuel > 0) {
        base.operatingCharges = base.operatingCharges.map((c) =>
          c.categoryCode === "SAS_OPEX" && c._isGestionnaire
            ? { ...c, monthlyAmount: scenarioState.gestionnaireNetMensuel * 1.45 }
            : c
        );
      }

      // Override rent mode
      if (scenarioState.rentPreset && scenarioState.rentPreset !== base.rentConstraints.mode) {
        base.rentConstraints = {
          ...base.rentConstraints,
          mode: scenarioState.rentPreset as any,
        };
        // Si on passe en FIXE via le preset, s'assurer que fixedRentAmount est défini
        if (scenarioState.rentPreset === "FIXE") {
          base.rentConstraints.fixedRentAmount = scenarioState.fixedRentAmount ?? 1000;
        }
      }

      return base;
    } catch (e) {
      console.error("[useMonthlyResults] mapToProjectionInputs failed:", e);
      return null;
    }
  }, [project, scenarioState]);

  const queryKey = useMemo(
    () => ["monthly-results", DEFAULT_HORIZON_MONTHS, inputs],
    [inputs]
  );

  return useQuery<BackendMonthlyResult[]>({
    queryKey,
    queryFn: async () => {
      if (!inputs) throw new Error("No inputs");
      return fetchMonthlyResults(inputs);
    },
    enabled: !!inputs,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}


    // ── Override phases (taux d'occupation + ramp-up) ──
    const capacityPhases = state.exploitation.capacityPhases.map((phase) => {
      const override = scenarioState.phaseOverrides[phase.id];
      return {
        ...phase,
        targetOccupancy: scenarioState.targetOccupancy,
        ...(override?.rampUpMonths !== undefined ? { rampUpMonths: override.rampUpMonths } : {}),
        ...(override?.rampCurve !== undefined ? { rampCurve: override.rampCurve } : {}),
      };
    });

    // ── Override loyer dynamique depuis rentPreset du scénario ──
    const loyerDynamique = {
      ...state.loyerDynamique,
      rentPlan: state.loyerDynamique.rentPlan.map((plan, i) =>
        i === 0
          ? {
              ...plan,
              strategy: {
                ...plan.strategy,
                mode: scenarioState.rentPreset,
              },
            }
          : plan,
      ),
    };

    return {
      projet: {
        ...state.projet,
        horizonMonths: scenarioState.horizonMonths,
      },
      build: state.build,
      financement: state.financement,
      exploitation: {
        ...state.exploitation,
        capacityPhases,
        gestionnaires: finalGestionnaires,
      },
      fonciere: state.fonciere,
      loyerDynamique,
      gouvernance: state.gouvernance,
      fiscalite: state.fiscalite,
    };
  }, [state, scenarioState]);

  const { data } = useQuery({
    queryKey: ["engine-monthly", inputs],
    queryFn: () => fetchMonthlyResults(inputs),
    staleTime: 10_000,
  });
  return data ?? [];
}
