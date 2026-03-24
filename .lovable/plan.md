

## Plan : Amortissements simplifiés + nouvelles colonnes SCI

### 1. Simplifier computeSciAmortization

**Fichier** : `src/engine/mapToProjectionInputs.ts`

- Supprimer la constante `SCI_AMORTIZABLE` (ligne 327)
- Dans la boucle interne de `computeSciAmortization`, retirer les lignes `const cat = ...` et `if (!SCI_AMORTIZABLE.includes(cat)) continue;` — ne garder que le filtre `if (!asset.amortissable) continue;`

### 2. Nouvelles colonnes dans le tableau SCI

**Fichier** : `src/components/engine/EngineMonthlyPnL.tsx`

**buildSciRows** — ajouter 3 champs au return :
- `autresRevenus`: `cat["SCI_OTHER_REVENUE"] ?? 0`
- `caTotal`: `loyer + autresRevenus`
- `charges`: `Math.abs(cat["SCI_CHARGES"] ?? 0)`

Recalculer EBE : `caTotal - charges - interest`

**SciTable** — modifier les colonnes :
1. "Loyer reçu (SAS)" — valeur existante `loyer`
2. **Nouveau** "Autres revenus" — `autresRevenus`
3. **Nouveau** "CA total" — `caTotal`
4. **Nouveau** "Charges" — `charges`
5. "Amortissement" — existant
6. Colonnes existantes (EBE, IS, Rés. net, Service dette, CF net)

### Fichiers modifiés

1. `src/engine/mapToProjectionInputs.ts` — suppression filtre catégorie amortissement
2. `src/components/engine/EngineMonthlyPnL.tsx` — 3 nouvelles colonnes SCI + recalcul EBE

