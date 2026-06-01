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

function toDecimalRate(rate: number | null | undefined): number {
  if (!rate || !Number.isFinite(rate)) return 0;
  return rate > 1 ? rate / 100 : rate;
}

function debtMonth(d: DebtItem, monthIndex: number) {
  if (!d.amount || !d.durationMonths || monthIndex < (d.startMonth ?? 0)) return { interest: 0, principal: 0 };
  const elapsed = monthIndex - (d.startMonth ?? 0);
  if (elapsed >= d.durationMonths) return { interest: 0, principal: 0 };
  if (d.type === "LEASE" && d.monthlyPayment > 0) return { interest: 0, principal: d.monthlyPayment };
  const remainingPrincipal = Math.max(0, d.amount - (d.amount / d.durationMonths) * elapsed);
  const interest = remainingPrincipal * toDecimalRate(d.annualRate) / 12 + (d.insuranceMonthly ?? 0);
  const inDeferral = elapsed < (d.deferralMonths ?? 0);
  const principal = inDeferral && d.deferralType !== "NONE" ? 0 : d.amount / d.durationMonths;
  return { interest, principal };
}

function computeLocalMonthlyResults(inputs: EngineInputs, overrides: ScenarioOverrides = {}): BackendMonthlyResult[] {
  const engine = computeEngine(inputs);
  const horizon = Math.max(1, inputs.projet.horizonMonths || 120);
  let cashEnd = inputs.financement.initialCash ?? 0;
  let sciCashEnd = inputs.financement.sciInitialCash ?? 0;
  const indexationCA = overrides.indexationCA ?? 0;
  const taxRate = inputs.fiscalite.corporateTaxRate ?? 0.25;

  return Array.from({ length: horizon }, (_, monthIndex) => {
    const indexFactor = Math.pow(1 + indexationCA, Math.floor(monthIndex / 12));
    const activePhases = inputs.exploitation.capacityPhases.filter((p) => p.status !== "DRAFT" && p.status !== "INACTIVE");

    let activeSurface = 0;
    let leasedSurface = 0;
    let revenue = 0;

    for (const phase of activePhases) {
      const startMonth = phase.startMonth ?? 0;
      if (monthIndex < startMonth) continue;
      const rampMonths = Math.max(1, phase.rampUpMonths ?? 12);
      const progress = Math.min(1, Math.max(0, (monthIndex - startMonth + 1) / rampMonths));
      const targetOccupancy = phase.targetOccupancy > 1 ? phase.targetOccupancy / 100 : phase.targetOccupancy;
      const surface = phaseSurface(phase);
      activeSurface += surface;
      leasedSurface += surface * targetOccupancy * progress;
      revenue += phaseCAHT(phase) * targetOccupancy * progress * indexFactor;
    }

    const sasDebt = inputs.financement.debts
      .filter((d) => d.entityId === "__exploitation__")
      .reduce((acc, d) => {
        const m = debtMonth(d, monthIndex);
        return { interest: acc.interest + m.interest, principal: acc.principal + m.principal };
      }, { interest: 0, principal: 0 });
    const sciDebt = [...inputs.financement.sciDebts, ...inputs.financement.debts.filter((d) => d.entityId === "__fonciere__")]
      .reduce((acc, d) => {
        const m = debtMonth(d, monthIndex);
        return { interest: acc.interest + m.interest, principal: acc.principal + m.principal };
      }, { interest: 0, principal: 0 });

    const opex = engine.exploitation.totalChargesHT + engine.exploitation.coutGestionnaires;
    const rent = engine.loyerDynamique.loyerCalcule;
    const sasTax = Math.max(0, revenue - opex - rent - sasDebt.interest) * taxRate;
    const sciRent = rent;
    const sciTax = Math.max(0, sciRent - engine.fonciere.totalChargesMensuellesHT - sciDebt.interest - engine.fonciere.amortissementAnnuel / 12) * taxRate;

    cashEnd += revenue - opex - rent - sasDebt.interest - sasDebt.principal - sasTax;
    sciCashEnd += sciRent + engine.fonciere.totalOtherRevenuesMensuellesHT - engine.fonciere.totalChargesMensuellesHT - sciDebt.interest - sciDebt.principal - sciTax;

    return {
      monthIndex,
      cashEnd,
      sciCashEnd,
      dscr: sasDebt.interest + sasDebt.principal > 0 ? (revenue - opex - rent) / (sasDebt.interest + sasDebt.principal) : 0,
      leasedSurface,
      activeSurface,
      leasedSurfacePercent: activeSurface > 0 ? leasedSurface / activeSurface : 0,
      sciAmortization: engine.fonciere.amortissementAnnuel / 12,
      projectedByCategory: {
        SAS_REVENUE: revenue,
        SAS_OPEX: -opex,
        SAS_RENT: -rent,
        SAS_EXP_DEBT_INTEREST: -sasDebt.interest,
        SAS_EXP_DEBT_PRINCIPAL: -sasDebt.principal,
        SAS_TAX: -sasTax,
        SCI_RENT: sciRent,
        SCI_DEBT_INTEREST: -sciDebt.interest,
        SCI_DEBT_PRINCIPAL: -sciDebt.principal,
        SCI_TAX: -sciTax,
      },
      warnings: ["Projection locale de secours — moteur distant indisponible ou en cours de chargement."],
    };
  });
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
