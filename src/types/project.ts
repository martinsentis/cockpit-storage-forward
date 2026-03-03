// ── Section types ──

export type RentMode =
  | "AUTONOMY_SCI"
  | "OPTIMISATION_FISCALE"
  | "DESENDETTEMENT_SCI"
  | "MIX";

export interface ProjetData {
  nom: string;
  localisation: string;
  horizonMonths: number;
  taxRate: number;
  bufferMin: number;
  dscrMin: number;
  initialCash: number;
  sciInitialCash: number;
}

export interface BuildData {
  capexTotal: number;
  posteFoncier: number;
  posteTravaux: number;
  posteHonoraires: number;
  posteDivers: number;
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

export interface Phase {
  startMonth: number;
  endMonth: number;
  occupancyRate: number;
}

export interface ExploitationData {
  surface: number;
  prixM2: number;
  tauxRemplissage: number;
  phases: Phase[];
  opexPercentOfRevenue: number;
}

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
  };
}

// ── Defaults (jamais undefined) ──

export const DEFAULT_PROJET: ProjetData = {
  nom: "Mon projet",
  localisation: "Paris",
  horizonMonths: 120,
  taxRate: 0.25,
  bufferMin: 10000,
  dscrMin: 1.2,
  initialCash: 100000,
  sciInitialCash: 50000,
};

export const DEFAULT_BUILD: BuildData = {
  capexTotal: 500000,
  posteFoncier: 150000,
  posteTravaux: 250000,
  posteHonoraires: 50000,
  posteDivers: 50000,
};

export const DEFAULT_FINANCEMENT: FinancementData = {
  apportFondsPropres: 200000,
  debts: [],
  sciDebts: [],
  sciChargesCash: 0,
  sciAmortization: 0,
};

export const DEFAULT_EXPLOITATION: ExploitationData = {
  surface: 500,
  prixM2: 15,
  tauxRemplissage: 0.85,
  phases: [{ startMonth: 1, endMonth: 12, occupancyRate: 1.0 }],
  opexPercentOfRevenue: 0.3,
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

// ── API payload type (aucun champ optionnel) ──

export interface ProjectionInputs {
  horizonMonths: number;
  initialCash: number;
  sciInitialCash: number;
  taxRate: number;
  bufferMin: number;
  dscrMin: number;
  phases: Phase[];
  revenueParams: {
    surface: number;
    prixM2: number;
    tauxRemplissage: number;
  };
  services: never[];
  opexPercentOfRevenue: number;
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
