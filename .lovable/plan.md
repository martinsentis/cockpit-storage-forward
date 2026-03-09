

## Plan : ProjectionHeader — Ajustement final

### Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/types/scenario.ts` | Remplacer ScenarioState + defaults |
| `src/contexts/ScenarioContext.tsx` | Ajouter `updatePhaseOverride`, `resetToDefaults` |
| `src/components/ProjectionHeader.tsx` | **Créer** |
| `src/components/ScenarioHypothesesPanel.tsx` | Marquer deprecated, adapter `indexationRate` → `indexationCA` |
| `src/pages/ProjectionSocietesPage.tsx` | Remplacer import/usage par ProjectionHeader |
| `src/pages/ProjectionAssociesPage.tsx` | Remplacer import/usage par ProjectionHeader |
| `src/hooks/useEngine.ts` | Adapter `useEngineWithScenario` (supprimer refs à `indexationRate` et `rampUpMonths` globaux, utiliser `phaseOverrides` + `targetOccupancy`) |

### 1. `src/types/scenario.ts`

Remplacer `ScenarioState` par la version étendue avec :
- 3 champs d'indexation (CA, charges + cible, autres revenus foncière)
- `targetOccupancy: number` (non-optional, défaut 0.9)
- `phaseOverrides: Record<string, { rampUpMonths?: number; rampCurve?: RampCurve }>` avec commentaire "key = capacityPhase.id"
- Gestionnaire : `netMensuel`, `startDate: string | null`, `hasEndDate`, `endDate: string | null`
- Comparaison : `compareWith`, `compareSnapshotId?`
- `exitHypotheses` conservé
- Supprimer `indexationRate` et `rampUpMonths` de l'ancien type

Import `RampCurve` depuis `@/types/project`. Extraire `DEFAULT_EXIT_HYPOTHESES` pour réutilisation dans les defaults.

### 2. `src/contexts/ScenarioContext.tsx`

Ajouter au context value :
- `updatePhaseOverride(phaseId, partial)` — merge dans `phaseOverrides[phaseId]`
- `resetToDefaults()` — remet `scenarioState` à `DEFAULT_SCENARIO_STATE`

### 3. `src/hooks/useEngine.ts`

Dans `useEngineWithScenario` :
- Remplacer le check `scenarioState.rampUpMonths !== undefined` par une boucle sur `phaseOverrides` qui applique les overrides par `phase.id`
- `targetOccupancy` reste appliqué globalement (il est maintenant toujours défini, non-optional)
- Supprimer toute référence à `indexationRate`

### 4. `src/components/ScenarioHypothesesPanel.tsx`

- Ajouter commentaire `@deprecated` en tête
- Remplacer `indexationRate` par `indexationCA` dans le JSX pour que ça compile
- Ne pas supprimer le fichier

### 5. `src/components/ProjectionHeader.tsx` — Nouveau composant

Structure en 2 blocs :

**Ligne scénario** (Card) :
- Badge "Working scenario"
- Select "Comparer avec" : aucun / Baseline / Snapshot

**Panneau hypothèses** (Collapsible Card) :
- **Indexations** : 3 inputs pourcentage + select cible charges
- **Remplissage** : Slider 0-100 (step 1), stocke `value/100`
- **Ramp-up par phase** : lit `useProject().state.exploitation.capacityPhases`, affiche date/surface en lecture, champs éditables durée + courbe avec fallback `override ?? phase default`
- **Salaire gestionnaire** : net mensuel (€), début (`input type="month"`), fin (checkbox + `input type="month"`)
- **3 boutons** : Appliquer (toast confirmation), Sauvegarder (toast "à venir"), Réinitialiser (`resetToDefaults()`)

Règle : `useProject()` en lecture seule, `useScenario()` pour toutes les modifications.

### 6. Pages de projection

- `ProjectionSocietesPage` : remplacer `<ScenarioHypothesesPanel />` par `<ProjectionHeader />`
- `ProjectionAssociesPage` : idem

### Impact compilation

`indexationRate` est référencé dans 2 fichiers seulement (scenario.ts et ScenarioHypothesesPanel.tsx). `useEngine.ts` utilise `scenarioState.rampUpMonths` et `scenarioState.targetOccupancy` — les deux seront adaptés. Aucune autre référence dans le codebase.

