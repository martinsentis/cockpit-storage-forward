/**
 * Request Adapter: EngineInputs → ProjectionInputs
 *
 * Transforms the frontend's nested state into the flat contract
 * expected by the backend engine at /run-projection.
 */

import type { EngineInputs } from "./engineTypes";
import type {
  CapacityPhase,
  ChargeItem,
  DebtItem,
  Gestionnaire,
  RentStrategyMode,
} from "@/types/project";

// ══════════════════════════════════════════════════════════════
// Backend contract types
// ══════════════════════════════════════════════════════════════

interface TaxBracket {
  upTo: number | null;
  rate: number;
}

interface TaxSchedulePeriod {
  startDate: string;
  endDate?: string;
  brackets: TaxBracket[];
}

interface ProjectionPhase {
  phaseId: string;
  totalSurface: number;
  operationalStartMonth: number;
  rampUpStartMonth: number;
  rampUpDurationMonths: number;
  isActive: boolean;
}

interface RevenueParams {
  pricePerM2: number;
  targetLeasedSurfacePercent: number;
  annualIndexationRate: number;
  indexationMonth: number;
}

interface OperatingCharge {
  categoryCode: string;
  monthlyAmount: number;
  isActive: boolean;
}

interface ProjectionDebt {
  debt: {
    amount: number;
    annualRate: number;
    durationMonths: number;
    startMonth: number;
  };
  state: {
    remainingPrincipal: number;
  };
}

interface RentConstraints {
  mode: string;
  [key: string]: unknown;
}

export interface ProjectionInputs {
  horizonMonths: number;
  initialCash: number;
  sciInitialCash: number;
  projectStartDate: string;
  taxSchedules: TaxSchedulePeriod[];
  taxRate: number;
  bufferMin: number;
  dscrMin: number;
  phases: ProjectionPhase[];
  revenueParams: RevenueParams;
  services: unknown[];
  operatingCharges: OperatingCharge[];
  debts: ProjectionDebt[];
  sciDebts: ProjectionDebt[];
  sciChargesCash: number;
  sciAmortization: number;
  ccaBalanceSas: number;
  ccaBalanceSci: number;
  distributableCashRate: number;
  ccaPriorityRatio: number;
  reserveStrategicRatio: number;
  reserveAfterCcaFullyRepaid: boolean;
  rentConstraints: RentConstraints;
}

// ══════════════════════════════════════════════════════════════
// Rent mode translation
// ══════════════════════════════════════════════════════════════

const RENT_MODE_MAP: Record<RentStrategyMode, string> = {
  SCI_AUTONOMY: "AUTONOMIE_SCI",
  DEBT_PAYDOWN: "DESENDETTEMENT_SCI",
  OPTIMIZATION: "OPTIMISATION_FISCALE",
  MIX: "OPTIMISATION_EBE_EXPLOITATION",
  FIXED_AMOUNT: "FIXE",
};

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

function mapPhase(p: CapacityPhase): ProjectionPhase {
  return {
    phaseId: p.id,
    totalSurface: p.surface,
    operationalStartMonth: p.startMonth,
    rampUpStartMonth: p.startMonth,
    rampUpDurationMonths: p.rampUpMonths,
    isActive: p.status === "ACTIVE",
  };
}

function mapDebt(d: DebtItem): ProjectionDebt {
  return {
    debt: {
      amount: d.amount,
      annualRate: d.annualRate,
      durationMonths: d.durationMonths,
      startMonth: d.startMonth ?? 0,
    },
    state: {
      remainingPrincipal: d.amount,
    },
  };
}

function mapChargeToOperating(c: ChargeItem): OperatingCharge {
  const monthlyAmount =
    c.frequency === "ANNUELLE" ? c.amountInput / 12 : c.amountInput;
  return {
    categoryCode: "SAS_OPEX",
    monthlyAmount,
    isActive: c.isActive,
  };
}

