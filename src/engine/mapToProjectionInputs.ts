/**
 * Request Adapter: EngineInputs → ProjectionInputs
 *
 * Transforms the frontend's nested state into the flat contract
 * expected by the backend engine at /run-projection.
 */

import type { EngineInputs } from "./engineTypes";
import type { CapacityPhase, ChargeItem, DebtItem, Gestionnaire, RentStrategyMode, ServiceItem } from "@/types/project";

// ══════════════════════════════════════════════════════════════
// Backend contract types (alignés sur debtEngine.ts)
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
  rampCurve?: "LINEAR" | "FAST_START" | "SLOW_START";
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
    principalAmount: number;
    nominalRateAnnual: number;
    insuranceRateAnnual: number;
    totalDurationMonths: number;
    defermentMonths?: number;
    defermentType?: "NONE" | "INTEREST_ONLY" | "TOTAL";
  };
  state: {
    remainingPrincipal: number;
    remainingMonths: number;
  };
}

interface RentConstraints {
  mode: string;
  fixedRentAmount?: number;
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
    rampCurve: p.rampCurve,
    isActive: p.status === "ACTIVE",
  };
}

function mapDebt(d: DebtItem): ProjectionDebt {
  // Convertit assurance mensuelle (€) en taux annuel pour le moteur
  const insuranceRateAnnual = d.amount > 0 ? (d.insuranceMonthly / d.amount) * 12 : 0;

  // Convertit le type de différé
  const defermentType = d.deferralType === "PARTIAL" ? "INTEREST_ONLY" : d.deferralType === "TOTAL" ? "TOTAL" : "NONE";

  return {
    debt: {
      principalAmount: d.amount,
      nominalRateAnnual: d.annualRate,
      insuranceRateAnnual,
      totalDurationMonths: d.durationMonths,
      defermentMonths: d.deferralMonths ?? 0,
      defermentType,
    },
    state: {
      remainingPrincipal: d.amount,
      remainingMonths: d.durationMonths,
    },
  };
}

function mapChargeToOperating(c: ChargeItem): OperatingCharge {
  const monthlyAmount = c.frequency === "ANNUELLE" ? c.amountInput / 12 : c.amountInput;
  return {
    categoryCode: "SAS_OPEX",
    monthlyAmount,
    isActive: c.isActive,
  };
}

function mapGestionnaireToOperating(g: Gestionnaire): OperatingCharge {
  const monthlyAmount =
    g.type === "PRESTATAIRE" ? g.facturationMensuelle : g.salaireBrut * (1 + g.tauxChargesPatronales);
  return {
    categoryCode: "SAS_OPEX",
    monthlyAmount,
    isActive: g.actif,
  };
}

function mapService(s: ServiceItem) {
  // Seul le type PAR_M2 est supporté par le moteur (revenu × surface louée)
  // Les services FIXE et PAR_BOX sont ignorés pour l'instant
  if (!s.actif || s.type !== "PAR_M2") return null;
  return {
    code: s.nom,
    monthlyAmountPerLeasedM2: s.montantUnitaire,
    isActive: true,
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

  if (backendMode === "FIXE" && phase.strategy.parameters.fixed_rent_amount != null) {
    constraints.fixedRentAmount = phase.strategy.parameters.fixed_rent_amount; // ✅ corrigé
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

export function mapEngineInputsToProjectionInputs(inputs: EngineInputs): ProjectionInputs {
  const activePhases = inputs.exploitation.capacityPhases.filter((p) => p.status === "ACTIVE");
  const refPhase = activePhases[0] ?? inputs.exploitation.capacityPhases[0];

  return {
    horizonMonths: inputs.projet.horizonMonths,
    initialCash: inputs.financement.initialCash,
    sciInitialCash: inputs.financement.sciInitialCash,
    projectStartDate: inputs.projet.projectStartDate,

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

    services: inputs.exploitation.services.map(mapService).filter((s): s is NonNullable<typeof s> => s !== null),

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
