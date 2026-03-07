export interface ExitHypotheses {
  fonciereValuation: number;
  exploitationEBEMultiple: number;
  repayDebtFirst: boolean;
  repayCcaFirst: boolean;
}

export interface ScenarioState {
  horizonMonths: number;
  indexationRate: number;
  targetOccupancy?: number;
  rampUpMonths?: number;
  exitHypotheses: ExitHypotheses;
}

export const DEFAULT_SCENARIO_STATE: ScenarioState = {
  horizonMonths: 120,
  indexationRate: 0.02,
  targetOccupancy: undefined,
  rampUpMonths: undefined,
  exitHypotheses: {
    fonciereValuation: 0,
    exploitationEBEMultiple: 6,
    repayDebtFirst: true,
    repayCcaFirst: true,
  },
};
