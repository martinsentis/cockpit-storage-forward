// ── Section types ──

export type RentMode = "AUTONOMIE_SCI" | "OPTIMISATION_FISCALE" | "DESENDETTEMENT_SCI" | "MIX";
export type BoxMode = "MACRO" | "TYPOLOGIE";
export type ChargeCategory = "IMMOBILIER" | "ENERGIE" | "SECURITE" | "MARKETING" | "EXPLOITATION" | "ADMINISTRATIF" | "AUTRE";
export type ChargeFrequency = "MENSUELLE" | "ANNUELLE";
export type RampCurve = "LINEAR" | "FAST_START" | "SLOW_START";

export interface ProjetData {
  nom: string;
  localisation: string;
  horizonMonths: number;
  defaultVatRate: number;
  displayMode: "HT" | "TTC";
  projectStartDate: string; // "YYYY-MM" format, e.g. "2026-06"
  entityDisplayNames: Record<string, string>;
}

// ── Fiscalité ──

export interface FiscaliteData {
  corporateTaxRate: number; // e.g. 0.25
}

export const DEFAULT_FISCALITE: FiscaliteData = {
  corporateTaxRate: 0.25,
};

// ── Build / CAPEX ──

export type CapexCategory = "TERRAIN" | "VRD" | "EQUIPEMENTS_PRODUCTIFS" | "BATIMENTS" | "HONORAIRES" | "FRAIS_FINANCIERS" | "TAXES_URBANISME" | "DIVERS";

export const CAPEX_CATEGORY_LABELS: Record<CapexCategory, string> = {
  TERRAIN: "Terrain",
  VRD: "Aménagement terrain / VRD",
  EQUIPEMENTS_PRODUCTIFS: "Équipements productifs",
  BATIMENTS: "Bâtiments / Structures",
  HONORAIRES: "Honoraires techniques",
  FRAIS_FINANCIERS: "Frais financiers",
  TAXES_URBANISME: "Taxes d'urbanisme",
  DIVERS: "Divers",
};

export const CAPEX_DEFAULT_DEPRECIATION: Record<CapexCategory, { amortissable: boolean; years: number }> = {
  TERRAIN: { amortissable: false, years: 0 },
  VRD: { amortissable: true, years: 15 },
  EQUIPEMENTS_PRODUCTIFS: { amortissable: true, years: 10 },
  BATIMENTS: { amortissable: true, years: 30 },
  HONORAIRES: { amortissable: true, years: 10 },
  FRAIS_FINANCIERS: { amortissable: false, years: 0 },
  TAXES_URBANISME: { amortissable: false, years: 0 },
  DIVERS: { amortissable: true, years: 10 },
};

export interface CapexBudgetLine {
  id: string;
  label: string;
  category: CapexCategory;
  montant: number;
  prixType: "HT" | "TTC" | "NON_SOUMIS";
  vatRate: number;
  commentaire?: string;
}

export interface BuildAsset {
  id: string;
  label: string;
  category: CapexCategory;
  amount: number;
  amortissable: boolean;
  depreciationYears: number;
  commissioningMonth: number;
  commentaire?: string;
}

export type TaxePaymentMode = "AUTO" | "MANUEL";

export interface TaxeEcheance {
  id: string;
  monthOffset: number;
  montant: number;
}

export interface TaxeAmenagementData {
  montant: number;
  mode: TaxePaymentMode;
  echeances: TaxeEcheance[];
}

export interface DepenseReelle {
  id: string;
  date: string;
  fournisseur: string;
  posteCapexId?: string;
  montant: number;
  commentaire?: string;
}

export interface CapexEvent {
  id: string;
  nom: string;
  startMonth: number;
  durationMonths: number;
  budgetLines: CapexBudgetLine[];
  assets: BuildAsset[];
  taxeAmenagement: TaxeAmenagementData;
  depenses: DepenseReelle[];
}

