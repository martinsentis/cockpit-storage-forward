import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  ProjetData,
  BuildData,
  FinancementData,
  ExploitationData,
  GouvernanceData,
  FonciereData,
  LoyerDynamiqueData,
  RentPlanPhase,
  AssociesData,
  ApportsData,
  FiscaliteData,
  EvenementsData,
  ValidatedFlags,
  SectionName,
  CapacityPhase,
  CapexEvent,
  ProjectMeta,
  DEFAULT_PROJET,
  DEFAULT_BUILD,
  DEFAULT_FINANCEMENT,
  DEFAULT_EXPLOITATION,
  DEFAULT_GOUVERNANCE,
  DEFAULT_FONCIERE,
  DEFAULT_LOYER_DYNAMIQUE,
  DEFAULT_ASSOCIES,
  DEFAULT_APPORTS,
  DEFAULT_FISCALITE,
  DEFAULT_EVENEMENTS,
  DEFAULT_GLOBAL_RULE,
  createDefaultPhase,
  createDefaultCapexEvent,
  createDefaultAllocationOrder,
} from "@/types/project";
import { computeEngine } from "@/engine/engine";
import { phaseSurface } from "@/engine/engine";

const STORAGE_KEY = "pilotagebox_projects";
const LEGACY_STORAGE_KEY = "pilotagebox_project_state";

export interface ProjectState {
  projet: ProjetData;
  build: BuildData;
  financement: FinancementData;
  exploitation: ExploitationData;
  fonciere: FonciereData;
  loyerDynamique: LoyerDynamiqueData;
  gouvernance: GouvernanceData;
  associes: AssociesData;
  apports: ApportsData;
  fiscalite: FiscaliteData;
  evenements: EvenementsData;
}

export interface ProjectEntry {
  meta: ProjectMeta;
  state: ProjectState;
  validated: ValidatedFlags;
}

export interface MultiProjectState {
  projects: Record<string, ProjectEntry>;
  activeProjectId: string | null;
}

interface ProjectContextValue {
  // Active project (null if none selected)
  state: ProjectState;
  validated: ValidatedFlags;
  activeProjectId: string | null;
  activeProjectMeta: ProjectMeta | null;
  updateSection: <K extends keyof ProjectState>(section: K, data: Partial<ProjectState[K]>) => void;
  batchUpdateSections: (updates: Partial<{ [K in keyof ProjectState]: Partial<ProjectState[K]> }>) => void;
  validateSection: (section: SectionName) => void;
  isProjectComplete: () => boolean;
  buildProjectionInputs: () => ProjectionInputs;
  // Multi-project management
  projectList: ProjectMeta[];
  createProject: (meta: Omit<ProjectMeta, "id" | "createdAt">) => string;
  switchProject: (id: string) => void;
  deleteProject: (id: string) => void;
  updateProjectMeta: (id: string, updates: Partial<Omit<ProjectMeta, "id" | "createdAt">>) => void;
  hasActiveProject: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be inside ProjectProvider");
  return ctx;
};

const defaultState: ProjectState = {
  projet: { ...DEFAULT_PROJET },
  build: { ...DEFAULT_BUILD },
  financement: { ...DEFAULT_FINANCEMENT },
  exploitation: { ...DEFAULT_EXPLOITATION },
  fonciere: { ...DEFAULT_FONCIERE },
  loyerDynamique: { ...DEFAULT_LOYER_DYNAMIQUE },
  gouvernance: { ...DEFAULT_GOUVERNANCE },
  associes: { ...DEFAULT_ASSOCIES },
  apports: { ...DEFAULT_APPORTS },
  fiscalite: { ...DEFAULT_FISCALITE },
  evenements: { ...DEFAULT_EVENEMENTS },
};

const defaultValidated: ValidatedFlags = {
  projet: false,
  build: false,
  financement: false,
  exploitation: false,
  fonciere: false,
  loyerDynamique: false,
  gouvernance: false,
  associes: false,
  apports: false,
  fiscalite: false,
};

// ── Migration helpers ──

