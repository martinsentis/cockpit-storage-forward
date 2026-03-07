

## Plan : Réorganisation sidebar + ScenarioContext séparé

### 1. Sidebar — `src/components/AppSidebar.tsx`

Remplacer le groupe unique "Cockpit" par 3 `SidebarGroup` avec l'ordre demandé :

**Configuration du projet** (avec icônes de validation) :
Projet, Associés & Sociétés, Apports associés, Build, Financement, Exploitation, Foncière, Loyer dynamique, Fiscalité, Gouvernance, Événements de trésorerie (`/evenements`)

**Projections** (sans validation) :
Projection sociétés (`/projection-societes`), Projection associés (`/projection-associes`)

**Pilotage** (sans validation) :
Dashboard (`/dashboard`)

Ajouter les imports d'icônes manquants (`CalendarClock`, `LineChart`, `UserCheck`).

### 2. Types scénario — `src/types/scenario.ts` (nouveau)

Créer le fichier avec `ExitHypotheses`, `ScenarioState`, `DEFAULT_SCENARIO_STATE` exactement comme spécifié.

### 3. ScenarioContext — `src/contexts/ScenarioContext.tsx` (nouveau)

- `scenarioState` / `setScenarioState`
- `updateScenarioField(field, value)` — mise à jour atomique d'un champ
- `updateExitHypotheses(partial)` — merge partiel sur `exitHypotheses`
- State local (pas de localStorage pour l'instant — compatible futur versioning)

### 4. App.tsx

- Ajouter `ScenarioProvider` autour du `BrowserRouter` (après `ProjectProvider`)
- Ajouter les 3 nouvelles routes : `/evenements`, `/projection-societes`, `/projection-associes`
- Imports des nouvelles pages

### 5. useEngine — `src/hooks/useEngine.ts`

- Ajouter `useScenario()` import
- `useEngine()` reste inchangé (config pages utilisent le moteur sans scénario)
- Ajouter `useEngineWithScenario()` qui lit `ScenarioContext` et injecte les overrides pertinents (ex: `targetOccupancy` override sur les phases d'exploitation si défini dans le scénario). Le moteur existant `computeEngine` est appelé sans modification — les overrides sont appliqués sur les inputs avant appel.

### 6. ScenarioHypothesesPanel — `src/components/ScenarioHypothesesPanel.tsx` (nouveau)

Panneau éditable "Hypothèses structurantes du scénario" :
- Taux de remplissage cible → `updateScenarioField("targetOccupancy", v)`
- Durée de ramp-up → `updateScenarioField("rampUpMonths", v)`
- Taux d'indexation annuel → `updateScenarioField("indexationRate", v)`
- Horizon de projection → `updateScenarioField("horizonMonths", v)`

Lit/écrit uniquement dans `ScenarioContext`. Ne touche pas `ProjectState`.

### 7. ExitHypothesesPanel — `src/components/ExitHypothesesPanel.tsx` (nouveau)

Panneau "Hypothèses de sortie / exit" :
- Valorisation foncière, Multiple EBE, Remboursement dettes/CCA avant dividendes
- Utilise `updateExitHypotheses()`

### 8. Pages placeholder (nouveaux fichiers)

**`src/pages/EvenementsPage.tsx`** — Page "À venir" avec titre et description.

**`src/pages/ProjectionSocietesPage.tsx`** :
- `ScenarioHypothesesPanel` en haut
- Onglets Exploitation / Foncière affichant les outputs de `useEngineWithScenario()`
- Compte de résultat, cash-flow, ratios (données du moteur local)

**`src/pages/ProjectionAssociesPage.tsx`** :
- `ScenarioHypothesesPanel` en haut
- `ExitHypothesesPanel` en dessous
- Placeholder pour flux distribués, TRI (calculs backend futurs)

### 9. Supprimer `projectionHypotheses` de ProjectState

Pas nécessaire — l'audit confirme qu'aucun `projectionHypotheses` n'existe dans le code actuel. Aucune modification de `ProjectState` ou `ProjectContext` requise.

### Fichiers

| Fichier | Action |
|---|---|
| `src/types/scenario.ts` | Nouveau |
| `src/contexts/ScenarioContext.tsx` | Nouveau |
| `src/components/ScenarioHypothesesPanel.tsx` | Nouveau |
| `src/components/ExitHypothesesPanel.tsx` | Nouveau |
| `src/pages/EvenementsPage.tsx` | Nouveau |
| `src/pages/ProjectionSocietesPage.tsx` | Nouveau |
| `src/pages/ProjectionAssociesPage.tsx` | Nouveau |
| `src/components/AppSidebar.tsx` | Réorganiser en 3 groupes, nouvel ordre |
| `src/hooks/useEngine.ts` | Ajouter `useEngineWithScenario()` |
| `src/App.tsx` | ScenarioProvider + 3 routes |

