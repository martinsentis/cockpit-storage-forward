

## Plan final : Refonte Loyer Dynamique — `rentPlan` multi-phases

### Audit des références legacy

Toutes les occurrences à migrer :

| Fichier | Ligne(s) | Référence legacy |
|---|---|---|
| `src/types/project.ts` | 3 | `RentMode` type |
| `src/types/project.ts` | 365-369 | `LoyerDynamiqueData` avec `mode`, `targetExploitationResult`, `manualOverride` |
| `src/types/project.ts` | 526-530 | `DEFAULT_LOYER_DYNAMIQUE` |
| `src/types/project.ts` | 737-740 | `rentConstraints` dans `ProjectionInputs` |
| `src/engine/engine.ts` | 101-135 | `ld.mode`, `ld.manualOverride`, switch sur anciennes valeurs |
| `src/contexts/ProjectContext.tsx` | 585-588 | `rentConstraints` dans `buildProjectionInputs` |
| `src/pages/FoncierePage.tsx` | 203 | `state.loyerDynamique.mode.replace(...)` |
| `src/pages/LoyerDynamiquePage.tsx` | 10, 16, 23, 33, 70, 73, 87, 90, 152 | `RentMode`, `form.mode`, `form.manualOverride` |

`ExploitationPage.tsx` — aucune référence directe au mode loyer.

### Modifications par fichier

**1. `src/types/project.ts`**

- Supprimer `RentMode` (l.3), ancien `LoyerDynamiqueData` (l.365-369), `DEFAULT_LOYER_DYNAMIQUE` (l.526-530), `rentConstraints` dans `ProjectionInputs` (l.737-740)
- Ajouter les nouveaux types et le nouveau default tel que validé dans le plan précédent
- Dans `ProjectionInputs`, remplacer `rentConstraints` par `rentPlan: RentPlanPhase[]`

**2. `src/pages/LoyerDynamiquePage.tsx`** — réécriture complète

- Indicateurs informatifs (charges SCI, intérêts, principal) depuis le moteur local, avec badge "Informatif"
- Liste des phases `rentPlan` :
  - Card par phase : `startMonth` (≥ 0), select mode, paramètres conditionnels
  - OPTIMIZATION : `rn_exploitation_floor_ratio`, checkbox `use_market_rent_cap`, `market_rent_cap` conditionnel
  - Bouton supprimer désactivé si 1 seule phase
- Ajouter une phase : `startMonth` = dernier + 1
- Validation au save : tri auto par `startMonth` croissant, puis vérification absence de doublons (toast erreur si doublons), ratios 0-1, fixed_rent_amount ≥ 0
- Enregistrer : `updateSection` + `validateSection`

**3. `src/engine/engine.ts`** — adapter `computeLoyerDynamique`

- Lire la dernière phase : `const phase = ld.rentPlan[ld.rentPlan.length - 1]`
- Ajouter un commentaire explicite :
```typescript
// NOTE: Using the last phase as a display-only approximation.
// The real temporal logic is handled by the backend engine.
// Do NOT reuse this as a general business rule.
```
- Mapping :
  - `SCI_AUTONOMY` → charges + intérêts
  - `DEBT_PAYDOWN` → charges + intérêts + principal
  - `OPTIMIZATION` → charges + intérêts
  - `MIX` → charges + intérêts
  - `FIXED_AMOUNT` → `parameters.fixed_rent_amount ?? 0`

**4. `src/contexts/ProjectContext.tsx`**

- Mettre à jour le default `loyerDynamique`
- Migration localStorage : si `loyerDynamique.mode` existe sans `rentPlan`, convertir avec mapping ancien→nouveau. Si `manualOverride` → phase `FIXED_AMOUNT`
- `buildProjectionInputs` : remplacer `rentConstraints` par `rentPlan: state.loyerDynamique.rentPlan`

**5. `src/pages/FoncierePage.tsx`** (l.203)

- Remplacer `state.loyerDynamique.mode.replace(/_/g, " ")` par un label mappé depuis `rentPlan[rentPlan.length - 1]?.strategy.mode`

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/types/project.ts` | Nouveaux types, suppression legacy, ProjectionInputs |
| `src/pages/LoyerDynamiquePage.tsx` | Réécriture complète |
| `src/engine/engine.ts` | Adapter computeLoyerDynamique + commentaire proxy |
| `src/contexts/ProjectContext.tsx` | Migration, default, buildProjectionInputs |
| `src/pages/FoncierePage.tsx` | Adapter affichage mode |