function migrateExploitation(e: any): ExploitationData {
  if (e?.capacityPhases) {
    return {
      capacityPhases: e.capacityPhases,
      services: e.services ?? [],
      gestionnaires: e.gestionnaires ?? [],
      charges: e.charges ?? [],
    };
  }
  const phase = createDefaultPhase();
  if (e?.modeBox) phase.modeBox = e.modeBox;
  if (e?.capacite?.surfaceMacro != null) phase.surface = e.capacite.surfaceMacro;
  if (e?.capacite?.prixM2Macro != null) phase.prixM2 = e.capacite.prixM2Macro;
  if (e?.capacite?.typologies) phase.typologies = e.capacite.typologies.map((t: any) => ({
    ...t,
    prixType: t.prixType ?? "HT",
    vatRate: t.vatRate ?? 0.20,
  }));
  return {
    capacityPhases: [phase],
    services: e?.services ?? [],
    gestionnaires: e?.gestionnaires ?? [],
    charges: e?.charges ?? [],
  };
}

function migrateBudgetLine(l: any): any {
  return {
    ...l,
    montant: l.montant ?? l.budgetPrevu ?? 0,
    prixType: l.prixType ?? "HT",
    vatRate: l.vatRate ?? 0.20,
  };
}

function migrateBuild(b: any): BuildData {
  if (b?.capexEvents && Array.isArray(b.capexEvents)) {
    return {
      capexEvents: b.capexEvents.map((ev: any) => ({
        ...ev,
        budgetLines: (ev.budgetLines ?? []).map(migrateBudgetLine),
        assets: (ev.assets ?? []).map((a: any) => ({
          ...a,
          amortissable: a.amortissable ?? true,
          commentaire: a.commentaire ?? "",
        })),
        taxeAmenagement: ev.taxeAmenagement ?? { montant: 0, mode: "AUTO" as const, echeances: [] },
        depenses: ev.depenses ?? [],
      })),
    };
  }
  const event: CapexEvent = createDefaultCapexEvent("CAPEX Initial");
  event.startMonth = b?.startMonth ?? 0;
  event.durationMonths = b?.durationMonths ?? 6;
  if (b?.budgetLines && Array.isArray(b.budgetLines)) {
    event.budgetLines = b.budgetLines.map(migrateBudgetLine);
  } else {
    const uid = () => crypto.randomUUID();
    const lines: any[] = [];
    if (b?.posteFoncier) lines.push({ id: uid(), label: "Foncier", category: "TERRAIN", montant: b.posteFoncier, prixType: "HT", vatRate: 0.20 });
    if (b?.posteTravaux) lines.push({ id: uid(), label: "Travaux", category: "BATIMENTS", montant: b.posteTravaux, prixType: "HT", vatRate: 0.20 });
    if (b?.posteHonoraires) lines.push({ id: uid(), label: "Honoraires", category: "HONORAIRES", montant: b.posteHonoraires, prixType: "HT", vatRate: 0.20 });
    if (b?.posteDivers) lines.push({ id: uid(), label: "Divers", category: "DIVERS", montant: b.posteDivers, prixType: "HT", vatRate: 0.20 });
    event.budgetLines = lines;
  }
  const categoryMap: Record<string, string> = {
    CLOTURE_PORTAIL: "VRD",
    CONTENEURS: "EQUIPEMENTS_PRODUCTIFS",
    EQUIPEMENTS: "EQUIPEMENTS_PRODUCTIFS",
    AUTRE: "DIVERS",
  };
  event.assets = (b?.assets ?? []).map((a: any) => ({
    ...a,
    category: categoryMap[a.category] ?? a.category ?? "DIVERS",
    amortissable: a.amortissable ?? true,
    commentaire: a.commentaire ?? "",
  }));
  const oldTaxe = typeof b?.taxeAmenagement === "number" ? b.taxeAmenagement : 0;
  event.taxeAmenagement = (b?.taxeAmenagement && typeof b.taxeAmenagement === "object")
    ? b.taxeAmenagement
    : { montant: oldTaxe, mode: "AUTO" as const, echeances: [] };
  event.depenses = b?.depenses ?? [];
  return { capexEvents: [event] };
}

