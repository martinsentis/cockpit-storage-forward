

# Plan : Modifier les defaults et options du type économique des services

## Changements

### 1. `src/types/project.ts` — Étendre `ServiceCostMode`

Passer de 2 à 3 options :
```ts
export type ServiceCostMode = "PCT_CA_SERVICE" | "PCT_CA_BOXS" | "FIXE";
```

### 2. `src/pages/ExploitationPage.tsx`

**Default typeEco** : Changer `"SANS_COUT"` → `"AVEC_MARGE"` partout (migration `migrateService`, création `addService`, preset).

**Default coutMode** : Changer `"FIXE"` → `"PCT_CA_SERVICE"` partout.

**Select des modes de coût** : Remplacer les 2 options par 3 :
- `PCT_CA_SERVICE` → "% du CA du service" (par défaut)
- `PCT_CA_BOXS` → "% du CA des boxs"
- `FIXE` → "Coût fixe mensuel (€)"

**Calcul `serviceCoutHT`** : Adapter la fonction pour le nouveau mode `PCT_CA_BOXS` (utilise le CA HT agrégé des phases de capacité au lieu du CA du service).

**Label du champ montant** : Adapter dynamiquement — "Ratio (%)" pour les deux modes %, "Montant (€ HT)" pour FIXE.

### 3. Calcul du coût pour `PCT_CA_BOXS`

La fonction `serviceCoutHT` recevra le CA HT total des boxs (déjà calculé dans `derived.caHT`) pour calculer `coutMontant * caBoxsHT` quand le mode est `PCT_CA_BOXS`.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Modifier `ServiceCostMode` (3 valeurs) |
| `src/pages/ExploitationPage.tsx` | Defaults → AVEC_MARGE + PCT_CA_SERVICE, 3 options dans le Select, adapter calcul |

