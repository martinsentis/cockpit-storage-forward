import type {
  EngineOutputs,
  ExploitationEngineOutputs,
  FonciereEngineOutputs,
  LoyerDynamiqueEngineOutputs,
} from "./engineTypes";

export interface MonthlyResult {
  monthIndex: number;
  cashEnd: number;
  sciCashEnd: number;
  dscr: number;
  projectedByCategory?: Record<string, number>;
  warnings?: string[];
  [key: string]: unknown;
}

export function mapProjectionResultsToEngineOutputs(results: MonthlyResult[]): EngineOutputs {
  if (!results || results.length === 0) {
    return emptyOutputs();
  }

  const last = results[results.length - 1];
  const cat = last.projectedByCategory ?? {};

  // Extraction depuis projectedByCategory
  const revenue = cat["SAS_REVENUE"] ?? 0;
  const rent = Math.abs(cat["SAS_RENT"] ?? 0);
  const opex = Math.abs(cat["SAS_OPEX"] ?? 0);
  const ebitda = revenue - opex - rent;
  const sciRevenue = cat["SCI_RENT"] ?? 0;
  const sciInterest = Math.abs(cat["SCI_DEBT_INTEREST"] ?? 0);
  const debtService = Math.abs(cat["SAS_EXP_DEBT_INTEREST"] ?? 0) + Math.abs(cat["SAS_EXP_DEBT_PRINCIPAL"] ?? 0);

  const exploitation: ExploitationEngineOutputs = {
    totalSurface: 0,
    totalNbBox: 0,
    totalCAHT: revenue,
    totalCATTC: revenue * 1.2,
    prixM2Global: 0,
    targetOccupancyWeighted: 0.85,
    caServicesHT: 0,
    coutServicesHT: 0,
    margeServicesHT: 0,
    margeServicesPct: 1,
    coutGestionnaires: 0,
    totalChargesHT: opex,
    totalChargesTTC: opex * 1.2,
    loyerSCI: rent,
    caTotal: revenue,
    resultat: ebitda,
    totalCAHT_cible: revenue * 0.85,
    totalCATTC_cible: revenue * 0.85 * 1.2,
    caServicesHT_cible: 0,
    caTotal_cible: revenue * 0.85,
    resultat_cible: ebitda * 0.85,
    phaseMetrics: [],
  };

  const fonciere: FonciereEngineOutputs = {
    loyerMensuelHT: rent,
    totalOtherRevenuesMensuellesHT: 0,
    totalRevenusMensuelHT: sciRevenue,
    totalChargesMensuellesHT: 0,
    interetsMensuels: sciInterest,
    amortissementAnnuel: 0,
    resultatExploitationSCI: sciRevenue,
    resultatCourant: sciRevenue - sciInterest,
    resultatFiscal: sciRevenue - sciInterest,
  };

  const loyerDynamique: LoyerDynamiqueEngineOutputs = {
    sciCharges: 0,
    interets: sciInterest,
    principal: debtService - sciInterest,
    amortissement: 0,
    loyerCalcule: rent,
    exploitationImpact: -rent,
  };

  return { exploitation, fonciere, loyerDynamique };
}

function emptyOutputs(): EngineOutputs {
  return {
    exploitation: {
      totalSurface: 0,
      totalNbBox: 0,
      totalCAHT: 0,
      totalCATTC: 0,
      prixM2Global: 0,
      targetOccupancyWeighted: 0.85,
      caServicesHT: 0,
      coutServicesHT: 0,
      margeServicesHT: 0,
      margeServicesPct: 0,
      coutGestionnaires: 0,
      totalChargesHT: 0,
      totalChargesTTC: 0,
      loyerSCI: 0,
      caTotal: 0,
      resultat: 0,
      totalCAHT_cible: 0,
      totalCATTC_cible: 0,
      caServicesHT_cible: 0,
      caTotal_cible: 0,
      resultat_cible: 0,
      phaseMetrics: [],
    },
    fonciere: {
      loyerMensuelHT: 0,
      totalOtherRevenuesMensuellesHT: 0,
      totalRevenusMensuelHT: 0,
      totalChargesMensuellesHT: 0,
      interetsMensuels: 0,
      amortissementAnnuel: 0,
      resultatExploitationSCI: 0,
      resultatCourant: 0,
      resultatFiscal: 0,
    },
    loyerDynamique: {
      sciCharges: 0,
      interets: 0,
      principal: 0,
      amortissement: 0,
      loyerCalcule: 0,
      exploitationImpact: 0,
    },
  };
}
