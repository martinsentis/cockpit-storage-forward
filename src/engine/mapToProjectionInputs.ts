/**
 * Request Adapter: EngineInputs → ProjectionInputs
 * VERSION CORRIGÉE — alignée sur les types exacts du backend
 */
import type { EngineInputs } from "./engineTypes";
import type {
  CapacityPhase,
  ChargeItem,
  SCIChargeItem,
  DebtItem,
  Gestionnaire,
  ServiceItem,
  RentStrategyMode,
  BuildAsset,
} from "@/types/project";

// ══════════════════════════════════════════════════════════════
// Types backend exacts (alignés sur debtEngine.ts + projectionEngine.ts)
// ══════════════════════════════════════════════════════════════

interface Debt {
  principalAmount: number;
  nominalRateAnnual: number; // décimal : 0.035 pour 3.5%
  insuranceRateAnnual: number; // décimal annuel
  totalDurationMonths: number;
  defermentMonths?: number;
  defermentType?: "NONE" | "INTEREST_ONLY" | "TOTAL";
  defermentExtendsDuration?: boolean;
  suspensionAllowed?: boolean;
  suspensionMaxPerYear?: number;
}

interface DebtState {
  remainingPrincipal: number;
  remainingMonths: number;
}

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
  rampCurve?: "LINEAR" | "SLOW_START" | "FAST_START";
  isActive: boolean;
}
interface RevenueParams {
  pricePerM2: number;
  targetLeasedSurfacePercent: number;
  annualIndexationRate: number;
  indexationMonth: number;
}
interface Service {
  code: string;
  monthlyAmountPerLeasedM2: number;
  isActive: boolean;
}
interface OperatingCharge {
  categoryCode: string;
  monthlyAmount: number;
  isActive: boolean;
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
  services: Service[];
  operatingCharges: OperatingCharge[];
  debts: { debt: Debt; state: DebtState }[];
  sciDebts: { debt: Debt; state: DebtState }[];
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
// Helpers
// ══════════════════════════════════════════════════════════════

const RENT_MODE_MAP: Record<RentStrategyMode, string> = {
  SCI_AUTONOMY: "AUTONOMIE_SCI",
  DEBT_PAYDOWN: "DESENDETTEMENT_SCI",
  OPTIMIZATION: "OPTIMISATION_FISCALE",
  MIX: "OPTIMISATION_EBE_EXPLOITATION",
  FIXED_AMOUNT: "FIXE",
};

// ── Prix m² depuis une phase (macro ou typo) ─────────────────
function computePrixM2(phase: CapacityPhase): number {
  if (phase.modeBox === "MACRO" || !phase.typologies?.length) {
    return phase.prixM2;
  }
  const actives = phase.typologies.filter((t) => t.actif);
  if (!actives.length) return phase.prixM2;
  const totalM2 = actives.reduce((s, t) => s + t.surfaceParBox * t.nombreDeBox, 0);
  const totalRev = actives.reduce((s, t) => {
    const ht = t.prixType === "TTC" ? t.prixMensuel / (1 + (t.vatRate || 0.2)) : t.prixMensuel;
    return s + ht * t.nombreDeBox;
  }, 0);
  return totalM2 > 0 ? totalRev / totalM2 : phase.prixM2;
}

// ── Prix m² pondéré sur l'ensemble des phases actives ────────
function computeWeightedPrixM2(phases: CapacityPhase[]): number {
  const actives = phases.filter((p) => p.status === "ACTIVE");
  if (!actives.length) return 15; // fallback
  const totalSurface = actives.reduce((s, p) => s + p.surface, 0);
  if (totalSurface === 0) return 15;
  const weightedRev = actives.reduce((s, p) => s + p.surface * computePrixM2(p), 0);
  return weightedRev / totalSurface;
}

// ── Phase → format backend ───────────────────────────────────
function mapPhase(p: CapacityPhase): ProjectionPhase {
  return {
    phaseId: p.id,
    totalSurface: p.surface,
    operationalStartMonth: p.startMonth,
    rampUpStartMonth: p.startMonth, // même départ
    rampUpDurationMonths: p.rampUpMonths,
    rampCurve: p.rampCurve as "LINEAR" | "SLOW_START" | "FAST_START",
    isActive: p.status === "ACTIVE",
  };
}

// ── Debt → format backend (avec tous les champs corrects) ────
function mapDebt(d: DebtItem): { debt: Debt; state: DebtState } {
  const principal = d.amount;

  // Taux : le front stocke en % (ex: 3.5), le moteur attend un décimal (0.035)
  const nominalRateAnnual = d.annualRate / 100;

  // Assurance : le front stocke en €/mois, le moteur attend un taux annuel
  const insuranceRateAnnual = principal > 0 ? (d.insuranceMonthly * 12) / principal : 0;

  // Différé
  let defermentType: "NONE" | "INTEREST_ONLY" | "TOTAL" | undefined;
  if (d.deferralType === "PARTIAL") defermentType = "INTEREST_ONLY";
  else if (d.deferralType === "TOTAL") defermentType = "TOTAL";

  return {
    debt: {
      principalAmount: principal,
      nominalRateAnnual,
      insuranceRateAnnual,
      totalDurationMonths: d.durationMonths,
      ...(d.deferralMonths > 0 && {
        defermentMonths: d.deferralMonths,
        defermentType: defermentType ?? "INTEREST_ONLY",
        defermentExtendsDuration: true,
      }),
      suspensionAllowed: d.suspensionEnabled,
      ...(d.suspensionEnabled && {
        suspensionMaxPerYear: d.suspensionMonthsPerYear,
      }),
    },
    state: {
      remainingPrincipal: principal,
      remainingMonths: d.durationMonths,
    },
  };
}

// ── Charge exploitation → OperatingCharge ────────────────────
function mapCharge(c: ChargeItem): OperatingCharge {
  const monthly = c.frequency === "ANNUELLE" ? c.amountInput / 12 : c.amountInput;
  return { categoryCode: "SAS_OPEX", monthlyAmount: monthly, isActive: c.isActive };
}

// ── Gestionnaire → OperatingCharge ───────────────────────────
function mapGestionnaire(g: Gestionnaire): OperatingCharge {
  const monthly = g.type === "PRESTATAIRE" ? g.facturationMensuelle : g.salaireBrut * (1 + g.tauxChargesPatronales);
  return { categoryCode: "SAS_OPEX", monthlyAmount: monthly, isActive: g.actif };
}

// ── Service → format backend (PAR_M2 uniquement) ─────────────
function mapService(s: ServiceItem): Service | null {
  if (!s.actif) return null;
  if (s.type !== "PAR_M2") return null; // FIXE/PAR_BOX non supportés nativement
  return {
    code: s.id,
    monthlyAmountPerLeasedM2: s.montantUnitaire,
    isActive: true,
  };
}

// ── Calcul amortissement mensuel SCI depuis les assets ───────
function computeSciAmortization(inputs: EngineInputs): number {
  // Si l'utilisateur a saisi une valeur manuelle non nulle, on la respecte
  if (inputs.financement.sciAmortization > 0) {
    return inputs.financement.sciAmortization;
  }
  // Sinon on calcule depuis les assets du build
  // (on attribue à la SCI : BATIMENTS, VRD, TERRAIN — les actifs immobiliers)
  const sciCategories = new Set(["BATIMENTS", "VRD", "HONORAIRES"]);
  return inputs.build.capexEvents
    .flatMap((e) => e.assets)
    .filter((a: BuildAsset) => a.amortissable && a.depreciationYears > 0 && sciCategories.has(a.category))
    .reduce((sum: number, a: BuildAsset) => sum + a.amount / (a.depreciationYears * 12), 0);
}

// ── Calcul charges mensuelles SCI depuis fonciere.charges ────
function computeSciChargesCash(inputs: EngineInputs): number {
  // Si valeur manuelle non nulle, on la respecte
  if (inputs.financement.sciChargesCash > 0) {
    return inputs.financement.sciChargesCash;
  }
  return inputs.fonciere.charges
    .filter((c: SCIChargeItem) => c.isActive)
    .reduce((sum: number, c: SCIChargeItem) => {
      const monthly = c.frequency === "ANNUELLE" ? c.amountInput / 12 : c.amountInput;
      return sum + monthly;
    }, 0);
}

// ── Rentconstraints ──────────────────────────────────────────
function buildRentConstraints(inputs: EngineInputs): RentConstraints {
  const plan = inputs.loyerDynamique.rentPlan;
  if (!plan?.length) return { mode: "AUTONOMIE_SCI" };
  const phase = plan[0];
  const backendMode = RENT_MODE_MAP[phase.strategy.mode] ?? "AUTONOMIE_SCI";
  const constraints: RentConstraints = { mode: backendMode };
  if (backendMode === "FIXE" && phase.strategy.parameters?.fixed_rent_amount != null) {
    // ✅ CORRECT
    constraints.fixedRentAmount = phase.strategy.parameters.fixed_rent_amount;
  }
  return constraints;
}

// ── ccaPriorityRatio depuis l'ordre d'allocation ──────────────
function deriveCcaPriorityRatio(inputs: EngineInputs): number {
  const steps = inputs.gouvernance.globalRule.allocationOrder;
  const ccaStep = steps.find((s) => s.type === "CCA_REPAYMENT");
  if (ccaStep?.mode === "RATIO") return ccaStep.ratio / 100;
  return 1.0;
}

// ══════════════════════════════════════════════════════════════
// Adaptateur principal
// ══════════════════════════════════════════════════════════════
export function mapEngineInputsToProjectionInputs(inputs: EngineInputs): ProjectionInputs {
  const activePhases = inputs.exploitation.capacityPhases.filter((p) => p.status === "ACTIVE");
  const refPhase = activePhases[0] ?? inputs.exploitation.capacityPhases[0];
  const prixM2 = computeWeightedPrixM2(inputs.exploitation.capacityPhases);

  // Services PAR_M2 uniquement (FIXE/PAR_BOX non supportés par le moteur)
  const services = inputs.exploitation.services.map(mapService).filter((s): s is Service => s !== null);

  return {
    horizonMonths: inputs.projet.horizonMonths,
    initialCash: inputs.financement.initialCash,
    sciInitialCash: inputs.financement.sciInitialCash,
    projectStartDate: inputs.projet.projectStartDate,

    // Barème IS PME France (standard légal)
    taxSchedules: [
      {
        startDate: "2024-01",
        brackets: [
          { upTo: 42500, rate: 0.15 },
          { upTo: null, rate: inputs.fiscalite.corporateTaxRate },
        ],
      },
    ],
    taxRate: inputs.fiscalite.corporateTaxRate,
    bufferMin: inputs.financement.bufferMin,
    dscrMin: inputs.financement.dscrMin,

    // Phases
    phases: inputs.exploitation.capacityPhases.map(mapPhase),

    // Revenus : prix pondéré + taux d'occupation de la phase de référence
    revenueParams: {
      pricePerM2: prixM2,
      targetLeasedSurfacePercent: refPhase?.targetOccupancy ?? 0.85,
      annualIndexationRate: 0, // à brancher sur scenarioState.indexationCA
      indexationMonth: 0,
    },

    services,

    // Charges d'exploitation : charges fixes + gestionnaires
    operatingCharges: [
      ...inputs.exploitation.charges.map(mapCharge),
      ...inputs.exploitation.gestionnaires.map(mapGestionnaire),
    ],

    // Dettes SAS
    debts: inputs.financement.debts.map(mapDebt),

    // Dettes SCI
    sciDebts: inputs.financement.sciDebts.map(mapDebt),

    // Charges et amortissement SCI (calculés automatiquement si non renseignés)
    sciChargesCash: computeSciChargesCash(inputs),
    sciAmortization: computeSciAmortization(inputs),

    // CCA
    ccaBalanceSas: 0,
    ccaBalanceSci: inputs.gouvernance.ccaBalance,

    // Gouvernance / waterfall
    distributableCashRate: inputs.gouvernance.globalRule.distributableCashRate,
    ccaPriorityRatio: deriveCcaPriorityRatio(inputs),
    reserveStrategicRatio: inputs.gouvernance.globalRule.reserveStrategicRatio,
    reserveAfterCcaFullyRepaid: true,

    rentConstraints: buildRentConstraints(inputs),
  };
}
