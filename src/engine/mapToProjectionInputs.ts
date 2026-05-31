// src/engine/mapToProjectionInputs.ts
// VERSION V3 — chemins exacts depuis engineTypes.ts
// Zéro approximation sur les noms de champs

// ============================================================
// TYPES BACKEND
// ============================================================

export interface BackendDebt {
  principalAmount: number;
  nominalRateAnnual: number;
  insuranceRateAnnual: number;
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
  targetLeasedSurfacePercent: number;
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
  fixedRentAmount?: number;
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
  projectStartDate: string;
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
  sciOtherRevenuesMonthly: number;
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

/** Taux annuel en % (ex: 4.5) → décimal (0.045) */
function pctToDecimal(rate: number | null | undefined): number {
  if (rate == null || !Number.isFinite(rate) || rate === 0) return 0;
  if (rate < 1) return rate; // déjà décimal
  return rate / 100;
}

/** ChargeItem.amountInput + frequency → montant mensuel */
function toMonthlyAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case "ANNUELLE":
    case "ANNUAL": return amount / 12;
    case "SEMI_ANNUAL": return amount / 6;
    case "QUARTERLY": return amount / 3;
    default: return amount; // MENSUELLE / MONTHLY
  }
}

/** Montant TTC → HT */
function toHT(amount: number, amountType: string, vatRate: number): number {
  if (amountType === "TTC" && vatRate > 0) return amount / (1 + vatRate);
  return amount;
}

/** Prix TTC → HT (pour prixM2) */
function priceToHT(price: number, prixType: string, vatRate: number): number {
  if (prixType === "TTC" && vatRate > 0) return price / (1 + vatRate);
  return price;
}

// ============================================================
// MAPPER DETTES
// DebtItem → { debt: BackendDebt, state: BackendDebtState }
// ============================================================

function mapDebt(d: any): { debt: BackendDebt; state: BackendDebtState } | null {
  if (!d) return null;

  // DebtItem.amount → principalAmount
  const principal: number = d.amount ?? 0;
  // DebtItem.durationMonths → totalDurationMonths
  const durationMonths: number = d.durationMonths ?? 0;

  if (principal <= 0 || durationMonths <= 0) return null;

  // annualRate stocké en % → décimal
  const nominalRateAnnual = pctToDecimal(d.annualRate);

  // insuranceMonthly en €/mois → taux annuel décimal
  const insuranceMonthly: number = d.insuranceMonthly ?? 0;
  const insuranceRateAnnual = principal > 0 ? (insuranceMonthly * 12) / principal : 0;

  // Différé : deferralType + deferralMonths → defermentType + defermentMonths
  const defermentMonths: number = d.deferralMonths ?? 0;
  const rawDeferType: string = d.deferralType ?? "NONE";
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
      defermentExtendsDuration: false,
    }),
    // suspensionEnabled → suspensionAllowed
    ...(d.suspensionEnabled && {
      suspensionAllowed: true,
      suspensionMaxPerYear: d.suspensionMonthsPerYear ?? 1,
      suspensionExtendsDuration: false,
    }),
  };

  const state: BackendDebtState = {
    remainingPrincipal: principal,
    remainingMonths: durationMonths,
  };

  return { debt, state };
}

// ============================================================
// SURFACE D'UNE PHASE
// MACRO → phase.surface
// TYPOLOGIE → somme typologies (surface × count)
// ============================================================

function computePhaseSurface(phase: any): number {
  if (phase.modeBox === "TYPOLOGIE" && Array.isArray(phase.typologies)) {
    return phase.typologies.reduce((sum: number, t: any) => {
      const count: number = t.count ?? t.nombre ?? t.quantity ?? 1;
      const surface: number = t.surface ?? t.surfaceUnitaire ?? 0;
      return sum + surface * count;
    }, 0);
  }
  return phase.surface ?? 0;
}

// ============================================================
// MAPPER PHASES
// CapacityPhase → BackendCapacityPhase
// ============================================================

function mapPhase(phase: any, index: number): BackendCapacityPhase {
  const operationalStart: number = phase.startMonth ?? 0;

  return {
    phaseId: phase.id ?? `phase-${index}`,
    totalSurface: computePhaseSurface(phase),
    operationalStartMonth: operationalStart,
    rampUpStartMonth: operationalStart,
    rampUpDurationMonths: phase.rampUpMonths ?? 12,
    rampCurve: phase.rampCurve ?? "LINEAR",
    // active si status différent de DRAFT/INACTIVE
    isActive: phase.status !== "DRAFT" && phase.status !== "INACTIVE",
  };
}