export interface BuildData {
  capexEvents: CapexEvent[];
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
  // Migrated from ProjetData
  initialCash: number;
  sciInitialCash: number;
  bufferMin: number;
  dscrMin: number;
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

export type CapacityPhaseStatus = "DRAFT" | "ACTIVE";

export interface PhaseCapexEstimate {
  equipementProductifM2: number;
  amenagement: number;
  taxeAmenagement: number;
  honoraires: number;
  divers: number;
}

export type PhaseFinancingSource = "TRESORERIE" | "CCA" | "CAPITAL" | "DETTE_BANCAIRE" | "CREDIT_BAIL";

export const FINANCING_SOURCE_LABELS: Record<PhaseFinancingSource, string> = {
  TRESORERIE: "Trésorerie",
  CCA: "Compte courant d'associé",
  CAPITAL: "Apport en capital",
  DETTE_BANCAIRE: "Dette bancaire",
  CREDIT_BAIL: "Crédit-bail",
};

export interface PhaseFinancingLine {
  id: string;
  source: PhaseFinancingSource;
  montant: number;
  percent?: number;
}

export interface PhaseDraft {
  currentStep: number;
  capexEstimate: PhaseCapexEstimate;
  financing: PhaseFinancingLine[];
  entityPorteuse: "SCI" | "EXPLOITATION";
  amortissable: boolean;
  dureeAmortissement: number;
}

export interface CapacityPhase {
  id: string;
  nom: string;
  status: CapacityPhaseStatus;
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
  // Draft wizard data
  draft?: PhaseDraft;
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

export type GestionnaireType = "PRESTATAIRE" | "SALARIE";

export interface Gestionnaire {
  id: string;
  nom: string;
  type: GestionnaireType;
  actif: boolean;
  // Prestataire
  facturationMensuelle: number;
  prixType: "HT" | "TTC";
  vatRate: number;
  // Salarié
  salaireBrut: number;
  tauxChargesPatronales: number;
  // Temporalité
  activeFromStart: boolean;
  startMonth: number;
  hasEndMonth: boolean;
  endMonth: number | null;
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

// ── Foncière (SCI) ──

export type SCIChargeCategory = "IMMOBILIER" | "ADMINISTRATIF";

export interface SCIChargeItem {
  id: string;
  label: string;
  category: SCIChargeCategory;
  frequency: ChargeFrequency;
  amountInput: number;
  amountType: "HT" | "TTC";
  vatRate: number;
  annualMonth: number | null;
  startMonth: number;
  endMonth: number | null;
  isActive: boolean;
}

export interface SCIRevenueItem {
  id: string;
  nom: string;
  montant: number;
  prixType: "HT" | "TTC";
  vatRate: number;
  frequency: ChargeFrequency;
  startMonth: number;
  endMonth: number | null;
}

export interface FonciereData {
  charges: SCIChargeItem[];
  otherRevenues: SCIRevenueItem[];
}

// ── Loyer Dynamique ──

export interface LoyerDynamiqueData {
  mode: RentMode;
  targetExploitationResult: number;
  manualOverride: number | null;
}

// ── Gouvernance ──

export type CashAllocationStepType = "CCA_REPAYMENT" | "RESERVE" | "DIVIDENDS";
export type AllocationStepMode = "RATIO" | "UNTIL_ZERO" | "UNTIL_TARGET";

export interface CashAllocationStep {
  id: string;
  type: CashAllocationStepType;
  mode: AllocationStepMode;
  ratio: number;
  target?: number;
  label?: string;
}

export const CASH_ALLOCATION_STEP_LABELS: Record<CashAllocationStepType, string> = {
  CCA_REPAYMENT: "Remboursement CCA",
  RESERVE: "Réserve stratégique",
  DIVIDENDS: "Distribution de dividendes",
};

export const ALLOCATION_MODE_LABELS: Record<AllocationStepMode, string> = {
  RATIO: "Pourcentage",
  UNTIL_ZERO: "Jusqu'à épuisement",
  UNTIL_TARGET: "Jusqu'à un montant cible",
};

export interface GlobalGouvernanceRule {
  distributableCashRate: number;
  reserveStrategicRatio: number;
  minCashReserve: number;
  dscrConstraintEnabled: boolean;
  dividendFlatTaxRate: number;
  allocationOrder: CashAllocationStep[];
}

export interface EntityGouvernanceRule {
  entityId: string;
  inheritGlobalRule: boolean;
  transparentDistribution: boolean;
  distributionOverrideEnabled: boolean;
  distributionOverrideAmount: number | null;
  dividendFlatTaxRate: number;
  distributableCashRate: number;
  reserveStrategicRatio: number;
  minCashReserve: number;
  dscrConstraintEnabled: boolean;
  allocationOrder: CashAllocationStep[];
}

export interface DistributionEvent {
  id: string;
  entityId: string;
  date: string;
  amount: number;
  type: CashAllocationStepType;
  commentaire?: string;
}

export interface GouvernanceData {
  structureJuridique: string;
  globalRule: GlobalGouvernanceRule;
  entityRules: EntityGouvernanceRule[];
  distributionHistory: DistributionEvent[];
  // Legacy flat fields (kept for engine compatibility)
  ccaBalance: number;
  distributableCashRate: number;
  ccaPriorityRatio: number;
  reserveStrategicRatio: number;
  reserveAfterCcaFullyRepaid: number;
}

// ── Defaults ──

export const DEFAULT_PROJET: ProjetData = {
  nom: "Mon projet",
  localisation: "Paris",
  horizonMonths: 120,
  defaultVatRate: 0.20,
  displayMode: "HT",
  projectStartDate: "2026-06",
  entityDisplayNames: {},
};

export function createDefaultCapexEvent(nom = "CAPEX Initial"): CapexEvent {
  return {
    id: crypto.randomUUID(),
    nom,
    startMonth: 0,
    durationMonths: 6,
    budgetLines: [],
    assets: [],
    taxeAmenagement: { montant: 0, mode: "AUTO", echeances: [] },
    depenses: [],
  };
}

export const DEFAULT_BUILD: BuildData = {
  capexEvents: [createDefaultCapexEvent()],
};

export const DEFAULT_FINANCEMENT: FinancementData = {
  apportFondsPropres: 200000,
  debts: [],
  sciDebts: [],
  sciChargesCash: 0,
  sciAmortization: 0,
  initialCash: 100000,
  sciInitialCash: 50000,
  bufferMin: 10000,
  dscrMin: 1.2,
};

export const DEFAULT_GESTIONNAIRE_TAUX_CHARGES = 0.42;

export function createDefaultPhase(id?: string, nom?: string, defaultVatRate = 0.20): CapacityPhase {
  return {
    id: id ?? crypto.randomUUID(),
    nom: nom ?? "Phase 1",
    status: "ACTIVE",
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

export function createDefaultPhaseDraft(): PhaseDraft {
  return {
    currentStep: 0,
    capexEstimate: { equipementProductifM2: 0, amenagement: 0, taxeAmenagement: 0, honoraires: 0, divers: 0 },
    financing: [],
    entityPorteuse: "SCI",
    amortissable: true,
    dureeAmortissement: 10,
  };
}

export const DEFAULT_EXPLOITATION: ExploitationData = {
  capacityPhases: [createDefaultPhase("default-phase-1", "Phase 1")],
  services: [],
  gestionnaires: [],
  charges: [],
};

export const DEFAULT_FONCIERE: FonciereData = {
  charges: [],
  otherRevenues: [],
};

export const DEFAULT_LOYER_DYNAMIQUE: LoyerDynamiqueData = {
  mode: "AUTONOMIE_SCI",
  targetExploitationResult: 0,
  manualOverride: null,
};

export function createDefaultAllocationOrder(): CashAllocationStep[] {
  return [
    { id: crypto.randomUUID(), type: "CCA_REPAYMENT", mode: "UNTIL_ZERO", ratio: 100, label: "Remboursement CCA" },
    { id: crypto.randomUUID(), type: "RESERVE", mode: "RATIO", ratio: 20, label: "Réserve stratégique" },
    { id: crypto.randomUUID(), type: "DIVIDENDS", mode: "RATIO", ratio: 80, label: "Distribution dividendes" },
  ];
}

export const DEFAULT_GLOBAL_RULE: GlobalGouvernanceRule = {
  distributableCashRate: 0.5,
  reserveStrategicRatio: 0.1,
  minCashReserve: 0,
  dscrConstraintEnabled: false,
  dividendFlatTaxRate: 0.30,
  allocationOrder: createDefaultAllocationOrder(),
};

export function createDefaultEntityRule(entityId: string): EntityGouvernanceRule {
  return {
    entityId,
    inheritGlobalRule: true,
    transparentDistribution: false,
    distributionOverrideEnabled: false,
    distributionOverrideAmount: null,
    dividendFlatTaxRate: 0.30,
    distributableCashRate: 0.5,
    reserveStrategicRatio: 0.1,
    minCashReserve: 0,
    dscrConstraintEnabled: false,
    allocationOrder: createDefaultAllocationOrder(),
  };
}

export const DEFAULT_GOUVERNANCE: GouvernanceData = {
  structureJuridique: "SCI + SAS",
  globalRule: { ...DEFAULT_GLOBAL_RULE, allocationOrder: createDefaultAllocationOrder() },
  entityRules: [],
  distributionHistory: [],
  ccaBalance: 0,
  distributableCashRate: 0.5,
  ccaPriorityRatio: 0.7,
  reserveStrategicRatio: 0.1,
  reserveAfterCcaFullyRepaid: 0.3,
};

// ── Associés & Sociétés ──

export type PersonType = "PHYSIQUE" | "MORALE";
export type SocieteType = "HOLDING" | "OPERATIONNELLE" | "SCI" | "AUTRE";

export const SOCIETE_TYPE_LABELS: Record<SocieteType, string> = {
  HOLDING: "Holding",
  OPERATIONNELLE: "Société opérationnelle",
  SCI: "SCI",
  AUTRE: "Autre",
};

export interface ParticipationIndirecte {
  societeId: string;
  pourcentage: number;
}

export interface Associe {
  id: string;
  type: PersonType;
  nom: string;
  prenom?: string;
  societeType?: SocieteType;
  partExploitation: number;
  partFonciere: number;
  participationsIndirectes: ParticipationIndirecte[];
}

export interface AssociesData {
  associes: Associe[];
}

export const DEFAULT_ASSOCIES: AssociesData = {
  associes: [],
};

// ── Built-in structural entities ──

export const EXPLOITATION_ENTITY_ID = "__exploitation__";
export const FONCIERE_ENTITY_ID = "__fonciere__";

export const BUILT_IN_SOCIETES: Associe[] = [
  {
    id: EXPLOITATION_ENTITY_ID,
    type: "MORALE",
    nom: "Société d'exploitation",
    societeType: "OPERATIONNELLE",
    partExploitation: 0,
    partFonciere: 0,
    participationsIndirectes: [],
  },
  {
    id: FONCIERE_ENTITY_ID,
    type: "MORALE",
    nom: "Société foncière (SCI)",
    societeType: "SCI",
    partExploitation: 0,
    partFonciere: 0,
    participationsIndirectes: [],
  },
];

// ── Apports Associés ──

export type ApportType = "CAPITAL" | "CCA";
export type ApportStatut = "PREVU" | "REALISE";

export const APPORT_TYPE_LABELS: Record<ApportType, string> = {
  CAPITAL: "Apport en capital",
  CCA: "Compte courant d'associé",
};

export const APPORT_STATUT_LABELS: Record<ApportStatut, string> = {
  PREVU: "Prévu",
  REALISE: "Réalisé",
};

export interface ApportItem {
  id: string;
  apporteurId: string;
  beneficiaireId: string;
  type: ApportType;
  montant: number;
  date: string;
  statut: ApportStatut;
  commentaire?: string;
}

export interface ApportsData {
  apports: ApportItem[];
}

export const DEFAULT_APPORTS: ApportsData = { apports: [] };

// ── Tax-exempt labels ──

export const TAX_EXEMPT_LABELS = ["Taxe foncière", "CFE", "Taxe d'aménagement"];

export function isTaxExemptLabel(label: string): boolean {
  return TAX_EXEMPT_LABELS.some(t => label.toLowerCase().includes(t.toLowerCase()));
}

// ── SCI Charge presets ──

export const SCI_CHARGE_PRESETS: Record<SCIChargeCategory, string[]> = {
  IMMOBILIER: ["Taxe foncière", "Assurance PNO", "Entretien du site", "Maintenance immobilière"],
  ADMINISTRATIF: ["Frais comptables SCI", "Frais juridiques", "Frais bancaires SCI", "Assurance RC Pro"],
};

export const SCI_CATEGORY_LABELS: Record<SCIChargeCategory, string> = {
  IMMOBILIER: "Immobilier",
  ADMINISTRATIF: "Administratif",
};

// ── Project Meta (multi-project) ──

export interface ProjectMeta {
  id: string;
  nom: string;
  localisation: string;
  projectStartDate: string;
  horizonMonths: number;
  createdAt: string;
}

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
  fonciere: boolean;
  loyerDynamique: boolean;
  gouvernance: boolean;
  associes: boolean;
  apports: boolean;
  fiscalite: boolean;
}

export type SectionName = keyof ValidatedFlags;
