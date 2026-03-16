/**
 * Response Adapter: MonthlyResult[] → EngineOutputs
 *
 * Converts the backend's monthly time-series response into the
 * legacy EngineOutputs shape consumed by existing frontend pages.
 *
 * This is a temporary bridge until pages are migrated to consume
 * MonthlyResult[] directly for time-series charts.
 */

import type { EngineOutputs, ExploitationEngineOutputs, FonciereEngineOutputs, LoyerDynamiqueEngineOutputs } from "./engineTypes";

// ══════════════════════════════════════════════════════════════
// Backend response type (minimal shape we rely on)
// ══════════════════════════════════════════════════════════════

export interface MonthlyResult {
  month: number;
  cashStart?: number;
  cashEnd?: number;
  sciCashStart?: number;
  sciCashEnd?: number;
  revenue?: number;
  revenueServices?: number;
  operatingCharges?: number;
  rent?: number;
  ebitda?: number;
  debtService?: number;
  sciRevenue?: number;
  sciCharges?: number;
  sciInterest?: number;
  sciAmortization?: number;
  sciResult?: number;
  projectedByCategory?: Record<string, number>;
  warnings?: string[];
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════════
// Adapter
// ══════════════════════════════════════════════════════════════

export function mapProjectionResultsToEngineOutputs(
  results: MonthlyResult[]
): EngineOutputs {
  if (!results || results.length === 0) {
    return emptyOutputs();
  }

  const last = results[results.length - 1];

  // ── Exploitation outputs (derived from last month snapshot) ──
  const exploitation: ExploitationEngineOutputs = {
    totalSurface: 0,
    totalNbBox: 0,
    totalCAHT: last.revenue ?? 0,
    totalCATTC: (last.revenue ?? 0) * 1.2,
    prixM2Global: 0,
    targetOccupancyWeighted: 0.85,
    caServicesHT: last.revenueServices ?? 0,
    coutServicesHT: 0,
    margeServicesHT: last.revenueServices ?? 0,
    margeServicesPct: 1,
    coutGestionnaires: 0,
    totalChargesHT: Math.abs(last.operatingCharges ?? 0),
    totalChargesTTC: Math.abs(last.operatingCharges ?? 0) * 1.2,
    loyerSCI: Math.abs(last.rent ?? 0),
    caTotal: (last.revenue ?? 0) + (last.revenueServices ?? 0),
    resultat: last.ebitda ?? 0,
    totalCAHT_cible: (last.revenue ?? 0) * 0.85,
    totalCATTC_cible: (last.revenue ?? 0) * 0.85 * 1.2,
    caServicesHT_cible: (last.revenueServices ?? 0) * 0.85,
    caTotal_cible: ((last.revenue ?? 0) + (last.revenueServices ?? 0)) * 0.85,
    resultat_cible: (last.ebitda ?? 0) * 0.85,
    phaseMetrics: [],
  };

  // ── Foncière outputs ──
  const fonciere: FonciereEngineOutputs = {
    loyerMensuelHT: Math.abs(last.rent ?? 0),
    totalOtherRevenuesMensuellesHT: 0,
    totalRevenusMensuelHT: last.sciRevenue ?? Math.abs(last.rent ?? 0),
    totalChargesMensuellesHT: Math.abs(last.sciCharges ?? 0),
    interetsMensuels: Math.abs(last.sciInterest ?? 0),
    amortissementAnnuel: (last.sciAmortization ?? 0) * 12,
    resultatExploitationSCI: (last.sciRevenue ?? 0) - Math.abs(last.sciCharges ?? 0),
    resultatCourant: (last.sciRevenue ?? 0) - Math.abs(last.sciCharges ?? 0) - Math.abs(last.sciInterest ?? 0),
    resultatFiscal: last.sciResult ?? 0,
  };

  // ── Loyer Dynamique outputs ──
  const loyerDynamique: LoyerDynamiqueEngineOutputs = {
    sciCharges: Math.abs(last.sciCharges ?? 0),
    interets: Math.abs(last.sciInterest ?? 0),
    principal: last.debtService ? Math.abs(last.debtService) - Math.abs(last.sciInterest ?? 0) : 0,
    amortissement: last.sciAmortization ?? 0,
    loyerCalcule: Math.abs(last.rent ?? 0),
    exploitationImpact: -(Math.abs(last.rent ?? 0)),
  };

  return { exploitation, fonciere, loyerDynamique };
}

// ── Empty fallback ──

function emptyOutputs(): EngineOutputs {
  return {
    exploitation: {
      totalSurface: 0, totalNbBox: 0, totalCAHT: 0, totalCATTC: 0,
      prixM2Global: 0, targetOccupancyWeighted: 0.85,
      caServicesHT: 0, coutServicesHT: 0, margeServicesHT: 0, margeServicesPct: 0,
      coutGestionnaires: 0, totalChargesHT: 0, totalChargesTTC: 0,
      loyerSCI: 0, caTotal: 0, resultat: 0,
      totalCAHT_cible: 0, totalCATTC_cible: 0,
      caServicesHT_cible: 0, caTotal_cible: 0, resultat_cible: 0,
      phaseMetrics: [],
    },
    fonciere: {
      loyerMensuelHT: 0, totalOtherRevenuesMensuellesHT: 0,
      totalRevenusMensuelHT: 0, totalChargesMensuellesHT: 0,
      interetsMensuels: 0, amortissementAnnuel: 0,
      resultatExploitationSCI: 0, resultatCourant: 0, resultatFiscal: 0,
    },
    loyerDynamique: {
      sciCharges: 0, interets: 0, principal: 0,
      amortissement: 0, loyerCalcule: 0, exploitationImpact: 0,
    },
  };
}
