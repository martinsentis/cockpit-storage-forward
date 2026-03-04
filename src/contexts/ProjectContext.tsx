import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  ProjetData,
  BuildData,
  FinancementData,
  ExploitationData,
  GouvernanceData,
  ValidatedFlags,
  SectionName,
  ProjectionInputs,
  PhaseProjection,
  CapacityPhase,
  DEFAULT_PROJET,
  DEFAULT_BUILD,
  DEFAULT_FINANCEMENT,
  DEFAULT_EXPLOITATION,
  DEFAULT_GOUVERNANCE,
  createDefaultPhase,
} from "@/types/project";

const STORAGE_KEY = "pilotagebox_project_state";

interface ProjectState {
  projet: ProjetData;
  build: BuildData;
  financement: FinancementData;
  exploitation: ExploitationData;
  gouvernance: GouvernanceData;
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
  gouvernance: { ...DEFAULT_GOUVERNANCE },
};

const defaultValidated: ValidatedFlags = {
  projet: false,
  build: false,
  financement: false,
  exploitation: false,
  gouvernance: false,
};

function migrateExploitation(e: any): ExploitationData {
  // Migrate from old format (modeBox + capacite + phases) to new (capacityPhases)
  if (e?.capacityPhases) {
    return {
      capacityPhases: e.capacityPhases,
      services: e.services ?? [],
      gestionnaires: e.gestionnaires ?? [],
      charges: e.charges ?? [],
    };
  }
  // Old format migration
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

function loadFromStorage(): { state: ProjectState; validated: ValidatedFlags } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        state: {
          ...defaultState,
          ...parsed.state,
          exploitation: migrateExploitation(parsed.state?.exploitation),
        },
        validated: { ...defaultValidated, ...parsed.validated },
      };
    }
  } catch {
    // ignore
  }
  return { state: { ...defaultState }, validated: { ...defaultValidated } };
}

// Helper: compute phase CA HT for a single CapacityPhase
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

function phaseSurface(p: CapacityPhase): number {
  if (p.modeBox === "MACRO") return p.surface;
  return (p.typologies ?? []).filter(t => t.actif).reduce((s, t) => s + t.surfaceParBox * t.nombreDeBox, 0);
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
      validated.projet && validated.build && validated.financement && validated.exploitation && validated.gouvernance
    );
  }, [validated]);

  const buildProjectionInputs = useCallback((): ProjectionInputs => {
    const p = state.projet;
    const e = state.exploitation;
    const f = state.financement;
    const g = state.gouvernance;

    const phases = e.capacityPhases ?? [createDefaultPhase()];

    // Aggregate surface and CA
    const totalSurface = phases.reduce((s, ph) => s + phaseSurface(ph), 0);
    const totalCA = phases.reduce((s, ph) => s + phaseCAHT(ph), 0);

    // Build projection phases from ramp-up data
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
        mode: "DESENDETTEMENT_SCI",
        monthlyRent: g.rentConstraints?.monthlyRent ?? 0,
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
