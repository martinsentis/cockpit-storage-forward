// ── Section types ──

export type RentMode = "AUTONOMY_SCI" | "OPTIMISATION_FISCALE" | "DESENDETTEMENT_SCI" | "MIX";
export type BoxMode = "MACRO" | "TYPOLOGIE";
export type ChargeCategory = "IMMOBILIER" | "ENERGIE" | "SECURITE" | "MARKETING" | "EXPLOITATION" | "ADMINISTRATIF" | "AUTRE";
export type ChargeFrequency = "MENSUELLE" | "ANNUELLE";

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

// ── Exploitation types ──

export interface Typologie {
  id: string;
  nom: string;
  surfaceParBox: number;
  nombreDeBox: number;
  prixMensuel: number;
  actif: boolean;
}

export interface Capacite {
  surfaceMacro: number | null;
  prixM2Macro: number | null;
  typologies: Typologie[];
}

export interface ServiceItem {
  id: string;
  nom: string;
  type: "FIXE" | "PAR_BOX" | "PAR_M2";
  montantUnitaire: number;
  actif: boolean;
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
  modeBox: BoxMode;
  capacite: Capacite;
  services: ServiceItem[];
  gestionnaires: Gestionnaire[];
  charges: ChargeItem[];
  phases: Phase[];
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

export const DEFAULT_GESTIONNAIRE_PARAMS: GestionnaireParametres = {
  ratioNetVersBrut: 0.78,
  tauxChargesPatronales: 0.42,
  moisPayes: 12,
};

export const DEFAULT_EXPLOITATION: ExploitationData = {
  modeBox: "MACRO",
  capacite: {
    surfaceMacro: 500,
    prixM2Macro: 15,
    typologies: [],
  },
  services: [],
  gestionnaires: [],
  phases: [{ startMonth: 1, endMonth: 12, occupancyRate: 1.0 }],
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