// ============================================================
// PHASES + REVENUE PARAMS
// source : project.exploitation.capacityPhases
// ============================================================

function mapPhasesAndRevenue(project: any, indexationCA = 0): {
  phases: BackendCapacityPhase[];
  revenueParams: BackendRevenueParams;
} {
  const rawPhases: any[] = project.exploitation?.capacityPhases ?? [];
  const phases = rawPhases.map((p, i) => mapPhase(p, i));

  const activePhases = rawPhases.filter((p) => p.status !== "DRAFT" && p.status !== "INACTIVE");

  // Prix m² HT pondéré par surface
  let totalSurface = 0;
  let weightedPrice = 0;
  for (const p of activePhases) {
    const surface = computePhaseSurface(p);
    const priceHT = priceToHT(p.prixM2 ?? 0, p.prixType ?? "HT", p.vatRate ?? 0);
    totalSurface += surface;
    weightedPrice += surface * priceHT;
  }
  const pricePerM2 = totalSurface > 0 ? weightedPrice / totalSurface : 0;

  // Taux d'occupation : première phase active
  const firstActive = activePhases[0];
  const rawOccupancy: number = firstActive?.targetOccupancy ?? 0.85;
  const targetLeasedSurfacePercent = rawOccupancy > 1 ? rawOccupancy / 100 : rawOccupancy;

  return {
    phases,
    revenueParams: {
      pricePerM2,
      targetLeasedSurfacePercent,
      annualIndexationRate: indexationCA,
      indexationMonth: 0, // indexation appliquée à partir du mois 0
    },
  };
}

// ============================================================
// CHARGES EXPLOITATION SAS
// source : project.exploitation.charges + project.exploitation.gestionnaires
// ============================================================

// Convertit "YYYY-MM" + horizon en indice de mois relatif au projectStartDate
function monthLabelToIndex(yearMonth: string | null | undefined, projectStartDate: string): number | null {
  if (!yearMonth) return null;
  const [py, pm] = projectStartDate.split("-").map(Number);
  const [ey, em] = yearMonth.split("-").map(Number);
  return (ey - py) * 12 + (em - pm);
}

function mapOperatingCharges(project: any, projectStartDate: string): BackendOperatingCharge[] {
  const charges: any[] = project?.exploitation?.charges ?? [];
  const gestionnaires: any[] = project?.exploitation?.gestionnaires ?? [];
  const result: BackendOperatingCharge[] = [];

  // Charges fixes (ChargeItem)
  for (const charge of charges) {
    if (charge.isActive === false) continue;

    const amountInput = Number(charge.amountInput ?? 0);
    const frequency = charge.frequency ?? "MONTHLY";
    const amountType = charge.amountType ?? "HT";
    const vatRate = Number(charge.vatRate ?? 0);

    const htAmount = amountType === "TTC" ? amountInput / (1 + vatRate) : amountInput;
    const monthlyAmount = toMonthlyAmount(htAmount, frequency);

    // Respect de la temporalité : startMonth (index direct) ou startDate (YYYY-MM)
    const startIdx: number = charge.startMonth ?? monthLabelToIndex(charge.startDate, projectStartDate) ?? 0;
    const endIdx: number | null = charge.endMonth ?? monthLabelToIndex(charge.endDate, projectStartDate) ?? null;

    // Le backend ne gère pas la temporalité par charge — on active la charge seulement
    // si elle démarre au mois 0 ou avant. Les charges futures sont envoyées comme inactives.
    // Limitation connue : une charge qui démarre à M6 sera ignorée par le moteur actuel.
    const isActiveNow = startIdx <= 0 && (endIdx === null || endIdx > 0);

    result.push({
      categoryCode: "SAS_OPEX",
      monthlyAmount,
      isActive: isActiveNow,
    });
  }

  // Gestionnaires (Gestionnaire)
  for (const g of gestionnaires) {
    if (g.actif === false) continue;

    let monthlyHT = 0;
    if (g.type === "SALARIE") {
      monthlyHT = (g.salaireBrut ?? 0) * (1 + (g.tauxChargesPatronales ?? 0.45));
    } else {
      monthlyHT = toHT(g.facturationMensuelle ?? 0, g.prixType ?? "HT", g.vatRate ?? 0);
    }

    if (monthlyHT <= 0) continue;

    const startIdx: number = g.startMonth ?? monthLabelToIndex(g.startDate, projectStartDate) ?? 0;
    const endIdx: number | null = g.endMonth ?? monthLabelToIndex(g.endDate, projectStartDate) ?? null;
    const isActiveNow = g.activeFromStart !== false
      ? (startIdx <= 0 && (endIdx === null || endIdx > 0))
      : (startIdx <= 0 && (endIdx === null || endIdx > 0));

    result.push({
      categoryCode: "SAS_OPEX",
      monthlyAmount: monthlyHT,
      isActive: isActiveNow,
    });
  }

  return result;
}