function migrateLoyerDynamique(ld: any): LoyerDynamiqueData {
  // Already new format
  if (ld?.rentPlan && Array.isArray(ld.rentPlan) && ld.rentPlan.length > 0) {
    return { rentPlan: ld.rentPlan };
  }
  // Legacy format migration
  if (ld?.mode || ld?.manualOverride != null) {
    const modeMap: Record<string, string> = {
      AUTONOMIE_SCI: "SCI_AUTONOMY",
      DESENDETTEMENT_SCI: "DEBT_PAYDOWN",
      OPTIMISATION_FISCALE: "OPTIMIZATION",
      MIX: "MIX",
    };
    let phase: RentPlanPhase;
    if (ld.manualOverride != null && ld.manualOverride > 0) {
      phase = {
        id: crypto.randomUUID(),
        startMonth: 0,
        strategy: { mode: "FIXED_AMOUNT", parameters: { fixed_rent_amount: ld.manualOverride } },
      };
    } else {
      const mapped = (modeMap[ld.mode] ?? "SCI_AUTONOMY") as RentPlanPhase["strategy"]["mode"];
      phase = {
        id: crypto.randomUUID(),
        startMonth: 0,
        strategy: { mode: mapped, parameters: {} },
      };
    }
    return { rentPlan: [phase] };
  }
  return { ...DEFAULT_LOYER_DYNAMIQUE };
}

function migrateGouvernance(g: any): GouvernanceData {
  const globalRule = g?.globalRule ?? {
    distributableCashRate: g?.distributableCashRate ?? DEFAULT_GLOBAL_RULE.distributableCashRate,
    reserveStrategicRatio: g?.reserveStrategicRatio ?? DEFAULT_GLOBAL_RULE.reserveStrategicRatio,
    minCashReserve: g?.minCashReserve ?? DEFAULT_GLOBAL_RULE.minCashReserve,
    dscrConstraintEnabled: g?.dscrConstraintEnabled ?? DEFAULT_GLOBAL_RULE.dscrConstraintEnabled,
    dividendFlatTaxRate: g?.dividendFlatTaxRate ?? DEFAULT_GLOBAL_RULE.dividendFlatTaxRate,
    allocationOrder: createDefaultAllocationOrder(),
  };
  if (globalRule.allocationOrder) {
    globalRule.allocationOrder = globalRule.allocationOrder.map((step: any) => ({
      ...step,
      id: step.id ?? crypto.randomUUID(),
    }));
  }
  const entityRules = (g?.entityRules ?? []).map((rule: any) => ({
    ...rule,
    inheritGlobalRule: rule.transparentDistribution ? true : (rule.inheritGlobalRule ?? true),
    dividendFlatTaxRate: rule.dividendFlatTaxRate ?? 0.30,
    allocationOrder: (rule.allocationOrder ?? createDefaultAllocationOrder()).map((step: any) => ({
      ...step,
      id: step.id ?? crypto.randomUUID(),
    })),
  }));
  return {
    structureJuridique: g?.structureJuridique ?? DEFAULT_GOUVERNANCE.structureJuridique,
    globalRule,
    entityRules,
    distributionHistory: g?.distributionHistory ?? [],
    ccaBalance: g?.ccaBalance ?? DEFAULT_GOUVERNANCE.ccaBalance,
    distributableCashRate: g?.distributableCashRate ?? DEFAULT_GOUVERNANCE.distributableCashRate,
    ccaPriorityRatio: g?.ccaPriorityRatio ?? DEFAULT_GOUVERNANCE.ccaPriorityRatio,
    reserveStrategicRatio: g?.reserveStrategicRatio ?? DEFAULT_GOUVERNANCE.reserveStrategicRatio,
    reserveAfterCcaFullyRepaid: g?.reserveAfterCcaFullyRepaid ?? DEFAULT_GOUVERNANCE.reserveAfterCcaFullyRepaid,
  };
}

function migrateApports(a: any): ApportsData {
  if (!a?.apports) return { ...DEFAULT_APPORTS };
  return {
    apports: a.apports.map((item: any) => ({
      ...item,
      beneficiaireId: item.beneficiaireId ?? item.beneficiaire ?? "",
    })),
  };
}

/**
 * Migrate a single legacy project state into the new multi-project structure.
 * Handles migrating taxRate → FiscaliteData, financial fields → FinancementData.
 */
