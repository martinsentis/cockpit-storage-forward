

# Plan : Bloc Charges HT/TTC avec fréquence

## Résumé

Ajout d'un bloc Charges structuré dans l'onglet Exploitation, avec gestion HT/TTC, fréquences mensuelle/annuelle, catégories fermées avec presets, et intégration dans la synthèse.

## 1. `src/types/project.ts` — Nouveaux types + modifications

**Ajouter à `ProjetData`** :
- `defaultVatRate: number` (défaut 0.20)
- `displayMode: "HT" | "TTC"` (défaut "HT")

**Nouveau type `ChargeItem`** :
```ts
export type ChargeCategory = "IMMOBILIER" | "ENERGIE" | "SECURITE" | "MARKETING" | "EXPLOITATION" | "ADMINISTRATIF" | "AUTRE";
export type ChargeFrequency = "MENSUELLE" | "ANNUELLE";

export interface ChargeItem {
  id: string;
  entity: "SAS";
  label: string;
  category: ChargeCategory;
  tag?: string;
  type: "FIXE";  // VARIABLE non activé
  frequency: ChargeFrequency;
  amountInput: number;
  amountType: "HT" | "TTC";
  vatRate: number;
  annualMonth: number | null; // obligatoire si ANNUELLE
  startMonth: number;
  endMonth: number | null;
  isActive: boolean;
}
```

**Ajouter à `ExploitationData`** : `charges: ChargeItem[]`

**Mettre à jour `DEFAULT_EXPLOITATION`** : ajouter `charges: []`

**Mettre à jour `DEFAULT_PROJET`** : ajouter `defaultVatRate: 0.20`, `displayMode: "HT"`

## 2. `src/pages/ProjetPage.tsx` — Ajouter les 2 champs projet

- Input `defaultVatRate` (affiché en %)
- Toggle/Select `displayMode` HT / TTC

## 3. `src/pages/ExploitationPage.tsx` — Nouveau bloc Charges

**Constante `CHARGE_PRESETS`** : map catégorie → liste de labels suggérés.

**Bloc Charges** (entre Gestionnaires et Synthèse) :
- Bouton "Ajouter une charge" → ouvre une ligne avec catégorie pré-sélectionnée
- Select catégorie (liste fermée) avec suggestion de presets (boutons rapides par catégorie)
- Champs : label, catégorie, fréquence (MENSUELLE/ANNUELLE), montant, type HT/TTC, taux TVA, mois annuel (si ANNUELLE), mois début, mois fin optionnel, actif
- Calcul dynamique par ligne : monthlyHT et monthlyTTC affichés
- Total charges HT et TTC affiché

**Logique HT/TTC par charge** :
- Si `amountType === "HT"` : monthlyHT = amountInput, monthlyTTC = amountInput × (1 + vatRate)
- Si `amountType === "TTC"` : monthlyHT = amountInput / (1 + vatRate), monthlyTTC = amountInput

**Synthèse mise à jour** :
- Ajout lignes "Total Charges HT" et "Total Charges TTC"
- Résultat = CA Total - Coût Gestionnaires - Total Charges HT
- Affichage respecte `state.projet.displayMode`

## 4. `src/contexts/ProjectContext.tsx` — Défensive init

Ajouter fallback `charges: e?.charges ?? []` dans `loadFromStorage` merge et dans `buildProjectionInputs` si nécessaire.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Ajouter ChargeItem, ChargeCategory, ChargeFrequency, modifier ProjetData, ExploitationData, defaults |
| `src/pages/ProjetPage.tsx` | Ajouter inputs defaultVatRate + displayMode |
| `src/pages/ExploitationPage.tsx` | Ajouter bloc Charges complet + mettre à jour synthèse |
| `src/contexts/ProjectContext.tsx` | Défensive init pour charges |