// ============================================================
// CHARGES SCI
// source : project.financement.sciChargesCash (si > 0)
//       ou project.fonciere.charges (SCIChargeItem[])
// ============================================================

function computeSciChargesCash(project: any): number {
  // Valeur pré-calculée dans financement
  const precomputed: number = project.financement?.sciChargesCash ?? 0;
  if (precomputed > 0) return precomputed;

  // Sinon : calculer depuis fonciere.charges
  const charges: any[] = project.fonciere?.charges ?? [];
  return charges
    .filter((c) => c.isActive !== false)
    .reduce((sum, c) => {
      const amountHT = toHT(c.amountInput ?? 0, c.amountType ?? "HT", c.vatRate ?? 0);
      return sum + toMonthlyAmount(amountHT, c.frequency ?? "MENSUELLE");
    }, 0);
}

// ============================================================
// AMORTISSEMENT SCI
// source : project.financement.sciAmortization (si > 0)
//       ou project.build.capexEvents[].assets[] amortissables
// ============================================================

function computeSciAmortization(project: any): number {
  // Valeur pré-calculée dans financement
  const precomputed: number = project.financement?.sciAmortization ?? 0;
  if (precomputed > 0) return precomputed;

  // Sinon : calculer depuis build.capexEvents[].assets
  const capexEvents: any[] = project.build?.capexEvents ?? [];
  let totalMonthly = 0;

  for (const event of capexEvents) {
    for (const asset of event.assets ?? []) {
      if (!asset.amortissable) continue; // seul critère : le flag amortissable
      const amount: number = asset.amount ?? 0;
      const years: number = asset.depreciationYears ?? 20;
      if (amount > 0 && years > 0) {
        totalMonthly += amount / (years * 12);
      }
    }
  }

  return totalMonthly;
}

// ============================================================
// SERVICES
// source : project.exploitation.services (type PAR_M2 uniquement)
// ============================================================

function mapServices(project: any): BackendService[] {
  const services: any[] = project.exploitation?.services ?? [];

  return services
    .filter((s) => s.actif !== false && s.type === "PAR_M2")
    .map(
      (s): BackendService => ({
        code: s.id ?? s.nom ?? "SERVICE",
        monthlyAmountPerLeasedM2: toHT(s.montantUnitaire ?? 0, s.prixType ?? "HT", s.vatRate ?? 0),
        isActive: s.actif !== false,
      }),
    );
}

// ============================================================
// LOYER DYNAMIQUE → RENT CONSTRAINTS
// source : project.loyerDynamique.rentPlan[0]
// ============================================================

const RENT_MODE_MAP: Record<string, BackendRentConstraints["mode"]> = {
  SCI_AUTONOMY: "AUTONOMIE_SCI",
  OPTIMIZATION: "OPTIMISATION_FISCALE",
  DEBT_PAYDOWN: "DESENDETTEMENT_SCI",
  MIX: "OPTIMISATION_EBE_EXPLOITATION",
  FIXED_AMOUNT: "FIXE",
};

