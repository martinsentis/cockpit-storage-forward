# Audit mapping front → backend (`mapToProjectionInputs.ts`)

Comparaison champ par champ entre ce que le backend attend (`ProjectionInputs`)
et ce que le frontend envoie. Mis à jour après corrections du 2026-05-31.

---

## ✅ Champs correctement mappés

| Champ backend | Source frontend | Notes |
|---|---|---|
| `horizonMonths` | `projet.horizonMonths` | — |
| `projectStartDate` | `projet.projectStartDate` | tronqué à YYYY-MM |
| `initialCash` | `financement.initialCash` | — |
| `sciInitialCash` | `financement.sciInitialCash` | — |
| `taxRate` | `fiscalite.corporateTaxRate` | — |
| `taxSchedules` | construit depuis `corporateTaxRate` | barème 15%/25% si taux standard France, barème plat sinon |
| `bufferMin` | `financement.bufferMin` | — |
| `dscrMin` | `financement.dscrMin` | — |
| `phases` | `exploitation.capacityPhases` | surface MACRO ou somme typologies |
| `revenueParams.pricePerM2` | prix m² HT pondéré par surface des phases actives | — |
| `revenueParams.targetLeasedSurfacePercent` | `phase.targetOccupancy` (modifié par scenario) | toujours en décimal 0→1 |
| `revenueParams.annualIndexationRate` | `scenarioState.indexationCA` | **corrigé** — était hardcodé à 0 |
| `operatingCharges` | `exploitation.charges` + `exploitation.gestionnaires` | toutes en `SAS_OPEX` |
| `services` | `exploitation.services` (type PAR_M2 uniquement) | — |
| `debts` | `financement.debts` | taux annuel % → décimal, assurance €/mois → taux |
| `sciDebts` | `financement.sciDebts` | même transformation |
| `sciChargesCash` | `financement.sciChargesCash` ou calcul depuis `fonciere.charges` | — |
| `sciAmortization` | `financement.sciAmortization` ou calcul depuis `build.capexEvents[].assets` | — |
| `sciOtherRevenuesMonthly` | `fonciere.otherRevenues` | filtré par isActive, converti HT, mensuel |
| `rentConstraints` | `loyerDynamique.rentPlan[0]` (plan au mois 0) | — |
| `ccaBalanceSas` | `gouvernance.ccaBalance` | — |
| `distributableCashRate` | `gouvernance.globalRule.distributableCashRate` | — |
| `reserveStrategicRatio` | `gouvernance.globalRule.reserveStrategicRatio` | — |
| `ccaPriorityRatio` | déduit de `allocationOrder` : UNTIL_ZERO → 1, sinon ratio/100 | **corrigé** — était hardcodé à 1 |
| `reserveAfterCcaFullyRepaid` | déduit de `allocationOrder` : vrai si RESERVE après CCA_REPAYMENT | **corrigé** — était hardcodé à false |

---

## ⚠️ Limitations connues (non corrigées — nécessitent évolution backend)

### 1. Temporalité des charges, gestionnaires et services

**Problème** : le backend reçoit un tableau de charges avec un booléen `isActive` unique,
sans date de début ni de fin. Il applique chaque charge active sur **tous les mois** de l'horizon.

**Conséquence** : une charge qui démarre à M6 ou se termine à M24 est traitée comme active
dès M0 et jusqu'à la fin de l'horizon.

**Comportement actuel du mapper** : une charge/gestionnaire est marquée `isActive: true`
seulement si `startMonth <= 0` et que `endMonth` n'est pas encore atteint. Les charges
futures (startMonth > 0) sont désactivées — elles n'ont donc **aucun impact** sur la simulation,
ni au bon moment ni en avance.

**Fix complet nécessite** : que le backend accepte `startMonth` et `endMonth` par charge,
ou que le mapper génère un payload différent par mois (architecture plus lourde).

### 2. ~~`ccaBalanceSci` toujours à 0~~ — résolu

`ccaBalanceSas` et `ccaBalanceSci` sont désormais calculés depuis
`project.apports.apports` (somme des items `type === "CCA"` filtrés par
`beneficiaireId === "__exploitation__"` ou `"__fonciere__"`). Le champ manuel
`gouvernance.ccaBalance` n'est plus utilisé par le mapper ni par la page
Projection associés.

### 3. Plans de loyer dynamique multi-périodes ignorés

**Problème** : `mapRentConstraints` ne prend que le plan dont `startMonth === 0`.
Si plusieurs plans de loyer sont définis (ex: FIXE jusqu'au mois 12, puis AUTONOMIE_SCI),
seul le premier est transmis au backend.

**Fix nécessite** : que le backend accepte un tableau de `rentConstraints` avec dates de
début, ou que le mapper envoie des appels séquentiels.

### 4. Services non-PAR_M2 ignorés

**Problème** : `mapServices` filtre uniquement `type === "PAR_M2"`. Les services de type
`FIXE` ou `PAR_BOX` ne sont pas transmis au backend.

**Conséquence** : leur revenu est ignoré dans la simulation (mais inclus dans le moteur local front).

**Fix nécessite** : que le backend accepte les services FIXE et PAR_BOX avec leur propre logique
de calcul.

### 5. `deferralType: "PARTIAL"` non supporté

**Problème** : le frontend a un type `"PARTIAL"` pour les différés de dette, mais le backend
n'accepte que `"NONE"`, `"INTEREST_ONLY"`, `"TOTAL"`.

**Comportement actuel** : `"PARTIAL"` est silencieusement converti en `"NONE"`.

### 6. Catégories de distribution non émises par le backend

**Problème** : `projectedByCategory` ne contient aucune des catégories
`SAS_DISTRIBUTION_DIVIDENDS`, `SCI_DISTRIBUTION_DIVIDENDS`,
`SAS_DISTRIBUTION_CCA`, `SCI_DISTRIBUTION_CCA`,
`SAS_DISTRIBUTION_RESERVE`, `SCI_DISTRIBUTION_RESERVE`.

**Conséquence** : la page Projection associés ne peut pas lire les flux
de distribution depuis Railway. Estimation locale calculée côté front
à partir de `cashEnd`/`sciCashEnd`, `bufferMin` et des règles de
`gouvernance.globalRule` (distributableCashRate, allocationOrder,
reserveStrategicRatio, ccaBalance).

**Fix nécessite** : que le backend applique l'`allocationOrder` et émette
les catégories `*_DISTRIBUTION_*` mois par mois.

---

## Champs du ScenarioState transmis / ignorés

| Champ scenario | Transmis au backend ? | Via |
|---|---|---|
| `horizonMonths` | ✅ | `projet.horizonMonths` override |
| `targetOccupancy` | ✅ | baked dans chaque phase par `useBuildScenarioInputs` |
| `indexationCA` | ✅ | `overrides.indexationCA` → `revenueParams.annualIndexationRate` |
| `phaseOverrides.rampUpMonths` | ✅ | baked dans la phase par `useBuildScenarioInputs` |
| `phaseOverrides.rampCurve` | ✅ | baked dans la phase par `useBuildScenarioInputs` |
| `indexationCharges` | ❌ | backend n'a pas de champ dédié — ignoré |
| `indexationAutresRevenusFonciere` | ❌ | backend n'a pas de champ dédié — ignoré |
| `rentPreset` | ❌ | non utilisé dans le mapper (override de `loyerDynamique` non implémenté) |
| `exitHypotheses` | ❌ | non transmis — utilisé uniquement côté front pour calculs de sortie |
| `gestionnaireNetMensuel` | ❌ | non transmis — gestionnaire scenario non implémenté |
