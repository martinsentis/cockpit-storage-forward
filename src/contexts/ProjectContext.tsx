import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  ProjetData,
  BuildData,
  FinancementData,
  ExploitationData,
  GouvernanceData,
  FonciereData,
  LoyerDynamiqueData,
  AssociesData,
  ApportsData,
  ValidatedFlags,
  SectionName,
  ProjectionInputs,
  PhaseProjection,
  CapacityPhase,
  CapexEvent,
  DEFAULT_PROJET,
  DEFAULT_BUILD,
  DEFAULT_FINANCEMENT,
  DEFAULT_EXPLOITATION,
  DEFAULT_GOUVERNANCE,
  DEFAULT_FONCIERE,
  DEFAULT_LOYER_DYNAMIQUE,
  DEFAULT_ASSOCIES,
  DEFAULT_APPORTS,
  createDefaultPhase,
  createDefaultCapexEvent,
} from "@/types/project";
import { computeEngine } from "@/engine/engine";
import { phaseSurface } from "@/engine/engine";

const STORAGE_KEY = "pilotagebox_project_state";

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
}

interface ProjectContextValue {
  state: ProjectState;
  validated: ValidatedFlags;
  updateSection: <K extends keyof ProjectState>(section: K, data: Partial<ProjectState[K]>) => void;
  validateSection: (section: SectionName) => void;
  isProjectComplete: () => boolean;
  buildProjectionInputs: () => ProjectionInputs;
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
};

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
  // Already new CapexEvent format
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

  // Old flat format → wrap in a single CapexEvent
  const event: CapexEvent = createDefaultCapexEvent("CAPEX Initial");
  event.startMonth = b?.startMonth ?? 0;
  event.durationMonths = b?.durationMonths ?? 6;

  // Migrate budgetLines
  if (b?.budgetLines && Array.isArray(b.budgetLines)) {
    event.budgetLines = b.budgetLines.map(migrateBudgetLine);
  } else {
    // Very old format with posteFoncier etc.
    const uid = () => crypto.randomUUID();
    const lines: any[] = [];
    if (b?.posteFoncier) lines.push({ id: uid(), label: "Foncier", category: "TERRAIN", montant: b.posteFoncier, prixType: "HT", vatRate: 0.20 });
    if (b?.posteTravaux) lines.push({ id: uid(), label: "Travaux", category: "BATIMENTS", montant: b.posteTravaux, prixType: "HT", vatRate: 0.20 });
    if (b?.posteHonoraires) lines.push({ id: uid(), label: "Honoraires", category: "HONORAIRES", montant: b.posteHonoraires, prixType: "HT", vatRate: 0.20 });
    if (b?.posteDivers) lines.push({ id: uid(), label: "Divers", category: "DIVERS", montant: b.posteDivers, prixType: "HT", vatRate: 0.20 });
    event.budgetLines = lines;
  }

  // Assets
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

  // Taxe
  const oldTaxe = typeof b?.taxeAmenagement === "number" ? b.taxeAmenagement : 0;
  event.taxeAmenagement = (b?.taxeAmenagement && typeof b.taxeAmenagement === "object")
    ? b.taxeAmenagement
    : { montant: oldTaxe, mode: "AUTO" as const, echeances: [] };

  event.depenses = b?.depenses ?? [];

  return { capexEvents: [event] };
}

function migrateGouvernance(g: any): GouvernanceData {
  return {
    structureJuridique: g?.structureJuridique ?? DEFAULT_GOUVERNANCE.structureJuridique,
    ccaBalance: g?.ccaBalance ?? DEFAULT_GOUVERNANCE.ccaBalance,
    distributableCashRate: g?.distributableCashRate ?? DEFAULT_GOUVERNANCE.distributableCashRate,
    ccaPriorityRatio: g?.ccaPriorityRatio ?? DEFAULT_GOUVERNANCE.ccaPriorityRatio,
    reserveStrategicRatio: g?.reserveStrategicRatio ?? DEFAULT_GOUVERNANCE.reserveStrategicRatio,
    reserveAfterCcaFullyRepaid: g?.reserveAfterCcaFullyRepaid ?? DEFAULT_GOUVERNANCE.reserveAfterCcaFullyRepaid,
    entityRules: g?.entityRules ?? [],
  };
}

function loadFromStorage(): { state: ProjectState; validated: ValidatedFlags } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        state: {
          ...defaultState,
          ...parsed.state,
          build: migrateBuild(parsed.state?.build),
          exploitation: migrateExploitation(parsed.state?.exploitation),
          fonciere: { ...DEFAULT_FONCIERE, ...parsed.state?.fonciere },
          loyerDynamique: { ...DEFAULT_LOYER_DYNAMIQUE, ...parsed.state?.loyerDynamique },
          gouvernance: migrateGouvernance(parsed.state?.gouvernance),
          associes: parsed.state?.associes ?? { ...DEFAULT_ASSOCIES },
          apports: migrateApports(parsed.state?.apports),
        },
        validated: { ...defaultValidated, ...parsed.validated },
      };
    }
  } catch {
    // ignore
  }
  return { state: { ...defaultState }, validated: { ...defaultValidated } };
}

// Helper: compute phase CA HT (used only for projection inputs aggregation)
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
  const [initial] = useState(loadFromStorage);
  const [state, setState] = useState<ProjectState>(initial.state);
  const [validated, setValidated] = useState<ValidatedFlags>(initial.validated);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, validated }));
  }, [state, validated]);

  const updateSection = useCallback(<K extends keyof ProjectState>(section: K, data: Partial<ProjectState[K]>) => {
    setState((prev) => ({ ...prev, [section]: { ...prev[section], ...data } }));
  }, []);

  const validateSection = useCallback((section: SectionName) => {
    setValidated((prev) => ({ ...prev, [section]: true }));
  }, []);

  const isProjectComplete = useCallback(() => {
    return (
      validated.projet && validated.build && validated.financement &&
      validated.exploitation && validated.fonciere && validated.loyerDynamique && validated.gouvernance
    );
  }, [validated]);

  const buildProjectionInputs = useCallback((): ProjectionInputs => {
    const p = state.projet;
    const e = state.exploitation;
    const f = state.financement;
    const g = state.gouvernance;

    // Use engine to get the loyer
    const engineOutputs = computeEngine(state);
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
      initialCash: p.initialCash ?? DEFAULT_PROJET.initialCash,
      sciInitialCash: p.sciInitialCash ?? DEFAULT_PROJET.sciInitialCash,
      taxRate: p.taxRate ?? DEFAULT_PROJET.taxRate,
      bufferMin: p.bufferMin ?? DEFAULT_PROJET.bufferMin,
      dscrMin: p.dscrMin ?? DEFAULT_PROJET.dscrMin,
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
      rentConstraints: {
        mode: state.loyerDynamique.mode,
        monthlyRent: loyer,
      },
    };
  }, [state]);

  return (
    <ProjectContext.Provider
      value={{ state, validated, updateSection, validateSection, isProjectComplete, buildProjectionInputs }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