function mapRentConstraints(project: any): BackendRentConstraints {
  const rentPlan: any[] = project.loyerDynamique?.rentPlan ?? [];

  // Plan actif au mois 0, sinon premier plan
  const activePlan = rentPlan.find((p) => (p.startMonth ?? 0) === 0) ?? rentPlan[0];

  if (!activePlan) return { mode: "AUTONOMIE_SCI" };

  const frontendMode: string = activePlan.strategy?.mode ?? "SCI_AUTONOMY";
  const backendMode = RENT_MODE_MAP[frontendMode] ?? "AUTONOMIE_SCI";
  const params = activePlan.strategy?.parameters ?? {};

  if (backendMode === "FIXE") {
    return {
      mode: "FIXE",
      fixedRentAmount: params.fixed_rent_amount ?? 0,
    };
  }

  return { mode: backendMode };
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

export interface ScenarioOverrides {
  /** Taux d'indexation annuel du CA (décimal, ex: 0.02 pour 2%). Défaut: 0. */
  indexationCA?: number;
}

export function mapToProjectionInputs(project: any, horizonMonths = 60, overrides: ScenarioOverrides = {}): ProjectionInputs {
  // ── Projet ─────────────────────────────────────────────
  const projectStartDate = (project.projet?.projectStartDate ?? "2025-01").slice(0, 7);

  const horizon: number = project.projet?.horizonMonths ?? horizonMonths;

  // ── Fiscalité — déjà en décimal dans EngineInputs ──────
  const taxRate: number = project.fiscalite?.corporateTaxRate ?? 0.25;

  // ── Financement ────────────────────────────────────────
  const fin = project.financement ?? {};
  const initialCash: number = fin.initialCash ?? 0;
  const sciInitialCash: number = fin.sciInitialCash ?? 0;
  const bufferMin: number = fin.bufferMin ?? 0;
  const dscrMin: number = fin.dscrMin ?? 1.2;

  // Dettes SAS et SCI
  const debts = (fin.debts ?? []).map(mapDebt).filter(Boolean) as { debt: BackendDebt; state: BackendDebtState }[];

  const sciDebts = (fin.sciDebts ?? []).map(mapDebt).filter(Boolean) as {
    debt: BackendDebt;
    state: BackendDebtState;
  }[];

  // ── Exploitation ───────────────────────────────────────
  const indexationCA = overrides.indexationCA ?? 0;
  const { phases, revenueParams } = mapPhasesAndRevenue(project, indexationCA);
  const operatingCharges = mapOperatingCharges(project, projectStartDate);
  const services = mapServices(project);

  // ── SCI ────────────────────────────────────────────────
  const sciChargesCash = computeSciChargesCash(project);
  const sciAmortization = computeSciAmortization(project);

  // ── Loyer ──────────────────────────────────────────────
  const rentConstraints = mapRentConstraints(project);

  // ── Gouvernance ────────────────────────────────────────
  const gouv = project.gouvernance ?? {};
  const globalRule = gouv.globalRule ?? {};

  const ccaBalanceSas: number = gouv.ccaBalance ?? 0;
  // ccaBalanceSci non exposé dans GouvernanceData — limitation connue, toujours 0
  const ccaBalanceSci: number = 0;
  const distributableCashRate: number = globalRule.distributableCashRate ?? 0.8;
  const reserveStrategicRatio: number = globalRule.reserveStrategicRatio ?? 0;

  // ccaPriorityRatio : déduit de allocationOrder si CCA_REPAYMENT présent, sinon 1 (priorité totale)
  const allocationOrder: any[] = globalRule.allocationOrder ?? [];
  const ccaStep = allocationOrder.find((s: any) => s.type === "CCA_REPAYMENT");
  const ccaPriorityRatio: number = ccaStep
    ? (ccaStep.mode === "UNTIL_ZERO" ? 1 : (ccaStep.ratio ?? 100) / 100)
    : 1;

  // reserveAfterCcaFullyRepaid : vrai si la réserve est positionnée APRÈS le CCA dans l'ordre
  const ccaIdx = allocationOrder.findIndex((s: any) => s.type === "CCA_REPAYMENT");
  const reserveIdx = allocationOrder.findIndex((s: any) => s.type === "RESERVE");
  const reserveAfterCcaFullyRepaid: boolean = reserveIdx > ccaIdx && ccaIdx >= 0;

  // Construire les taxSchedules depuis le taux IS du projet.
  // Si taux = 25 % (IS France standard PME), on applique la tranche réduite à 15 % jusqu'à 42 500 €.
  // Sinon on envoie un barème plat avec le taux configuré.
  const taxSchedules = taxRate === 0.25
    ? [{ startDate: projectStartDate, brackets: [{ upTo: 42500, rate: 0.15 }, { upTo: null, rate: 0.25 }] }]
    : [{ startDate: projectStartDate, brackets: [{ upTo: null, rate: taxRate }] }];

  return {
    horizonMonths: horizon,
    initialCash,
    sciInitialCash,
    projectStartDate,
    taxSchedules,
    taxRate,
    bufferMin,
    dscrMin,
    phases,
    revenueParams,
    services,
    operatingCharges,
    debts,
    sciDebts,
    sciChargesCash,
    sciAmortization,
    sciOtherRevenuesMonthly: (project.fonciere?.otherRevenues ?? [])
      .filter((r: any) => r.isActive !== false)
      .reduce((sum: number, r: any) => {
        const ht = r.prixType === 'TTC' ? (r.montant ?? 0) / (1 + (r.vatRate ?? 0)) : (r.montant ?? 0);
        return sum + (r.frequency === 'ANNUELLE' ? ht / 12 : ht);
      }, 0),
    rentConstraints,
    ccaBalanceSas,
    ccaBalanceSci,
    distributableCashRate,
    ccaPriorityRatio,
    reserveStrategicRatio,
    reserveAfterCcaFullyRepaid,
  };
}

// Alias pour compatibilité avec les imports existants dans useEngine.ts
export const mapEngineInputsToProjectionInputs = mapToProjectionInputs;