function mapGestionnaireToOperating(g: Gestionnaire): OperatingCharge {
  const monthlyAmount =
    g.type === "PRESTATAIRE"
      ? g.facturationMensuelle
      : g.salaireBrut * (1 + g.tauxChargesPatronales);
  return {
    categoryCode: "SAS_OPEX",
    monthlyAmount,
    isActive: g.actif,
  };
}

function buildRentConstraints(inputs: EngineInputs): RentConstraints {
  const plan = inputs.loyerDynamique.rentPlan;
  if (!plan || plan.length === 0) {
    return { mode: "AUTONOMIE_SCI" };
  }
  const phase = plan[0];
  const backendMode = RENT_MODE_MAP[phase.strategy.mode] ?? "AUTONOMIE_SCI";

  const constraints: RentConstraints = { mode: backendMode };

  // Pass through strategy parameters for modes that need them
  if (phase.strategy.parameters) {
    if (backendMode === "FIXE" && phase.strategy.parameters.fixed_rent_amount != null) {
      constraints.monthlyRent = phase.strategy.parameters.fixed_rent_amount;
    }
  }

  return constraints;
}

function deriveCcaPriorityRatio(inputs: EngineInputs): number {
  const steps = inputs.gouvernance.globalRule.allocationOrder;
  const ccaStep = steps.find((s) => s.type === "CCA_REPAYMENT");
  if (ccaStep && ccaStep.mode === "RATIO") {
    return ccaStep.ratio / 100;
  }
  return 1.0;
}

// ══════════════════════════════════════════════════════════════
// Main adapter
// ══════════════════════════════════════════════════════════════

export function mapEngineInputsToProjectionInputs(
  inputs: EngineInputs
): ProjectionInputs {
  // Revenue params from first active phase (or first phase)
  const activePhases = inputs.exploitation.capacityPhases.filter(
    (p) => p.status === "ACTIVE"
  );
  const refPhase = activePhases[0] ?? inputs.exploitation.capacityPhases[0];

  return {
    horizonMonths: inputs.projet.horizonMonths,
    initialCash: inputs.financement.initialCash,
    sciInitialCash: inputs.financement.sciInitialCash,
    projectStartDate: inputs.projet.projectStartDate,

    // Hardcoded default tax schedule (IS barème PME)
    taxSchedules: [
      {
        startDate: "2024-01",
        brackets: [
          { upTo: 42500, rate: 0.15 },
          { upTo: null, rate: 0.25 },
        ],
      },
    ],

    taxRate: inputs.fiscalite.corporateTaxRate,
    bufferMin: inputs.financement.bufferMin,
    dscrMin: inputs.financement.dscrMin,

    phases: inputs.exploitation.capacityPhases.map(mapPhase),

    revenueParams: {
      pricePerM2: refPhase?.prixM2 ?? 15,
      targetLeasedSurfacePercent: refPhase?.targetOccupancy ?? 0.85,
      annualIndexationRate: 0,
      indexationMonth: 0,
    },

    services: inputs.exploitation.services.filter((s) => s.actif),

    operatingCharges: [
      ...inputs.exploitation.charges.map(mapChargeToOperating),
      ...inputs.exploitation.gestionnaires.map(mapGestionnaireToOperating),
    ],

    debts: inputs.financement.debts.map(mapDebt),
    sciDebts: inputs.financement.sciDebts.map(mapDebt),

    sciChargesCash: inputs.financement.sciChargesCash,
    sciAmortization: inputs.financement.sciAmortization,

    ccaBalanceSas: 0,
    ccaBalanceSci: inputs.gouvernance.ccaBalance,

    distributableCashRate: inputs.gouvernance.globalRule.distributableCashRate,
    ccaPriorityRatio: deriveCcaPriorityRatio(inputs),
    reserveStrategicRatio: inputs.gouvernance.globalRule.reserveStrategicRatio,
    reserveAfterCcaFullyRepaid: true,

    rentConstraints: buildRentConstraints(inputs),
  };
}
