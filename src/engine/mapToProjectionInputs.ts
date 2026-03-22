// src/engine/mapToProjectionInputs.ts
// VERSION CANONIQUE — alignée sur backend ProjectionEngine V1
// Contrats vérifiés sur : debtEngine.ts, rentSolver.ts, revenueCapacityEngine.ts, projectionEngine.ts

import { Project } from "@/types/project";

// ============================================================
// TYPES BACKEND (miroir des interfaces du backend)
// ============================================================

export interface BackendDebt {
  principalAmount: number;
  nominalRateAnnual: number; // décimal (ex: 0.045 pour 4.5%)
  insuranceRateAnnual: number; // décimal (ex: 0.003 pour 0.3%)
  totalDurationMonths: number;
  defermentMonths?: number;
  defermentType?: "NONE" | "INTEREST_ONLY" | "TOTAL";
  defermentExtendsDuration?: boolean;
  suspensionAllowed?: boolean;
  suspensionMaxPerYear?: number;
  suspensionExtendsDuration?: boolean;
}

export interface BackendDebtState {
  remainingPrincipal: number;
  remainingMonths: number;
}

export interface BackendCapacityPhase {
  phaseId: string;
  totalSurface: number;
  operationalStartMonth: number;
  rampUpStartMonth: number;
  rampUpDurationMonths: number;
  rampCurve?: "LINEAR" | "SLOW_START" | "FAST_START";
  isActive: boolean;
}

export interface BackendRevenueParams {
  pricePerM2: number;
  targetLeasedSurfacePercent: number; // 0 → 1
  annualIndexationRate?: number;
  indexationMonth?: number;
}

export interface BackendService {
  code: string;
  monthlyAmountPerLeasedM2: number;
  isActive: boolean;
}

export interface BackendRentConstraints {
  mode: "DESENDETTEMENT_SCI" | "OPTIMISATION_FISCALE" | "AUTONOMIE_SCI" | "OPTIMISATION_EBE_EXPLOITATION" | "FIXE";
  fixedRentAmount?: number; // ⚠️ OBLIGATOIRE si mode === "FIXE"
  marketMin?: number;
  marketMax?: number;
}

export interface BackendOperatingCharge {
  categoryCode: string;
  monthlyAmount: number;
  isActive: boolean;
}

export interface ProjectionInputs {
  horizonMonths: number;

  initialCash: number;
  sciInitialCash: number;

  projectStartDate: string; // format "YYYY-MM"
  taxSchedules: any[];

  taxRate: number;
  bufferMin: number;
  dscrMin?: number;

  phases: BackendCapacityPhase[];
  revenueParams: BackendRevenueParams;
  services: BackendService[];

  operatingCharges: BackendOperatingCharge[];

  debts: { debt: BackendDebt; state: BackendDebtState }[];
  sciDebts: { debt: BackendDebt; state: BackendDebtState }[];

  sciChargesCash: number;
  sciAmortization: number;

  ccaBalanceSas: number;
  ccaBalanceSci: number;
  distributableCashRate: number;
  ccaPriorityRatio: number;
  reserveStrategicRatio: number;
  reserveAfterCcaFullyRepaid: boolean;

  rentConstraints: BackendRentConstraints;
}

// ============================================================
// HELPERS
// ============================================================

/** Convertit un taux annuel en % (ex: 4.5) → décimal (0.045) */
function pctToDecimal(rate: number | undefined | null): number {
  if (!rate || !Number.isFinite(rate)) return 0;
  // Sécurité : si déjà en décimal (< 1), on ne redivise pas
  if (rate < 1) return rate;
  return rate / 100;
}

/** Convertit une assurance mensuelle en € → taux annuel décimal */
function insuranceMonthlyToAnnualRate(insuranceMonthly: number | undefined | null, principal: number): number {
  if (!insuranceMonthly || !principal || principal <= 0) return 0;
  return (insuranceMonthly * 12) / principal;
}

// ============================================================
// MAPPER DETTES
// ============================================================

