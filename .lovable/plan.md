# Fix Projection associés

Deux bugs identifiés sur `src/pages/ProjectionAssociesPage.tsx`.

## Bug 1 — Parts à 3900%

`partExploitation` et `partFonciere` sont stockées en **pourcentage (0-100)** dans le projet (cf. `AssociesPage` qui affiche `${a.partExploitation}%` directement). La page projection les traite comme des **décimales (0-1)** :

- `(pExp * 100).toFixed(0)%` → 39 × 100 = **3900%**
- `totalSasCca * pExp` → multiplié par 39 au lieu de 0.39 → montants × 100

**De plus**, on n'utilise que les parts **directes**. Un associé qui détient via une holding morale est ignoré. Il faut utiliser `computeEconomicOwnership` (déjà disponible dans `src/lib/ownershipGraph.ts`) qui renvoie déjà les parts économiques **en pourcentage (0-100)**, direct + indirect.

**Correctif** :
- Remplacer `inv.partExploitation` / `inv.partFonciere` par `econ.exploitation / 100` et `econ.fonciere / 100` (via `computeEconomicOwnership(state.associes.associes)` mémoïsé).
- Pour le badge : afficher `econ.exploitation.toFixed(0)%` directement (sans `*100`).

## Bug 2 — Waterfall / graphique vides

Vérification de la réponse Railway : le backend ne renvoie **aucune** catégorie `SAS_DISTRIBUTION_DIVIDENDS`, `SCI_DISTRIBUTION_DIVIDENDS`, `SAS_DISTRIBUTION_CCA`, `SCI_DISTRIBUTION_CCA`, `SAS_DISTRIBUTION_RESERVE`, `SCI_DISTRIBUTION_RESERVE` dans `projectedByCategory`. Les seules catégories émises sont : `SAS_REVENUE`, `SAS_OPEX`, `SAS_RENT`, `SCI_RENT`, `SCI_DEBT_INTEREST`, `SCI_DEBT_INSURANCE`, `SCI_OTHER_REVENUE`, `SCI_CHARGES`.

Résultat : `dividends`, `ccaRepayment`, `totalDistributed` sont systématiquement à 0 → graphique sans barres et colonnes du tableau à 0 €.

**Correctif (front-only, sans toucher au backend)** : calculer les distributions côté front à partir des résultats nets annuels et des règles de gouvernance déjà saisies (`state.gouvernance.globalRule`) :

```text
Pour chaque année y :
  cashDispo  = cashFinAnnée(SAS+SCI) - bufferMin     (clamp ≥ 0)
  distrTotal = cashDispo × distributableCashRate
  Si ccaBalance > 0 et allocationOrder priorise CCA :
      cca       = min(distrTotal × ccaPriorityRatio, ccaBalance)
      restant   = distrTotal − cca
  Sinon cca = 0, restant = distrTotal
  reserve   = restant × reserveStrategicRatio
  dividends = restant − reserve
```

Cette approche reste une **estimation simplifiée** (pas d'IS différé, pas de propagation inter-annuelle du cash distribué). À documenter par un petit `Alert` au-dessus du tableau : « Estimation locale — le backend ne renvoie pas encore les flux de distribution ».

Un correctif plus propre passera par une évolution Railway pour qu'il émette les catégories `*_DISTRIBUTION_*`. À noter dans `MAPPING_AUDIT.md` comme limitation #6.

## Fichiers touchés

- `src/pages/ProjectionAssociesPage.tsx` : conversion parts %, intégration `computeEconomicOwnership`, estimation locale des distributions, `Alert` d'avertissement.
- `MAPPING_AUDIT.md` : ajout limitation « 6. Catégories de distribution non émises par le backend ».

Aucun changement sur le backend, le moteur, ou la gouvernance.
