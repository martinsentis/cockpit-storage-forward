/**
 * Local Financial Engine
 * 
 * This file centralizes ALL financial calculations.
 * It acts as a local stand-in for the future backend engine API.
 * 
 * WHEN THE BACKEND IS READY:
 * Replace `computeEngine(inputs)` with an API call.
 * The interface (EngineInputs → EngineOutputs) stays the same.
 * No component changes needed.
 */

import type { EngineInputs, EngineOutputs, ExploitationEngineOutputs, FonciereEngineOutputs, LoyerDynamiqueEngineOutputs, PhaseMetrics } from "./engineTypes";
import type { CapacityPhase, ChargeItem, Gestionnaire, ServiceItem, SCIChargeItem, SCIRevenueItem } from "@/types/project";

// ══════════════════════════════════════════════════════════════
// PURE HELPERS (no side effects)
// ══════════════════════════════════════════════════════════════

function toHT(amount: number, type: "HT" | "TTC", vatRate: number): number {
  return type === "HT" ? amount : amount / (1 + vatRate);
}
function toTTC(amount: number, type: "HT" | "TTC", vatRate: number): number {
  return type === "TTC" ? amount : amount * (1 + vatRate);
}

// ── Phase ──

function phaseCAHT(p: CapacityPhase): number {
  if (p.modeBox === "MACRO") return p.surface * toHT(p.prixM2, p.prixType, p.vatRate);
  return (p.typologies ?? []).filter(t => t.actif).reduce((s, t) => s + t.nombreDeBox * toHT(t.prixMensuel, t.prixType, t.vatRate), 0);
}
function phaseCATTC(p: CapacityPhase): number {
  if (p.modeBox === "MACRO") return p.surface * toTTC(p.prixM2, p.prixType, p.vatRate);
  return (p.typologies ?? []).filter(t => t.actif).reduce((s, t) => s + t.nombreDeBox * toTTC(t.prixMensuel, t.prixType, t.vatRate), 0);
}
function phaseSurface(p: CapacityPhase): number {
  if (p.modeBox === "MACRO") return p.surface;
  return (p.typologies ?? []).filter(t => t.actif).reduce((s, t) => s + t.surfaceParBox * t.nombreDeBox, 0);
}
function phaseNbBox(p: CapacityPhase): number {
  if (p.modeBox === "MACRO") return 0;
  return (p.typologies ?? []).filter(t => t.actif).reduce((s, t) => s + t.nombreDeBox, 0);
}

// ── Charges ──

function chargeHT(c: ChargeItem | SCIChargeItem): number {
  return toHT(c.amountInput, c.amountType, c.vatRate);
}
function chargeTTC(c: ChargeItem): number {
  return toTTC(c.amountInput, c.amountType, c.vatRate);
}
function chargeMonthlyHT(c: ChargeItem | SCIChargeItem): number {
  const ht = chargeHT(c);
  return c.frequency === "ANNUELLE" ? ht / 12 : ht;
}

// ── Services ──

function serviceRevenuHT(s: ServiceItem): number { return toHT(s.montantUnitaire, s.prixType, s.vatRate); }
function serviceCoutHT(s: ServiceItem, caBoxsHT: number): number {
  if (s.typeEco === "SANS_COUT") return 0;
  if (s.coutMode === "FIXE") return s.coutMontant;
  if (s.coutMode === "PCT_CA_BOXS") return caBoxsHT * s.coutMontant;
  return serviceRevenuHT(s) * s.coutMontant;
}

// ── Gestionnaires ──

function gestCoutMensuelHT(g: Gestionnaire): number {
  if (g.type === "PRESTATAIRE") return toHT(g.facturationMensuelle, g.prixType, g.vatRate);
  return g.salaireBrut * (1 + g.tauxChargesPatronales);
}

// ── SCI Revenue ──

function revenueMonthlyHT(r: SCIRevenueItem): number {
  const ht = toHT(r.montant, r.prixType, r.vatRate);
  return r.frequency === "ANNUELLE" ? ht / 12 : ht;
}

// ══════════════════════════════════════════════════════════════
// LOYER DYNAMIQUE COMPUTATION
// ══════════════════════════════════════════════════════════════