function mapDebt(d: any): { debt: BackendDebt; state: BackendDebtState } | null {
  if (!d) return null;

  const principal = d.principalAmount ?? d.amount ?? 0;
  const durationMonths = d.totalDurationMonths ?? d.durationMonths ?? 0;

  if (principal <= 0 || durationMonths <= 0) return null;

  // Taux nominal : stocké en % → converti en décimal
  const nominalRateAnnual = pctToDecimal(d.nominalRateAnnual ?? d.annualRate ?? d.rate);

  // Assurance : peut être en € mensuel ou en taux annuel décimal
  let insuranceRateAnnual = 0;
  if (d.insuranceRateAnnual != null) {
    insuranceRateAnnual = pctToDecimal(d.insuranceRateAnnual);
  } else if (d.insuranceMonthly != null) {
    insuranceRateAnnual = insuranceMonthlyToAnnualRate(d.insuranceMonthly, principal);
  } else if (d.insuranceRate != null) {
    insuranceRateAnnual = pctToDecimal(d.insuranceRate);
  }

  // Différé
  const defermentMonths = d.defermentMonths ?? d.deferralMonths ?? 0;
  const rawDeferType = d.defermentType ?? d.deferralType ?? "NONE";
  const defermentType: "NONE" | "INTEREST_ONLY" | "TOTAL" =
    rawDeferType === "INTEREST_ONLY" || rawDeferType === "TOTAL" ? rawDeferType : "NONE";

  const debt: BackendDebt = {
    principalAmount: principal,
    nominalRateAnnual,
    insuranceRateAnnual,
    totalDurationMonths: durationMonths,
    ...(defermentMonths > 0 && {
      defermentMonths,
      defermentType,
      defermentExtendsDuration: d.defermentExtendsDuration ?? d.deferralExtendsDuration ?? false,
    }),
    ...(d.suspensionAllowed != null && {
      suspensionAllowed: d.suspensionAllowed,
      suspensionMaxPerYear: d.suspensionMaxPerYear ?? 1,
      suspensionExtendsDuration: d.suspensionExtendsDuration ?? false,
    }),
  };

  const state: BackendDebtState = {
    remainingPrincipal: d.remainingPrincipal ?? principal,
    remainingMonths: d.remainingMonths ?? durationMonths,
  };

  return { debt, state };
}

// ============================================================
// MAPPER PHASES CAPACITÉ
// ============================================================

function mapPhase(phase: any, index: number): BackendCapacityPhase {
  return {
    phaseId: phase.id ?? phase.phaseId ?? `phase-${index}`,
    totalSurface: phase.totalSurface ?? phase.surface ?? 0,
    operationalStartMonth: phase.operationalStartMonth ?? phase.startMonth ?? 0,
    rampUpStartMonth: Math.max(
      phase.rampUpStartMonth ?? phase.operationalStartMonth ?? phase.startMonth ?? 0,
      phase.operationalStartMonth ?? phase.startMonth ?? 0,
    ),
    rampUpDurationMonths: phase.rampUpDurationMonths ?? phase.rampUpMonths ?? 12,
    rampCurve: phase.rampCurve ?? "LINEAR",
    isActive: phase.isActive !== false,
  };
}

// ============================================================
// MAPPER CONTRAINTES DE LOYER
// ============================================================

function mapRentConstraints(project: Project): BackendRentConstraints {
  // Chercher la stratégie de loyer dans le projet
  // Priorité : fonciere.rentStrategy > exploitation.rentStrategy > default
  const strategy =
    (project as any).fonciere?.rentStrategy ??
    (project as any).exploitation?.rentStrategy ??
    (project as any).rentStrategy ??
    null;

  if (!strategy) {
    return { mode: "AUTONOMIE_SCI" };
  }

  const mode: BackendRentConstraints["mode"] = strategy.mode ?? "AUTONOMIE_SCI";

  const params = strategy.parameters ?? strategy.params ?? {};

  switch (mode) {
    case "FIXE":
      return {
        mode: "FIXE",
        // ✅ CORRECTION CRITIQUE : fixedRentAmount (pas monthlyRent)
        fixedRentAmount: params.fixedRentAmount ?? params.fixed_rent_amount ?? params.monthlyRent ?? 0,
        marketMin: params.marketMin,
        marketMax: params.marketMax,
      };

    case "DESENDETTEMENT_SCI":
    case "OPTIMISATION_FISCALE":
    case "AUTONOMIE_SCI":
    case "OPTIMISATION_EBE_EXPLOITATION":
      return {
        mode,
        marketMin: params.marketMin,
        marketMax: params.marketMax,
      };

    default:
      return { mode: "AUTONOMIE_SCI" };
  }
}

// ============================================================
// CALCUL AMORTISSEMENT SCI depuis les actifs CAPEX
// ============================================================

