

## Plan : Architecture multi-projets + module Fiscalité

### Ajustements par rapport au plan précédent

1. **IDs internes inchangés** : `__exploitation__` et `__fonciere__` restent tels quels partout. Aucun renommage.
2. **Noms affichés** : ajout de `entityDisplayNames: Record<string, string>` dans `ProjetData` pour permettre le renommage UI sans toucher aux IDs.
3. **Nouveau module `FiscaliteData`** : `taxRate` sort de `ProjetData` et va dans un nouveau module dédié.
4. **`FinancementData`** : reçoit `initialCash`, `sciInitialCash`, `bufferMin`, `dscrMin` (pas `taxRate`).

### Fichiers impactés

#### 1. `src/types/project.ts`

**`ProjetData` simplifié** — retirer `taxRate`, `bufferMin`, `dscrMin`, `initialCash`, `sciInitialCash`. Garder : `nom`, `localisation`, `horizonMonths`, `projectStartDate`, `defaultVatRate`, `displayMode`. Ajouter `entityDisplayNames: Record<string, string>`.

**Nouveau type `FiscaliteData`** :
```typescript
export interface FiscaliteData {
  corporateTaxRate: number; // ex: 0.25
}
export const DEFAULT_FISCALITE: FiscaliteData = { corporateTaxRate: 0.25 };
```

**`FinancementData`** — ajouter `initialCash`, `sciInitialCash`, `bufferMin`, `dscrMin`.

**`ProjectMeta`** (nouveau) :
```typescript
export interface ProjectMeta {
  id: string;
  nom: string;
  localisation: string;
  projectStartDate: string;
  horizonMonths: number;
  createdAt: string;
}
```

**`ValidatedFlags`** — ajouter `fiscalite: boolean`.

#### 2. `src/contexts/ProjectContext.tsx`

**Multi-projets** :
- `MultiProjectState = { projects: Record<string, { meta: ProjectMeta; state: ProjectState; validated: ValidatedFlags }>; activeProjectId: string | null }`
- Nouvelles actions : `createProject(meta)`, `switchProject(id)`, `deleteProject(id)`, `getProjectList()`
- `state` / `validated` pointent sur le projet actif
- Migration : l'ancien `pilotagebox_project_state` est importé comme premier projet avec un ID généré
- `ProjectState` ajoute `fiscalite: FiscaliteData`
- Migration de `taxRate` depuis `ProjetData` vers `FiscaliteData.corporateTaxRate`
- Migration de `initialCash`, `sciInitialCash`, `bufferMin`, `dscrMin` depuis `ProjetData` vers `FinancementData`
- `buildProjectionInputs` lit `taxRate` depuis `state.fiscalite.corporateTaxRate`, et les autres depuis `state.financement`

**localStorage** : clé `pilotagebox_projects` (nouvelle structure multi-projets).

#### 3. `src/pages/Index.tsx` — Page de sélection de projets

- Liste des projets (cards : nom, localisation, date)
- Bouton "Nouveau projet" → dialog avec uniquement : nom, localisation, date début, horizon
- Clic sur un projet → `switchProject(id)` → navigate `/projet`
- Bouton supprimer avec confirmation

#### 4. `src/pages/ProjetPage.tsx` — Simplification

- Retirer les champs financiers (`taxRate`, `bufferMin`, `dscrMin`, `initialCash`, `sciInitialCash`)
- Garder : nom, localisation, date début, horizon, TVA par défaut, mode affichage
- Ajouter section "Noms affichés des sociétés" avec champs éditables pour `entityDisplayNames`

#### 5. `src/pages/FinancementPage.tsx`

- Ajouter les champs migrés : `initialCash` (trésorerie initiale SAS), `sciInitialCash` (trésorerie initiale SCI), `bufferMin`, `dscrMin`

#### 6. Nouveau `src/pages/FiscalitePage.tsx`

- Champ `corporateTaxRate` (taux IS %)
- Enregistrer → `updateSection("fiscalite", ...)` + `validateSection("fiscalite")`

#### 7. `src/components/AppSidebar.tsx`

- Ajouter entrée "Fiscalité" dans la sidebar (entre Gouvernance et Dashboard)
- Ajouter sélecteur de projet en haut (nom du projet actif + lien vers `/`)

#### 8. `src/App.tsx`

- Ajouter route `/fiscalite` → `FiscalitePage`
- Route `/` → `Index` (page de sélection de projets, plus de redirect vers `/projet`)

#### 9. `src/engine/engine.ts` et `src/engine/engineTypes.ts`

- `EngineInputs` ajoute `fiscalite: FiscaliteData`
- Le moteur lit `inputs.fiscalite.corporateTaxRate` au lieu de `inputs.projet.taxRate`

#### 10. `src/hooks/useEngine.ts`

- Passer `state.fiscalite` dans les inputs du moteur

### Ce qui ne change PAS
- IDs `__exploitation__` et `__fonciere__` : inchangés
- `ownershipGraph.ts` : inchangé
- `GouvernancePage` : inchangé
- Structure du moteur financier : inchangée (juste la source de `taxRate`)

