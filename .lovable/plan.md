

## Plan : Implémenter le Cockpit V1 complet

### Contexte
Le projet est vierge (juste le scaffold shadcn). On doit créer toute l'architecture SaaS : sidebar, 6 pages, state global, et l'appel API avec un `buildProjectionInputs()` qui produit un payload complet sans aucun `undefined`.

### Fichiers à créer

**1. `src/config.ts`** — `export const API_URL = "https://phylis-unrationalising-rudolf.ngrok-free.dev"`

**2. `src/types/project.ts`** — Types et defaults :
- Types par section (ProjetData, BuildData, FinancementData, ExploitationData, GouvernanceData)
- Type `ProjectionInputs` aligné sur le contrat API avec tous les champs obligatoires :
  - `horizonMonths`, `initialCash`, `sciInitialCash`, `taxRate`, `bufferMin`, `dscrMin`
  - `phases` (1 phase par défaut : mois 1→12, 100% remplissage)
  - `revenueParams` (surface, prixM2, tauxRemplissage)
  - `services` ([] par défaut)
  - `opexPercentOfRevenue`
  - `debts`, `sciDebts` ([] par défaut)
  - `sciChargesCash`, `sciAmortization` (0 par défaut)
  - `ccaBalance`, `distributableCashRate`, `ccaPriorityRatio`, `reserveStrategicRatio`, `reserveAfterCcaFullyRepaid`
  - `rentConstraints` ({ mode: "fixed", monthlyRent: 0 })
- Constantes `DEFAULT_*` exportées pour chaque section

**3. `src/contexts/ProjectContext.tsx`** :
- State initialisé avec les defaults
- `validated` flags (5 booleans, tous false)
- `updateSection()`, `validateSection()`, `isProjectComplete()`
- `buildProjectionInputs()` : fusionne state + defaults via `??` sur chaque champ. Retourne un objet typé `ProjectionInputs` complet. Inclut toujours au moins 1 phase, services=[], debts=[], sciDebts=[]

**4. `src/components/AppSidebar.tsx`** — Sidebar avec 6 liens, icônes CheckCircle (vert) / AlertTriangle (orange) selon `validated[section]`

**5. `src/components/Layout.tsx`** — SidebarProvider + SidebarTrigger + Outlet

**6. 5 pages métier** (ProjetPage, BuildPage, FinancementPage, ExploitationPage, GouvernancePage) :
- Formulaires pré-remplis depuis le Context
- Bouton "Enregistrer" → updateSection + validateSection
- Champs par page alignés sur les inputs API

**7. `src/pages/DashboardPage.tsx`** :
- Liste les sections manquantes si projet incomplet
- Bouton "Lancer la simulation" désactivé si incomplet
- Si complet : `buildProjectionInputs()` → POST `${API_URL}/simulate`
- Affiche réponse JSON ou erreur dans `<pre>`

**8. `src/App.tsx`** — ProjectProvider wrapper, routes imbriquées dans Layout, `/` → redirect `/projet`