const AMORTIZABLE_CATEGORIES = ["BATIMENTS", "VRD", "HONORAIRES", "CONSTRUCTION", "TRAVAUX"];
const DEFAULT_AMORTIZATION_YEARS: Record<string, number> = {
  BATIMENTS: 30,
  VRD: 15,
  HONORAIRES: 10,
  CONSTRUCTION: 30,
  TRAVAUX: 10,
};

function computeSciAmortizationMonthly(project: Project): number {
  const capexEvents: any[] =
    (project as any).build?.capexEvents ?? (project as any).fonciere?.capexEvents ?? (project as any).capexItems ?? [];

  if (!capexEvents || capexEvents.length === 0) return 0;

  let totalMonthly = 0;

  for (const asset of capexEvents) {
    const category: string = (asset.category ?? "").toUpperCase();
    if (!AMORTIZABLE_CATEGORIES.includes(category)) continue;

    const amount = asset.amount ?? asset.cost ?? 0;
    if (amount <= 0) continue;

    const durationYears = asset.amortizationYears ?? asset.durationYears ?? DEFAULT_AMORTIZATION_YEARS[category] ?? 20;

    totalMonthly += amount / (durationYears * 12);
  }

  return totalMonthly;
}

// ============================================================
// CALCUL CHARGES SCI mensuelles
// ============================================================

function computeSciChargesCashMonthly(project: Project): number {
  const charges: any[] =
    (project as any).fonciere?.charges ??
    (project as any).fonciere?.operatingCharges ??
    (project as any).sciCharges ??
    [];

  if (!charges || charges.length === 0) return 0;

  return charges
    .filter((c: any) => c.isActive !== false)
    .reduce((sum: number, c: any) => {
      const monthly = c.monthlyAmount ?? (c.annualAmount != null ? c.annualAmount / 12 : 0) ?? 0;
      return sum + monthly;
    }, 0);
}

// ============================================================
// MAPPER SERVICES (revenus additionnels par m²)
// ============================================================

function mapServices(project: Project): BackendService[] {
  const rawServices: any[] = (project as any).exploitation?.services ?? (project as any).services ?? [];

  return rawServices
    .filter((s: any) => s && s.isActive !== false)
    .filter((s: any) => s.pricingType === "PAR_M2" || s.monthlyAmountPerLeasedM2 != null)
    .map(
      (s: any): BackendService => ({
        code: s.code ?? s.id ?? "SERVICE",
        monthlyAmountPerLeasedM2: s.monthlyAmountPerLeasedM2 ?? s.pricePerM2 ?? s.amount ?? 0,
        isActive: s.isActive !== false,
      }),
    );
}

// ============================================================
// MAPPER CHARGES EXPLOITATION (SAS)
// ============================================================

function mapOperatingCharges(project: Project): BackendOperatingCharge[] {
  const rawCharges: any[] =
    (project as any).exploitation?.operatingCharges ??
    (project as any).exploitation?.charges ??
    (project as any).operatingCharges ??
    [];

  return rawCharges
    .filter((c: any) => c && c.isActive !== false)
    .map(
      (c: any): BackendOperatingCharge => ({
        categoryCode: c.categoryCode ?? "SAS_OPEX",
        monthlyAmount: c.monthlyAmount ?? (c.annualAmount != null ? c.annualAmount / 12 : 0) ?? 0,
        isActive: c.isActive !== false,
      }),
    );
}

// ============================================================
// MAPPER PHASES + PARAMS REVENUS
// ============================================================

