// src/engine/mapToProjectionInputs.ts
// VERSION CANONIQUE — alignée sur backend ProjectionEngine V1
// Contrats vérifiés sur : debtEngine.ts, rentSolver.ts, revenueCapacityEngine.ts, projectionEngine.ts

// ✅ FIX 1 : pas d'import Project (le nom varie selon le projet)
// On accepte n'importe quel objet projet en entrée
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProject = Record<string, any>;

// ============================================================
// TYPES BACKEND (miroir exact des interfaces du backend)
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
  taxSchedules: unknown[];
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

/** Taux en % (ex: 4.5) → décimal (0.045). Sécurisé. */
function pctToDecimal(rate: number | undefined | null): number {
  if (rate == null || !Number.isFinite(rate) || rate === 0) return 0;
  if (rate < 1) return rate; // déjà en décimal
  return rate / 100;
}

/** Assurance mensuelle en € → taux annuel décimal */
function insuranceMonthlyToAnnualRate(insuranceMonthly: number | undefined | null, principal: number): number {
  if (!insuranceMonthly || principal <= 0) return 0;
  return (insuranceMonthly * 12) / principal;
}

// ============================================================
// MAPPER DETTES
// ============================================================

function mapDebt(d: AnyProject): { debt: BackendDebt; state: BackendDebtState } | null {
  if (!d) return null;

  const principal = d.principalAmount ?? d.amount ?? 0;
  const durationMonths = d.totalDurationMonths ?? d.durationMonths ?? 0;

  if (principal <= 0 || durationMonths <= 0) return null;

  const nominalRateAnnual = pctToDecimal(d.nominalRateAnnual ?? d.annualRate ?? d.rate);

  // Assurance : taux annuel décimal, ou calculé depuis €/mois
  let insuranceRateAnnual = 0;
  if (d.insuranceRateAnnual != null) {
    insuranceRateAnnual = pctToDecimal(d.insuranceRateAnnual);
  } else if (d.insuranceMonthly != null) {
    insuranceRateAnnual = insuranceMonthlyToAnnualRate(d.insuranceMonthly, principal);
  } else if (d.insuranceRate != null) {
    insuranceRateAnnual = pctToDecimal(d.insuranceRate);
  }

  const defermentMonths: number = d.defermentMonths ?? d.deferralMonths ?? 0;
  const rawDeferType: string = d.defermentType ?? d.deferralType ?? "NONE";
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

function mapPhase(phase: AnyProject, index: number): BackendCapacityPhase {
  const operationalStart: number = phase.operationalStartMonth ?? phase.startMonth ?? 0;

  return {
    phaseId: phase.id ?? phase.phaseId ?? `phase-${index}`,
    totalSurface: phase.totalSurface ?? phase.surface ?? 0,
    operationalStartMonth: operationalStart,
    // rampUpStartMonth ne peut pas être avant l'ouverture physique
    rampUpStartMonth: Math.max(phase.rampUpStartMonth ?? operationalStart, operationalStart),
    rampUpDurationMonths: phase.rampUpDurationMonths ?? phase.rampUpMonths ?? 12,
    rampCurve: phase.rampCurve ?? "LINEAR",
    isActive: phase.isActive !== false,
  };
}

// ============================================================
// MAPPER CONTRAINTES DE LOYER
// ============================================================

function mapRentConstraints(project: AnyProject): BackendRentConstraints {
  const strategy = project.fonciere?.rentStrategy ?? project.exploitation?.rentStrategy ?? project.rentStrategy ?? null;

  if (!strategy) {
    return { mode: "AUTONOMIE_SCI" };
  }

  const mode: BackendRentConstraints["mode"] = strategy.mode ?? "AUTONOMIE_SCI";
  const params: AnyProject = strategy.parameters ?? strategy.params ?? {};

  switch (mode) {
    case "FIXE":
      return {
        mode: "FIXE",
        // ✅ CORRECTION CRITIQUE : fixedRentAmount (jamais monthlyRent)
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
// AMORTISSEMENT SCI depuis les actifs CAPEX
// ============================================================

const AMORTIZABLE_CATEGORIES = ["BATIMENTS", "VRD", "HONORAIRES", "CONSTRUCTION", "TRAVAUX"];

const DEFAULT_AMORTIZATION_YEARS: Record<string, number> = {
  BATIMENTS: 30,
  VRD: 15,
  HONORAIRES: 10,
  CONSTRUCTION: 30,
  TRAVAUX: 10,
};

function computeSciAmortizationMonthly(project: AnyProject): number {
  const capexEvents: AnyProject[] =
    project.build?.capexEvents ?? project.fonciere?.capexEvents ?? project.capexItems ?? [];

  let totalMonthly = 0;

  for (const asset of capexEvents) {
    const category: string = (asset.category ?? "").toUpperCase();
    if (!AMORTIZABLE_CATEGORIES.includes(category)) continue;

    const amount: number = asset.amount ?? asset.cost ?? 0;
    if (amount <= 0) continue;

    const durationYears: number =
      asset.amortizationYears ?? asset.durationYears ?? DEFAULT_AMORTIZATION_YEARS[category] ?? 20;

    totalMonthly += amount / (durationYears * 12);
  }

  return totalMonthly;
}

// ============================================================
// CHARGES SCI mensuelles
// ============================================================

function computeSciChargesCashMonthly(project: AnyProject): number {
  const charges: AnyProject[] =
    project.fonciere?.charges ?? project.fonciere?.operatingCharges ?? project.sciCharges ?? [];

  return charges
    .filter((c) => c.isActive !== false)
    .reduce((sum, c) => {
      // ✅ FIX 2 : pas de ?? 0 redondant sur une expression ternaire (toujours un nombre)
      const monthly: number =
        c.monthlyAmount != null ? c.monthlyAmount : c.annualAmount != null ? c.annualAmount / 12 : 0;
      return sum + monthly;
    }, 0);
}

// ============================================================
// SERVICES (revenus additionnels par m²)
// ============================================================

function mapServices(project: AnyProject): BackendService[] {
  const rawServices: AnyProject[] = project.exploitation?.services ?? project.services ?? [];

  return rawServices
    .filter((s) => s?.isActive !== false)
    .filter((s) => s.pricingType === "PAR_M2" || s.monthlyAmountPerLeasedM2 != null)
    .map(
      (s): BackendService => ({
        code: s.code ?? s.id ?? "SERVICE",
        monthlyAmountPerLeasedM2: s.monthlyAmountPerLeasedM2 ?? s.pricePerM2 ?? s.amount ?? 0,
        isActive: s.isActive !== false,
      }),
    );
}

// ============================================================
// CHARGES EXPLOITATION (SAS)
// ============================================================

function mapOperatingCharges(project: AnyProject): BackendOperatingCharge[] {
  const rawCharges: AnyProject[] =
    project.exploitation?.operatingCharges ?? project.exploitation?.charges ?? project.operatingCharges ?? [];

  return rawCharges
    .filter((c) => c?.isActive !== false)
    .map(
      (c): BackendOperatingCharge => ({
        categoryCode: c.categoryCode ?? "SAS_OPEX",
        // ✅ FIX 3 : pas de ?? 0 redondant sur une expression ternaire
        monthlyAmount: c.monthlyAmount != null ? c.monthlyAmount : c.annualAmount != null ? c.annualAmount / 12 : 0,
        isActive: c.isActive !== false,
      }),
    );
}

// ============================================================
// PHASES + PARAMÈTRES REVENUS
// ============================================================

function mapPhasesAndRevenue(project: AnyProject): {
  phases: BackendCapacityPhase[];
  revenueParams: BackendRevenueParams;
} {
  const rawPhases: AnyProject[] = project.exploitation?.phases ?? project.phases ?? project.capacityPhases ?? [];

  const activePhases = rawPhases.filter((p) => p?.isActive !== false);
  const phases = rawPhases.map((p, i) => mapPhase(p, i));

  // Prix au m² : moyenne pondérée par surface des phases actives
  let totalSurface = 0;
  let weightedPrice = 0;

  for (const p of activePhases) {
    const surface: number = p.totalSurface ?? p.surface ?? 0;
    const price: number = p.pricePerM2 ?? p.prixM2 ?? 0;
    totalSurface += surface;
    weightedPrice += surface * price;
  }

  const pricePerM2 = totalSurface > 0 ? weightedPrice / totalSurface : 0;

  const firstActivePhase = activePhases[0];
  const rawOccupancy: number =
    firstActivePhase?.targetOccupancy ??
    firstActivePhase?.targetLeasedSurfacePercent ??
    project.exploitation?.targetOccupancy ??
    0.85;

  // Normalise : si > 1, c'est un pourcentage (ex: 85 → 0.85)
  const targetLeasedSurfacePercent = rawOccupancy > 1 ? rawOccupancy / 100 : rawOccupancy;

  const revenueParams: BackendRevenueParams = {
    pricePerM2,
    targetLeasedSurfacePercent,
    annualIndexationRate: pctToDecimal(project.exploitation?.indexationRate ?? project.indexationRate),
    indexationMonth: project.exploitation?.indexationStartMonth ?? project.indexationStartMonth ?? 12,
  };

  return { phases, revenueParams };
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

export function mapToProjectionInputs(project: AnyProject, horizonMonths = 60): ProjectionInputs {
  const initialCash: number = project.exploitation?.initialCash ?? project.initialCash ?? 0;

  const sciInitialCash: number = project.fonciere?.initialCash ?? project.sciInitialCash ?? 0;

  const projectStartDate: string = (project.startDate ?? project.projectStartDate ?? "2025-01").slice(0, 7);

  const taxRate = pctToDecimal(project.taxRate ?? project.exploitation?.taxRate ?? 25);

  // Dettes SAS
  const rawDebts: AnyProject[] = project.exploitation?.debts ?? project.debts ?? [];
  const debts = rawDebts.map(mapDebt).filter((d): d is { debt: BackendDebt; state: BackendDebtState } => d !== null);

  // Dettes SCI
  const rawSciDebts: AnyProject[] = project.fonciere?.debts ?? project.sciDebts ?? [];
  const sciDebts = rawSciDebts
    .map(mapDebt)
    .filter((d): d is { debt: BackendDebt; state: BackendDebtState } => d !== null);

  const { phases, revenueParams } = mapPhasesAndRevenue(project);
  const services = mapServices(project);
  const operatingCharges = mapOperatingCharges(project);
  const sciChargesCash = computeSciChargesCashMonthly(project);
  const sciAmortization = computeSciAmortizationMonthly(project);
  const rentConstraints = mapRentConstraints(project);

  const ccaBalanceSas: number = project.exploitation?.ccaBalance ?? project.ccaBalanceSas ?? 0;
  const ccaBalanceSci: number = project.fonciere?.ccaBalance ?? project.ccaBalanceSci ?? 0;

  const distributableCashRate = pctToDecimal(
    project.distribution?.distributableCashRate ?? project.distributableCashRate ?? 80,
  );
  const ccaPriorityRatio = pctToDecimal(project.distribution?.ccaPriorityRatio ?? project.ccaPriorityRatio ?? 100);
  const reserveStrategicRatio = pctToDecimal(
    project.distribution?.reserveStrategicRatio ?? project.reserveStrategicRatio ?? 0,
  );
  const reserveAfterCcaFullyRepaid: boolean =
    project.distribution?.reserveAfterCcaFullyRepaid ?? project.reserveAfterCcaFullyRepaid ?? false;

  const bufferMin: number = project.exploitation?.bufferMin ?? project.bufferMin ?? 0;
  const taxSchedules: unknown[] = project.taxSchedules ?? [];

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

// ✅ FIX 4 : alias pour compatibilité avec useEngine.ts (ancien nom)
export const mapEngineInputsToProjectionInputs = mapToProjectionInputs;
