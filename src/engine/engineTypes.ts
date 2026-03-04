/**
 * Engine Types — Output interfaces for the financial engine.
 * 
 * ARCHITECTURE PRINCIPLE:
 * The frontend NEVER computes financial values directly.
 * All calculations go through the engine service (src/engine/engine.ts),
 * which will eventually be replaced by a backend API call.
 * 
 * The frontend only:
 * 1. Collects user inputs
 * 2. Sends inputs to the engine
 * 3. Displays engine outputs
 */

import type {
  ProjetData, BuildData, FinancementData, ExploitationData,
  FonciereData, LoyerDynamiqueData, GouvernanceData,
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
  // Aggregates
  totalSurface: number;
  totalNbBox: number;
  totalCAHT: number;
  totalCATTC: number;
  prixM2Global: number;
  targetOccupancyWeighted: number;

  // Services
  caServicesHT: number;
  coutServicesHT: number;
  margeServicesHT: number;
  margeServicesPct: number;

  // Gestionnaires
  coutGestionnaires: number;

  // Charges
  totalChargesHT: number;
  totalChargesTTC: number;

  // Loyer SCI
  loyerSCI: number;

  // Totals
  caTotal: number;
  resultat: number; // EBE

  // Target occupancy variants
  totalCAHT_cible: number;
  totalCATTC_cible: number;
  caServicesHT_cible: number;
  caTotal_cible: number;
  resultat_cible: number;

  // Per-phase metrics (for display in phase cards)
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