function computeLoyerDynamique(inputs: EngineInputs): LoyerDynamiqueEngineOutputs {
  const ld = inputs.loyerDynamique;

  const sciCharges = inputs.fonciere.charges
    .filter(c => c.isActive)
    .reduce((t, c) => t + chargeMonthlyHT(c), 0);

  const interets = inputs.financement.sciDebts.reduce(
    (t, d) => t + d.amount * (d.annualRate / 100 / 12), 0
  );

  const principal = inputs.financement.sciDebts.reduce(
    (t, d) => d.durationMonths > 0 ? t + d.amount / d.durationMonths : t, 0
  );

  const amortissement = inputs.build.assets.reduce(
    (t, a) => a.depreciationYears > 0 ? t + a.amount / a.depreciationYears : t, 0
  ) / 12;

  let loyerCalcule: number;
  if (ld.manualOverride != null && ld.manualOverride > 0) {
    loyerCalcule = ld.manualOverride;
  } else {
    switch (ld.mode) {
      case "AUTONOMIE_SCI": loyerCalcule = sciCharges + interets; break;
      case "DESENDETTEMENT_SCI": loyerCalcule = sciCharges + interets + principal; break;
      case "OPTIMISATION_FISCALE": loyerCalcule = sciCharges + interets + amortissement; break;
      case "MIX": loyerCalcule = sciCharges + interets + principal; break;
      default: loyerCalcule = sciCharges + interets;
    }
  }

  return {
    sciCharges,
    interets,
    principal,
    amortissement,
    loyerCalcule,
    exploitationImpact: -loyerCalcule,
  };
}

// ══════════════════════════════════════════════════════════════
// EXPLOITATION COMPUTATION
// ══════════════════════════════════════════════════════════════

function computeExploitation(inputs: EngineInputs, loyerSCI: number): ExploitationEngineOutputs {
  const phases = inputs.exploitation.capacityPhases;

  const phaseMetrics: PhaseMetrics[] = phases.map(p => ({
    phaseId: p.id,
    surface: phaseSurface(p),
    nbBox: phaseNbBox(p),
    caHT: phaseCAHT(p),
    caTTC: phaseCATTC(p),
  }));

  const totalSurface = phaseMetrics.reduce((s, m) => s + m.surface, 0);
  const totalNbBox = phaseMetrics.reduce((s, m) => s + m.nbBox, 0);
  const totalCAHT = phaseMetrics.reduce((s, m) => s + m.caHT, 0);
  const totalCATTC = phaseMetrics.reduce((s, m) => s + m.caTTC, 0);
  const prixM2Global = totalSurface > 0 ? totalCAHT / totalSurface : 0;

  const targetOccupancyWeighted = totalSurface > 0
    ? phases.reduce((s, p) => s + phaseSurface(p) * p.targetOccupancy, 0) / totalSurface
    : 0.85;

  const activeServices = inputs.exploitation.services.filter(s => s.actif);
  const caServicesHT = activeServices.reduce((total, s) => {
    const revHT = serviceRevenuHT(s);
    if (s.type === "FIXE") return total + revHT;
    if (s.type === "PAR_BOX") return total + totalNbBox * revHT;
    if (s.type === "PAR_M2") return total + totalSurface * revHT;
    return total;
  }, 0);

  const coutServicesHT = activeServices.reduce((total, s) => {
    const cout = serviceCoutHT(s, totalCAHT);
    if (s.type === "FIXE") return total + cout;
    if (s.type === "PAR_BOX") return total + totalNbBox * cout;
    if (s.type === "PAR_M2") return total + totalSurface * cout;
    return total;
  }, 0);

  const margeServicesHT = caServicesHT - coutServicesHT;
  const margeServicesPct = caServicesHT > 0 ? margeServicesHT / caServicesHT : 0;

  const caServicesHT_cible = activeServices.reduce((total, s) => {
    const revHT = serviceRevenuHT(s);
    if (s.type === "FIXE") return total + revHT;
    if (s.type === "PAR_BOX") return total + totalNbBox * revHT * targetOccupancyWeighted;
    if (s.type === "PAR_M2") return total + totalSurface * revHT * targetOccupancyWeighted;
    return total;
  }, 0);

  const coutGestionnaires = inputs.exploitation.gestionnaires
    .filter(g => g.actif)
    .reduce((total, g) => total + gestCoutMensuelHT(g), 0);

  const activeCharges = inputs.exploitation.charges.filter(c => c.isActive);
  const totalChargesHT = activeCharges.reduce((t, c) => t + chargeHT(c), 0);
  const totalChargesTTC = activeCharges.reduce((t, c) => t + chargeTTC(c), 0);

  const caTotal = totalCAHT + caServicesHT;
  const resultat = caTotal - coutGestionnaires - totalChargesHT - loyerSCI;

  const totalCAHT_cible = totalCAHT * targetOccupancyWeighted;
  const totalCATTC_cible = totalCATTC * targetOccupancyWeighted;
  const caTotal_cible = totalCAHT_cible + caServicesHT_cible;
  const resultat_cible = caTotal_cible - coutGestionnaires - totalChargesHT - loyerSCI;

  return {
    totalSurface, totalNbBox, totalCAHT, totalCATTC, prixM2Global,
    targetOccupancyWeighted,
    caServicesHT, coutServicesHT, margeServicesHT, margeServicesPct,
    coutGestionnaires,
    totalChargesHT, totalChargesTTC,
    loyerSCI,
    caTotal, resultat,
    totalCAHT_cible, totalCATTC_cible,
    caServicesHT_cible, caTotal_cible, resultat_cible,
    phaseMetrics,
  };
}