function mapPhasesAndRevenue(project: Project): {
  phases: BackendCapacityPhase[];
  revenueParams: BackendRevenueParams;
} {
  const rawPhases: any[] =
    (project as any).exploitation?.phases ?? (project as any).phases ?? (project as any).capacityPhases ?? [];

  const activePhases = rawPhases.filter((p: any) => p?.isActive !== false);
  const phases = rawPhases.map((p: any, i: number) => mapPhase(p, i));

  // Prix au m² : moyenne pondérée par surface des phases actives
  let totalSurface = 0;
  let weightedPrice = 0;

  for (const p of activePhases) {
    const surface = p.totalSurface ?? p.surface ?? 0;
    const price = p.pricePerM2 ?? p.prixM2 ?? 0;
    totalSurface += surface;
    weightedPrice += surface * price;
  }

  const pricePerM2 = totalSurface > 0 ? weightedPrice / totalSurface : 0;

  // Taux d'occupation cible : priorité phase 1, sinon fallback projet
  const firstActivePhase = activePhases[0];
  const targetOccupancy =
    firstActivePhase?.targetOccupancy ??
    firstActivePhase?.targetLeasedSurfacePercent ??
    (project as any).exploitation?.targetOccupancy ??
    0.85;

  const revenueParams: BackendRevenueParams = {
    pricePerM2,
    targetLeasedSurfacePercent: targetOccupancy > 1 ? targetOccupancy / 100 : targetOccupancy,
    annualIndexationRate: pctToDecimal(
      (project as any).exploitation?.indexationRate ?? (project as any).indexationRate,
    ),
    indexationMonth: (project as any).exploitation?.indexationStartMonth ?? (project as any).indexationStartMonth ?? 12,
  };

  return { phases, revenueParams };
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

export function mapToProjectionInputs(project: Project, horizonMonths = 60): ProjectionInputs {
  // — Trésorerie initiale
  const initialCash = (project as any).exploitation?.initialCash ?? (project as any).initialCash ?? 0;

  const sciInitialCash = (project as any).fonciere?.initialCash ?? (project as any).sciInitialCash ?? 0;

  // — Date de démarrage (format YYYY-MM)
  const projectStartDate = ((project as any).startDate ?? (project as any).projectStartDate ?? "2025-01").slice(0, 7);

  // — Taux IS
  const taxRate = pctToDecimal((project as any).taxRate ?? (project as any).exploitation?.taxRate ?? 25);

  // — Dettes SAS (exploitation)
  const rawDebts: any[] = (project as any).exploitation?.debts ?? (project as any).debts ?? [];

  const debts = rawDebts.map(mapDebt).filter((d): d is { debt: BackendDebt; state: BackendDebtState } => d !== null);

  // — Dettes SCI (foncière)
  const rawSciDebts: any[] = (project as any).fonciere?.debts ?? (project as any).sciDebts ?? [];

  const sciDebts = rawSciDebts
    .map(mapDebt)
    .filter((d): d is { debt: BackendDebt; state: BackendDebtState } => d !== null);

  // — Phases et revenus
  const { phases, revenueParams } = mapPhasesAndRevenue(project);

  // — Services
  const services = mapServices(project);

  // — Charges exploitation
  const operatingCharges = mapOperatingCharges(project);

  // — Charges SCI (cash)
  const sciChargesCash = computeSciChargesCashMonthly(project);

  // — Amortissement SCI (depuis actifs CAPEX)
  const sciAmortization = computeSciAmortizationMonthly(project);

  // — Contraintes de loyer
  const rentConstraints = mapRentConstraints(project);

  // — CCA (comptes courants d'associés)
  const ccaBalanceSas = (project as any).exploitation?.ccaBalance ?? (project as any).ccaBalanceSas ?? 0;

  const ccaBalanceSci = (project as any).fonciere?.ccaBalance ?? (project as any).ccaBalanceSci ?? 0;

  // — Distribution
  const distributableCashRate = pctToDecimal(
    (project as any).distribution?.distributableCashRate ?? (project as any).distributableCashRate ?? 80,
  );

  const ccaPriorityRatio = pctToDecimal(
    (project as any).distribution?.ccaPriorityRatio ?? (project as any).ccaPriorityRatio ?? 100,
  );

  const reserveStrategicRatio = pctToDecimal(
    (project as any).distribution?.reserveStrategicRatio ?? (project as any).reserveStrategicRatio ?? 0,
  );

  const reserveAfterCcaFullyRepaid =
    (project as any).distribution?.reserveAfterCcaFullyRepaid ?? (project as any).reserveAfterCcaFullyRepaid ?? false;

  // — Buffer trésorerie minimum
  const bufferMin = (project as any).exploitation?.bufferMin ?? (project as any).bufferMin ?? 0;

  // — Calendrier IS (tax schedules)
  const taxSchedules = (project as any).taxSchedules ?? [];

  return {
    horizonMonths,
    initialCash,
    sciInitialCash,
    projectStartDate,
    taxSchedules,
    taxRate,
    bufferMin,
    phases,
    revenueParams,
    services,
    operatingCharges,
    debts,
    sciDebts,
    sciChargesCash,
    sciAmortization,
    rentConstraints,
    ccaBalanceSas,
    ccaBalanceSci,
    distributableCashRate,
    ccaPriorityRatio,
    reserveStrategicRatio,
    reserveAfterCcaFullyRepaid,
  };
}