function migrateSingleProjectState(parsed: any): { state: ProjectState; validated: ValidatedFlags } {
  const rawState = parsed.state ?? parsed;
  const rawProjet = rawState?.projet ?? {};
  const rawFinancement = rawState?.financement ?? {};

  // Extract fields that moved from ProjetData
  const taxRate = rawProjet.taxRate ?? DEFAULT_FISCALITE.corporateTaxRate;
  const initialCash = rawProjet.initialCash ?? rawFinancement.initialCash ?? DEFAULT_FINANCEMENT.initialCash;
  const sciInitialCash = rawProjet.sciInitialCash ?? rawFinancement.sciInitialCash ?? DEFAULT_FINANCEMENT.sciInitialCash;
  const bufferMin = rawProjet.bufferMin ?? rawFinancement.bufferMin ?? DEFAULT_FINANCEMENT.bufferMin;
  const dscrMin = rawProjet.dscrMin ?? rawFinancement.dscrMin ?? DEFAULT_FINANCEMENT.dscrMin;

  const projet: ProjetData = {
    nom: rawProjet.nom ?? DEFAULT_PROJET.nom,
    localisation: rawProjet.localisation ?? DEFAULT_PROJET.localisation,
    horizonMonths: rawProjet.horizonMonths ?? DEFAULT_PROJET.horizonMonths,
    defaultVatRate: rawProjet.defaultVatRate ?? DEFAULT_PROJET.defaultVatRate,
    displayMode: rawProjet.displayMode ?? DEFAULT_PROJET.displayMode,
    projectStartDate: rawProjet.projectStartDate ?? DEFAULT_PROJET.projectStartDate,
    entityDisplayNames: rawProjet.entityDisplayNames ?? {},
  };

  // Migrate old DebtItem format to new format
  const migrateDebt = (d: any): import("@/types/project").DebtItem => ({
    id: d.id ?? crypto.randomUUID(),
    label: d.label ?? "",
    type: d.type ?? "BANK_LOAN",
    entityId: d.entityId ?? "__exploitation__",
    phaseId: d.phaseId,
    amount: d.amount ?? 0,
    startDate: d.startDate ?? "",
    status: d.status ?? "CONFIGURE",
    annualRate: d.annualRate ?? 0,
    durationMonths: d.durationMonths ?? 0,
    deferralType: d.deferralType ?? (d.deferralMonths > 0 ? "PARTIAL" : "NONE"),
    deferralMonths: d.deferralMonths ?? 0,
    insuranceMonthly: d.insuranceMonthly ?? 0,
    suspensionEnabled: d.suspensionEnabled ?? false,
    suspensionMonthsPerYear: d.suspensionMonthsPerYear ?? 0,
    firstPayment: d.firstPayment ?? 0,
    monthlyPayment: d.monthlyPayment ?? 0,
    purchaseOption: d.purchaseOption ?? 0,
    createdBy: d.createdBy,
    startMonth: d.startMonth,
  });

  const financement: FinancementData = {
    apportFondsPropres: rawFinancement.apportFondsPropres ?? DEFAULT_FINANCEMENT.apportFondsPropres,
    debts: (rawFinancement.debts ?? []).map(migrateDebt),
    sciDebts: (rawFinancement.sciDebts ?? []).map((d: any) => migrateDebt({ ...d, entityId: d.entityId ?? "__fonciere__" })),
    sciChargesCash: rawFinancement.sciChargesCash ?? DEFAULT_FINANCEMENT.sciChargesCash,
    sciAmortization: rawFinancement.sciAmortization ?? DEFAULT_FINANCEMENT.sciAmortization,
    initialCash,
    sciInitialCash,
    bufferMin,
    dscrMin,
  };

  const fiscalite: FiscaliteData = {
    corporateTaxRate: taxRate,
  };

  return {
    state: {
      projet,
      build: migrateBuild(rawState?.build),
      financement,
      exploitation: migrateExploitation(rawState?.exploitation),
      fonciere: { ...DEFAULT_FONCIERE, ...rawState?.fonciere },
      loyerDynamique: migrateLoyerDynamique(rawState?.loyerDynamique),
      gouvernance: migrateGouvernance(rawState?.gouvernance),
      associes: rawState?.associes ?? { ...DEFAULT_ASSOCIES },
      apports: migrateApports(rawState?.apports),
      fiscalite,
      evenements: rawState?.evenements ?? { ...DEFAULT_EVENEMENTS },
    },
    validated: { ...defaultValidated, ...parsed.validated, fiscalite: parsed.validated?.fiscalite ?? false },
  };
}

