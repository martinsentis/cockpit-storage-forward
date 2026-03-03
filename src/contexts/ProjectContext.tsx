import React, { createContext, useContext, useState, useCallback } from "react";
import {
  ProjetData,
  BuildData,
  FinancementData,
  ExploitationData,
  GouvernanceData,
  ValidatedFlags,
  SectionName,
  ProjectionInputs,
  DEFAULT_PROJET,
  DEFAULT_BUILD,
  DEFAULT_FINANCEMENT,
  DEFAULT_EXPLOITATION,
  DEFAULT_GOUVERNANCE,
} from "@/types/project";

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

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProjectState>({
    projet: { ...DEFAULT_PROJET },
    build: { ...DEFAULT_BUILD },
    financement: { ...DEFAULT_FINANCEMENT },
    exploitation: { ...DEFAULT_EXPLOITATION },
    gouvernance: { ...DEFAULT_GOUVERNANCE },
  });

  const [validated, setValidated] = useState<ValidatedFlags>({
    projet: false,
    build: false,
    financement: false,
    exploitation: false,
    gouvernance: false,
  });

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

    return {
      horizonMonths: p.horizonMonths ?? DEFAULT_PROJET.horizonMonths,
      initialCash: p.initialCash ?? DEFAULT_PROJET.initialCash,
      sciInitialCash: p.sciInitialCash ?? DEFAULT_PROJET.sciInitialCash,
      taxRate: p.taxRate ?? DEFAULT_PROJET.taxRate,
      bufferMin: p.bufferMin ?? DEFAULT_PROJET.bufferMin,
      dscrMin: p.dscrMin ?? DEFAULT_PROJET.dscrMin,

      phases: e.phases && e.phases.length > 0 ? e.phases : DEFAULT_EXPLOITATION.phases,

      revenueParams: {
        surface: e.surface ?? DEFAULT_EXPLOITATION.surface,
        prixM2: e.prixM2 ?? DEFAULT_EXPLOITATION.prixM2,
        tauxRemplissage: e.tauxRemplissage ?? DEFAULT_EXPLOITATION.tauxRemplissage,
      },

      services: [],

      opexPercentOfRevenue: e.opexPercentOfRevenue ?? DEFAULT_EXPLOITATION.opexPercentOfRevenue,

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
