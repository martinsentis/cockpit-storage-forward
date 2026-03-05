/**
 * Engine Types — Output interfaces for the financial engine.
 */

import type {
  ProjetData, BuildData, FinancementData, ExploitationData,
  FonciereData, LoyerDynamiqueData, GouvernanceData, FiscaliteData,
} from "@/types/project";

// ── Engine Input (all project state needed for calculations) ──

export interface EngineInputs {
  projet: ProjetData;
  build: BuildData;
  financement: FinancementData;
  exploitation: ExploitationData;
  fonciere: FonciereData;
  loyerDynamique: LoyerDynamiqueData;
  gouvernance: GouvernanceData;
  fiscalite: FiscaliteData;
}

// ── Exploitation Engine Outputs ──

export interface PhaseMetrics {
  phaseId: string;
  surface: number;
  nbBox: number;
  caHT: number;
  caTTC: number;
}

export interface ExploitationEngineOutputs {
  totalSurface: number;
  totalNbBox: number;
  totalCAHT: number;
  totalCATTC: number;
  prixM2Global: number;
  targetOccupancyWeighted: number;
  caServicesHT: number;
  coutServicesHT: number;
  margeServicesHT: number;
  margeServicesPct: number;
  coutGestionnaires: number;
  totalChargesHT: number;
  totalChargesTTC: number;
  loyerSCI: number;
  caTotal: number;
  resultat: number;
  totalCAHT_cible: number;
  totalCATTC_cible: number;
  caServicesHT_cible: number;
  caTotal_cible: number;
  resultat_cible: number;
  phaseMetrics: PhaseMetrics[];
}

// ── Foncière (SCI) Engine Outputs ──

export interface FonciereEngineOutputs {
  loyerMensuelHT: number;
  totalOtherRevenuesMensuellesHT: number;
  totalRevenusMensuelHT: number;
  totalChargesMensuellesHT: number;
  interetsMensuels: number;
  amortissementAnnuel: number;
  resultatExploitationSCI: number;
  resultatCourant: number;
  resultatFiscal: number;
}

// ── Loyer Dynamique Engine Outputs ──

export interface LoyerDynamiqueEngineOutputs {
  sciCharges: number;
  interets: number;
  principal: number;
  amortissement: number;
  loyerCalcule: number;
  exploitationImpact: number;
}

// ── Full Engine Output ──

export interface EngineOutputs {
  exploitation: ExploitationEngineOutputs;
  fonciere: FonciereEngineOutputs;
  loyerDynamique: LoyerDynamiqueEngineOutputs;
}
