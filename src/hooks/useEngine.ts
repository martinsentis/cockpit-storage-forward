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

export function useMonthlyResults(): BackendMonthlyResult[] {
  const { state } = useProject();
  const { scenarioState } = useScenario();

  const inputs = useMemo<EngineInputs>(() => {
    // ── Override gestionnaire salary depuis le scénario ──
    const gestionnaires = state.exploitation.gestionnaires.map((g) => {
      if (g.type === "SALARIE" && g.actif && scenarioState.gestionnaireNetMensuel > 0) {
        return { ...g, salaireBrut: scenarioState.gestionnaireNetMensuel };
      }
      return g;
    });

    // Si aucun gestionnaire salarié actif mais scénario en a un → l'ajouter
    const hasActiveSalarie = gestionnaires.some((g) => g.type === "SALARIE" && g.actif);
    const finalGestionnaires =
      hasActiveSalarie || scenarioState.gestionnaireNetMensuel === 0
        ? gestionnaires
        : [
            ...gestionnaires,
            {
              id: "scenario-gestionnaire",
              nom: "Gestionnaire (scénario)",
              type: "SALARIE" as const,
              actif: true,
              facturationMensuelle: 0,
              prixType: "HT" as const,
              vatRate: 0,
              salaireBrut: scenarioState.gestionnaireNetMensuel,
              tauxChargesPatronales: 0.42,
              activeFromStart: true,
              startMonth: 0,
              hasEndMonth: false,
              endMonth: null,
            },
          ];

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