// ══════════════════════════════════════════════════════════════
// FONCIERE (SCI) COMPUTATION
// ══════════════════════════════════════════════════════════════

function computeFonciere(inputs: EngineInputs, loyerMensuelHT: number): FonciereEngineOutputs {
  const totalChargesMensuellesHT = inputs.fonciere.charges
    .filter(c => c.isActive)
    .reduce((t, c) => t + chargeMonthlyHT(c), 0);

  const totalOtherRevenuesMensuellesHT = inputs.fonciere.otherRevenues
    .reduce((t, r) => t + revenueMonthlyHT(r), 0);

  const totalRevenusMensuelHT = loyerMensuelHT + totalOtherRevenuesMensuellesHT;

  const interetsMensuels = inputs.financement.sciDebts.reduce(
    (t, d) => t + d.amount * (d.annualRate / 100 / 12), 0
  );

  const amortissementAnnuel = inputs.build.assets.reduce(
    (t, a) => a.depreciationYears > 0 ? t + a.amount / a.depreciationYears : t, 0
  );

  const resultatExploitationSCI = totalRevenusMensuelHT - totalChargesMensuellesHT;
  const resultatCourant = resultatExploitationSCI - interetsMensuels;
  const resultatFiscal = resultatCourant - amortissementAnnuel / 12;

  return {
    loyerMensuelHT,
    totalOtherRevenuesMensuellesHT,
    totalRevenusMensuelHT,
    totalChargesMensuellesHT,
    interetsMensuels,
    amortissementAnnuel,
    resultatExploitationSCI,
    resultatCourant,
    resultatFiscal,
  };
}

// ══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ══════════════════════════════════════════════════════════════

/**
 * Compute all financial outputs from project state.
 * 
 * FUTURE: Replace this function body with:
 *   const response = await fetch(`${API_URL}/compute`, { body: JSON.stringify(inputs) });
 *   return response.json();
 */
export function computeEngine(inputs: EngineInputs): EngineOutputs {
  // 1. Loyer dynamique first (needed by both exploitation and foncière)
  const loyerDynamique = computeLoyerDynamique(inputs);

  // 2. Exploitation (uses loyer as a charge)
  const exploitation = computeExploitation(inputs, loyerDynamique.loyerCalcule);

  // 3. Foncière (uses loyer as a revenue)
  const fonciere = computeFonciere(inputs, loyerDynamique.loyerCalcule);

  return { exploitation, fonciere, loyerDynamique };
}

// ── Re-export helpers that pages still need for per-item display ──
// These are "display helpers" for individual items, not aggregate calculations.

export { toHT, toTTC, chargeHT, chargeTTC, phaseCAHT, phaseCATTC, phaseSurface, phaseNbBox };
export { serviceRevenuHT, serviceCoutHT, gestCoutMensuelHT };
