// ── Section types ──

export type RentMode = "AUTONOMY_SCI" | "OPTIMISATION_FISCALE" | "DESENDETTEMENT_SCI" | "MIX";
export type BoxMode = "MACRO" | "TYPOLOGIE";
export type ChargeCategory = "IMMOBILIER" | "ENERGIE" | "SECURITE" | "MARKETING" | "EXPLOITATION" | "ADMINISTRATIF" | "AUTRE";
export type ChargeFrequency = "MENSUELLE" | "ANNUELLE";
export type RampCurve = "LINEAR" | "FAST_START" | "SLOW_START";

export interface ProjetData {
  nom: string;
  localisation: string;
  horizonMonths: number;
  taxRate: number;
  bufferMin: number;
  dscrMin: number;
  initialCash: number;
  sciInitialCash: number;
  defaultVatRate: number;
  displayMode: "HT" | "TTC";
  projectStartDate: string; // "YYYY-MM" format, e.g. "2026-06"
}

export interface BuildData {
  capexTotal: number;
  posteFoncier: number;
  posteTravaux: number;
  posteHonoraires: number;
  posteDivers: number;
  startMonth: number;
  durationMonths: number;
}

export interface DebtItem {
  label: string;
  amount: number;
  annualRate: number;
  durationMonths: number;
  deferralMonths: number;
}

export interface FinancementData {
  apportFondsPropres: number;
  debts: DebtItem[];
  sciDebts: DebtItem[];
  sciChargesCash: number;
  sciAmortization: number;
}

export interface Typologie {
  id: string;
  nom: string;
  surfaceParBox: number;
  nombreDeBox: number;
  prixMensuel: number;
  prixType: "HT" | "TTC";
  vatRate: number;
  actif: boolean;
}

// ── Capacity Phase (replaces old Phase + Capacite) ──

export interface CapacityPhase {
  id: string;
  nom: string;
  surface: number;
  modeBox: BoxMode;
  // Macro
  prixM2: number;
  prixType: "HT" | "TTC";
  vatRate: number;
  // Typologie
  typologies: Typologie[];
  // Dates
  startMonth: number;
  // Ramp-up
  targetOccupancy: number;
  rampUpMonths: number;
  rampCurve: RampCurve;
}

// ── Exploitation types ──

export type ServiceEcoType = "AVEC_MARGE" | "SANS_COUT";
export type ServiceCostMode = "PCT_CA_SERVICE" | "PCT_CA_BOXS" | "FIXE";

export interface ServiceItem {
  id: string;
  nom: string;
  type: "FIXE" | "PAR_BOX" | "PAR_M2";
  montantUnitaire: number;
  prixType: "HT" | "TTC";
  vatRate: number;
  actif: boolean;
  typeEco: ServiceEcoType;
  coutMode: ServiceCostMode;
  coutMontant: number;
  activeFromStart: boolean;
  startMonth: number;
  hasEndMonth: boolean;
  endMonth: number | null;
}

export interface GestionnaireParametres {
  ratioNetVersBrut: number;
  tauxChargesPatronales: number;
  moisPayes: number;
}

export interface Gestionnaire {
  id: string;
  nom: string;
  actif: boolean;
  dateDebutMois: number;
  netMensuelCible: number;
  tauxActivite: number;
  parametres: GestionnaireParametres;
}

export interface ChargeItem {
  id: string;
  entity: "SAS";
  label: string;
  category: ChargeCategory;
  tag?: string;
  type: "FIXE";
  frequency: ChargeFrequency;
  amountInput: number;
  amountType: "HT" | "TTC";
  vatRate: number;
  annualMonth: number | null;
  startMonth: number;
  endMonth: number | null;
  isActive: boolean;
}

export interface ExploitationData {
  capacityPhases: CapacityPhase[];
  services: ServiceItem[];
  gestionnaires: Gestionnaire[];
  charges: ChargeItem[];
}

// ── Gouvernance ──

export interface GouvernanceData {
  structureJuridique: string;
  ccaBalance: number;
  distributableCashRate: number;
  ccaPriorityRatio: number;
  reserveStrategicRatio: number;
  reserveAfterCcaFullyRepaid: number;
  rentConstraints: {
    mode: RentMode;
    monthlyRent: number;
  };
}

// ── Defaults ──

export const DEFAULT_PROJET: ProjetData = {
  nom: "Mon projet",
  localisation: "Paris",
  horizonMonths: 120,
  taxRate: 0.25,
  bufferMin: 10000,
  dscrMin: 1.2,
  initialCash: 100000,
  sciInitialCash: 50000,
  defaultVatRate: 0.20,
  displayMode: "HT",
  projectStartDate: "2026-06",
};

export const DEFAULT_BUILD: BuildData = {
  capexTotal: 500000,
  posteFoncier: 150000,
  posteTravaux: 250000,
  posteHonoraires: 50000,
  posteDivers: 50000,
  startMonth: 0,
  durationMonths: 6,
};

export const DEFAULT_FINANCEMENT: FinancementData = {
  apportFondsPropres: 200000,
  debts: [],
  sciDebts: [],
  sciChargesCash: 0,
  sciAmortization: 0,
};

export const DEFAULT_GESTIONNAIRE_PARAMS: GestionnaireParametres = {
  ratioNetVersBrut: 0.78,
  tauxChargesPatronales: 0.42,
  moisPayes: 12,
};

export function createDefaultPhase(id?: string, nom?: string, defaultVatRate = 0.20): CapacityPhase {
  return {
    id: id ?? crypto.randomUUID(),
    nom: nom ?? "Phase 1",
    surface: 500,
    modeBox: "MACRO",
    prixM2: 15,
    prixType: "HT",
    vatRate: defaultVatRate,
    typologies: [],
    startMonth: 1,
    targetOccupancy: 0.85,
    rampUpMonths: 12,
    rampCurve: "LINEAR",
  };
}

export const DEFAULT_EXPLOITATION: ExploitationData = {
  capacityPhases: [createDefaultPhase("default-phase-1", "Phase 1")],
  services: [],
  gestionnaires: [],
  charges: [],
};

export const DEFAULT_GOUVERNANCE: GouvernanceData = {
  structureJuridique: "SCI + SAS",
  ccaBalance: 0,
  distributableCashRate: 0.5,
  ccaPriorityRatio: 0.7,
  reserveStrategicRatio: 0.1,
  reserveAfterCcaFullyRepaid: 0.3,
  rentConstraints: { mode: "DESENDETTEMENT_SCI", monthlyRent: 0 },
};

// ── API payload type ──

export interface PhaseProjection {
  startMonth: number;
  endMonth: number;
  occupancyRate: number;
}

export interface ProjectionInputs {
  horizonMonths: number;
  initialCash: number;
  sciInitialCash: number;
  taxRate: number;
  bufferMin: number;
  dscrMin: number;
  phases: PhaseProjection[];
  revenueParams: {
    surface: number;
    prixM2: number;
    tauxRemplissage: number;
  };
  services: never[];
  debts: DebtItem[];
  sciDebts: DebtItem[];
  sciChargesCash: number;
  sciAmortization: number;
  ccaBalance: number;
  distributableCashRate: number;
  ccaPriorityRatio: number;
  reserveStrategicRatio: number;
  reserveAfterCcaFullyRepaid: number;
  rentConstraints: {
    mode: RentMode;
    monthlyRent: number;
  };
}

// ── Validated flags ──

export interface ValidatedFlags {
  projet: boolean;
  build: boolean;
  financement: boolean;
  exploitation: boolean;
  gouvernance: boolean;
}

export type SectionName = keyof ValidatedFlags;
