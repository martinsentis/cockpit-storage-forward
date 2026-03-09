import type { RampCurve } from "@/types/project";

export type RentPreset = "SCI_AUTONOMY" | "DEBT_PAYDOWN" | "OPTIMIZATION" | "MIX" | "FIXED_AMOUNT";

export interface ExitHypotheses {
  fonciereValuation: number;
  exploitationEBEMultiple: number;
  repayDebtFirst: boolean;
  repayCcaFirst: boolean;
}

export const DEFAULT_EXIT_HYPOTHESES: ExitHypotheses = {
  fonciereValuation: 0,
  exploitationEBEMultiple: 6,
  repayDebtFirst: true,
  repayCcaFirst: true,
};

export interface PhaseOverride {
  rampUpMonths?: number;
  rampCurve?: RampCurve;
}

export interface ScenarioState {
  // rentPreset modifie uniquement ScenarioState
  // ne modifie jamais ProjectState
  rentPreset: RentPreset;
  horizonMonths: number;

  // Indexations
  indexationCA: number;
  indexationCharges: number;
  indexationChargesTarget: "exploitation" | "fonciere" | "les_deux";
  indexationAutresRevenusFonciere: number;

  // Remplissage
  targetOccupancy: number;

  /**
   * Phase overrides — key = capacityPhase.id (never array index)
   */
  phaseOverrides: Record<string, PhaseOverride>;

  // Gestionnaire
  gestionnaireNetMensuel: number;
  gestionnaireStartDate: string | null; // "YYYY-MM"
  gestionnaireHasEndDate: boolean;
  gestionnaireEndDate: string | null; // "YYYY-MM"

  // Comparaison
  compareWith: "none" | "baseline" | "snapshot";
  compareSnapshotId?: string;

  // Exit
  exitHypotheses: ExitHypotheses;
}

export const DEFAULT_SCENARIO_STATE: ScenarioState = {
  rentPreset: "RN_TARGET",
  horizonMonths: 120,

  indexationCA: 0.02,
  indexationCharges: 0.02,
  indexationChargesTarget: "les_deux",
  indexationAutresRevenusFonciere: 0.02,

  targetOccupancy: 0.9,

  phaseOverrides: {},

  gestionnaireNetMensuel: 0,
  gestionnaireStartDate: null,
  gestionnaireHasEndDate: false,
  gestionnaireEndDate: null,

  compareWith: "none",

  exitHypotheses: DEFAULT_EXIT_HYPOTHESES,
};