function loadFromStorage(): MultiProjectState {
  try {
    // Try new multi-project format first
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MultiProjectState;
      // Re-migrate each project to handle any new fields
      const projects: Record<string, ProjectEntry> = {};
      for (const [id, entry] of Object.entries(parsed.projects)) {
        const migrated = migrateSingleProjectState({ state: entry.state, validated: entry.validated });
        projects[id] = {
          meta: entry.meta,
          state: migrated.state,
          validated: migrated.validated,
        };
      }
      return { projects, activeProjectId: parsed.activeProjectId };
    }

    // Try legacy single-project format
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const migrated = migrateSingleProjectState(parsed);
      const id = crypto.randomUUID();
      const meta: ProjectMeta = {
        id,
        nom: migrated.state.projet.nom,
        localisation: migrated.state.projet.localisation,
        projectStartDate: migrated.state.projet.projectStartDate,
        horizonMonths: migrated.state.projet.horizonMonths,
        createdAt: new Date().toISOString(),
      };
      // Clean up legacy key
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return {
        projects: { [id]: { meta, state: migrated.state, validated: migrated.validated } },
        activeProjectId: id,
      };
    }
  } catch {
    // ignore
  }
  return { projects: {}, activeProjectId: null };
}

// Helper: compute phase CA HT
function phaseCAHT(p: CapacityPhase): number {
  if (p.modeBox === "MACRO") {
    const priceHT = p.prixType === "HT" ? p.prixM2 : p.prixM2 / (1 + p.vatRate);
    return p.surface * priceHT;
  }
  const active = (p.typologies ?? []).filter(t => t.actif);
  return active.reduce((sum, t) => {
    const unitHT = t.prixType === "HT" ? t.prixMensuel : t.prixMensuel / (1 + t.vatRate);
    return sum + t.nombreDeBox * unitHT;
  }, 0);
}

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [multiState, setMultiState] = useState<MultiProjectState>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(multiState));
  }, [multiState]);

  const activeEntry = multiState.activeProjectId
    ? multiState.projects[multiState.activeProjectId] ?? null
    : null;

  const state = activeEntry?.state ?? defaultState;
  const validated = activeEntry?.validated ?? defaultValidated;
  const hasActiveProject = activeEntry !== null;

  const projectList: ProjectMeta[] = Object.values(multiState.projects)
    .map(e => e.meta)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const updateSection = useCallback(<K extends keyof ProjectState>(section: K, data: Partial<ProjectState[K]>) => {
    setMultiState(prev => {
      const id = prev.activeProjectId;
      if (!id || !prev.projects[id]) return prev;
      const entry = prev.projects[id];
      return {
        ...prev,
        projects: {
          ...prev.projects,
          [id]: {
            ...entry,
            state: { ...entry.state, [section]: { ...entry.state[section], ...data } },
            validated: { ...entry.validated, [section]: true },
          },
        },
      };
    });
  }, []);

  const batchUpdateSections = useCallback((updates: Partial<{ [K in keyof ProjectState]: Partial<ProjectState[K]> }>) => {
    setMultiState(prev => {
      const id = prev.activeProjectId;
      if (!id || !prev.projects[id]) return prev;
      const entry = prev.projects[id];
      const newState = { ...entry.state };
      const newValidated = { ...entry.validated };
      for (const [section, patch] of Object.entries(updates)) {
        const key = section as keyof ProjectState;
        newState[key] = { ...newState[key], ...patch } as any;
        newValidated[key as keyof ValidatedFlags] = true;
      }
      return {
        ...prev,
        projects: {
          ...prev.projects,
          [id]: { ...entry, state: newState, validated: newValidated },
        },
      };
    });
  }, []);

  const validateSection = useCallback((section: SectionName) => {
    setMultiState(prev => {
      const id = prev.activeProjectId;
      if (!id || !prev.projects[id]) return prev;
      const entry = prev.projects[id];
      return {
        ...prev,
        projects: {
          ...prev.projects,
          [id]: {
            ...entry,
            validated: { ...entry.validated, [section]: true },
          },
        },
      };
    });
  }, []);

  const isProjectComplete = useCallback(() => {
    return (
      validated.projet && validated.build && validated.financement &&
      validated.exploitation && validated.fonciere && validated.loyerDynamique &&
      validated.gouvernance && validated.fiscalite
    );
  }, [validated]);

  const createProject = useCallback((meta: Omit<ProjectMeta, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    const fullMeta: ProjectMeta = { ...meta, id, createdAt: new Date().toISOString() };
    const projectState: ProjectState = {
      ...defaultState,
      projet: {
        ...DEFAULT_PROJET,
        nom: meta.nom,
        localisation: meta.localisation,
        projectStartDate: meta.projectStartDate,
        horizonMonths: meta.horizonMonths,
      },
    };
    setMultiState(prev => ({
      projects: {
        ...prev.projects,
        [id]: { meta: fullMeta, state: projectState, validated: { ...defaultValidated } },
      },
      activeProjectId: id,
    }));
    return id;
  }, []);

  const switchProject = useCallback((id: string) => {
    setMultiState(prev => {
      if (!prev.projects[id]) return prev;
      return { ...prev, activeProjectId: id };
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setMultiState(prev => {
      const { [id]: _, ...rest } = prev.projects;
      const newActive = prev.activeProjectId === id ? null : prev.activeProjectId;
      return { projects: rest, activeProjectId: newActive };
    });
  }, []);

  const updateProjectMeta = useCallback((id: string, updates: Partial<Omit<ProjectMeta, "id" | "createdAt">>) => {
    setMultiState(prev => {
      const entry = prev.projects[id];
      if (!entry) return prev;
      return {
        ...prev,
        projects: {
          ...prev.projects,
          [id]: { ...entry, meta: { ...entry.meta, ...updates } },
        },
      };
    });
  }, []);

  const buildProjectionInputs = useCallback((): ProjectionInputs => {
    const p = state.projet;
    const e = state.exploitation;
    const f = state.financement;
    const g = state.gouvernance;
    const fi = state.fiscalite;

    const engineOutputs = computeEngine({
      projet: state.projet,
      build: state.build,
      financement: state.financement,
      exploitation: state.exploitation,
      fonciere: state.fonciere,
      loyerDynamique: state.loyerDynamique,
      gouvernance: state.gouvernance,
      fiscalite: state.fiscalite,
    });
    const loyer = engineOutputs.loyerDynamique.loyerCalcule;

    const phases = e.capacityPhases ?? [createDefaultPhase()];
    const totalSurface = phases.reduce((s, ph) => s + phaseSurface(ph), 0);
    const totalCA = phases.reduce((s, ph) => s + phaseCAHT(ph), 0);

    const projectionPhases: PhaseProjection[] = phases.map(ph => ({
      startMonth: ph.startMonth,
      endMonth: ph.startMonth + ph.rampUpMonths - 1,
      occupancyRate: ph.targetOccupancy,
    }));

    return {
      horizonMonths: p.horizonMonths ?? DEFAULT_PROJET.horizonMonths,
      initialCash: f.initialCash ?? DEFAULT_FINANCEMENT.initialCash,
      sciInitialCash: f.sciInitialCash ?? DEFAULT_FINANCEMENT.sciInitialCash,
      taxRate: fi.corporateTaxRate ?? DEFAULT_FISCALITE.corporateTaxRate,
      bufferMin: f.bufferMin ?? DEFAULT_FINANCEMENT.bufferMin,
      dscrMin: f.dscrMin ?? DEFAULT_FINANCEMENT.dscrMin,
      phases: projectionPhases,
      revenueParams: {
        surface: totalSurface,
        prixM2: totalSurface > 0 ? totalCA / totalSurface : 0,
        tauxRemplissage: 1.0,
      },
      services: [],
      debts: f.debts ?? [],
      sciDebts: f.sciDebts ?? [],
      sciChargesCash: f.sciChargesCash ?? DEFAULT_FINANCEMENT.sciChargesCash,
      sciAmortization: f.sciAmortization ?? DEFAULT_FINANCEMENT.sciAmortization,
      ccaBalance: g.ccaBalance ?? DEFAULT_GOUVERNANCE.ccaBalance,
      distributableCashRate: g.distributableCashRate ?? DEFAULT_GOUVERNANCE.distributableCashRate,
      ccaPriorityRatio: g.ccaPriorityRatio ?? DEFAULT_GOUVERNANCE.ccaPriorityRatio,
      reserveStrategicRatio: g.reserveStrategicRatio ?? DEFAULT_GOUVERNANCE.reserveStrategicRatio,
      reserveAfterCcaFullyRepaid: g.reserveAfterCcaFullyRepaid ?? DEFAULT_GOUVERNANCE.reserveAfterCcaFullyRepaid,
      rentPlan: state.loyerDynamique.rentPlan,
    };
  }, [state]);

  return (
    <ProjectContext.Provider
      value={{
        state, validated, activeProjectId: multiState.activeProjectId,
        activeProjectMeta: activeEntry?.meta ?? null,
        updateSection, batchUpdateSections, validateSection, isProjectComplete, buildProjectionInputs,
        projectList, createProject, switchProject, deleteProject, updateProjectMeta,
        hasActiveProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
