import type { Associe } from "@/types/project";

export interface PathStep {
  entityId: string;
  entityName: string;
  percent: number;
}

export interface OwnershipPath {
  steps: PathStep[];
  finalPercent: number;
}

export interface EconomicOwnership {
  personId: string;
  personName: string;
  exploitation: number;
  fonciere: number;
  exploitationPaths: OwnershipPath[];
  foncierePaths: OwnershipPath[];
}

/**
 * Compute economic ownership for all physical persons via DFS.
 * Handles arbitrary depth of intermediate holding companies.
 */
export function computeEconomicOwnership(associes: Associe[]): EconomicOwnership[] {
  const physiques = associes.filter(a => a.type === "PHYSIQUE");
  const morales = associes.filter(a => a.type === "MORALE");
  const moraleMap = new Map(morales.map(m => [m.id, m]));

  const results: EconomicOwnership[] = [];

  for (const pp of physiques) {
    const exploitationPaths: OwnershipPath[] = [];
    const foncierePaths: OwnershipPath[] = [];

    // Direct participation
    if (pp.partExploitation > 0) {
      exploitationPaths.push({
        steps: [{ entityId: pp.id, entityName: `${pp.prenom ? pp.prenom + " " : ""}${pp.nom}`, percent: pp.partExploitation }],
        finalPercent: pp.partExploitation,
      });
    }
    if (pp.partFonciere > 0) {
      foncierePaths.push({
        steps: [{ entityId: pp.id, entityName: `${pp.prenom ? pp.prenom + " " : ""}${pp.nom}`, percent: pp.partFonciere }],
        finalPercent: pp.partFonciere,
      });
    }

    // Indirect via holdings - DFS
    for (const pi of pp.participationsIndirectes) {
      if (pi.pourcentage <= 0) continue;
      const visited = new Set<string>([pp.id]);
      const currentSteps: PathStep[] = [
        { entityId: pp.id, entityName: `${pp.prenom ? pp.prenom + " " : ""}${pp.nom}`, percent: pi.pourcentage },
      ];
      dfs(pi.societeId, pi.pourcentage / 100, currentSteps, visited, moraleMap, exploitationPaths, foncierePaths);
    }

    results.push({
      personId: pp.id,
      personName: `${pp.prenom ? pp.prenom + " " : ""}${pp.nom}`,
      exploitation: exploitationPaths.reduce((s, p) => s + p.finalPercent, 0),
      fonciere: foncierePaths.reduce((s, p) => s + p.finalPercent, 0),
      exploitationPaths,
      foncierePaths,
    });
  }

  return results;
}

function dfs(
  currentId: string,
  cumulPercent: number,
  parentSteps: PathStep[],
  visited: Set<string>,
  moraleMap: Map<string, Associe>,
  exploitationPaths: OwnershipPath[],
  foncierePaths: OwnershipPath[],
) {
  if (visited.has(currentId)) return; // circular
  const entity = moraleMap.get(currentId);
  if (!entity) return;

  visited.add(currentId);

  // Does this entity hold direct shares?
  if (entity.partExploitation > 0) {
    const final = cumulPercent * entity.partExploitation;
    exploitationPaths.push({
      steps: [...parentSteps, { entityId: entity.id, entityName: entity.nom, percent: entity.partExploitation }],
      finalPercent: final,
    });
  }
  if (entity.partFonciere > 0) {
    const final = cumulPercent * entity.partFonciere;
    foncierePaths.push({
      steps: [...parentSteps, { entityId: entity.id, entityName: entity.nom, percent: entity.partFonciere }],
      finalPercent: final,
    });
  }

  // Continue DFS through this entity's indirect participations
  for (const pi of entity.participationsIndirectes) {
    if (pi.pourcentage <= 0) continue;
    const nextSteps = [...parentSteps, { entityId: entity.id, entityName: entity.nom, percent: pi.pourcentage }];
    dfs(pi.societeId, cumulPercent * (pi.pourcentage / 100), nextSteps, new Set(visited), moraleMap, exploitationPaths, foncierePaths);
  }

  visited.delete(currentId);
}

/**
 * Validate ownership structure.
 */
export function validateOwnership(associes: Associe[]): string[] {
  const errors: string[] = [];

  // Sum direct participations
  const sumExpl = associes.reduce((s, a) => s + a.partExploitation, 0);
  const sumFonc = associes.reduce((s, a) => s + a.partFonciere, 0);

  if (associes.length > 0 && Math.abs(sumExpl - 100) > 0.01 && sumExpl > 0) {
    errors.push(`Exploitation : détention totale = ${sumExpl.toFixed(2)}% (doit être 100%)`);
  }
  if (associes.length > 0 && Math.abs(sumFonc - 100) > 0.01 && sumFonc > 0) {
    errors.push(`Foncière : détention totale = ${sumFonc.toFixed(2)}% (doit être 100%)`);
  }

  // Check that morales are reachable from at least one physique
  const morales = associes.filter(a => a.type === "MORALE");
  const physiques = associes.filter(a => a.type === "PHYSIQUE");

  for (const m of morales) {
    if (m.partExploitation > 0 || m.partFonciere > 0) {
      const reachable = physiques.some(pp =>
        pp.participationsIndirectes.some(pi => pi.societeId === m.id && pi.pourcentage > 0)
      );
      if (!reachable) {
        errors.push(`${m.nom} détient des parts mais n'est détenue par aucune personne physique`);
      }
    }
  }

  return errors;
}
