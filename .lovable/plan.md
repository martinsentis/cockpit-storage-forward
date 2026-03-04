

# Plan : Refonte du module Build / CAPEX / Investissements

## Vue d'ensemble

Restructurer le module Build existant en 5 sections clairement séparées : informations générales, budget CAPEX (lignes budgétaires auto-sommées), immobilisations (actifs pour le moteur financier), taxe d'aménagement (avec mode auto/manuel), et dépenses réelles (optionnel, suivi chantier). Le front-end collecte les données ; aucun calcul d'amortissement côté front.

---

## 1. Types (`src/types/project.ts`)

### Nouvelles catégories unifiées
```typescript
export type CapexCategory = "TERRAIN" | "VRD" | "EQUIPEMENTS_PRODUCTIFS" | "BATIMENTS" | "HONORAIRES" | "FRAIS_FINANCIERS" | "TAXES_URBANISME" | "DIVERS";
```

### Nouveau type : ligne budgétaire
```typescript
export interface CapexBudgetLine {
  id: string;
  label: string;
  category: CapexCategory;
  budgetPrevu: number;
  commentaire?: string;
}
```

### Actif immobilisé (refonte de `BuildAsset`)
```typescript
export interface BuildAsset {
  id: string;
  label: string;
  category: CapexCategory;
  amount: number;
  amortissable: boolean;
  depreciationYears: number;       // 0 si non amortissable
  commissioningMonth: number;
  commentaire?: string;
}
```
Ajout du champ `amortissable` (booléen). Le front affiche la durée d'amortissement uniquement si `amortissable = true`.

### Taxe d'aménagement (sous-objet)
```typescript
export type TaxePaymentMode = "AUTO" | "MANUEL";

export interface TaxeEcheance {
  id: string;
  monthOffset: number;  // relatif à fin travaux
  montant: number;
}

export interface TaxeAmenagementData {
  montant: number;
  mode: TaxePaymentMode;
  echeances: TaxeEcheance[];  // mode MANUEL
}
```
En mode AUTO : 2 échéances générées (50% à M+3 fin travaux, 50% à M+9).

### Dépense réelle (optionnel)
```typescript
export interface DepenseReelle {
  id: string;
  date: string;          // YYYY-MM
  fournisseur: string;
  posteCapexId?: string;  // ref CapexBudgetLine.id
  montant: number;
  commentaire?: string;
}
```

### BuildData refonte
```typescript
export interface BuildData {
  startMonth: number;
  durationMonths: number;
  budgetLines: CapexBudgetLine[];
  assets: BuildAsset[];
  taxeAmenagement: TaxeAmenagementData;
  depenses: DepenseReelle[];
}
```

Supprimer les anciens champs `capexTotal`, `posteFoncier`, `posteTravaux`, `posteHonoraires`, `posteDivers` (le total est calculé dynamiquement par somme des `budgetLines`).

---

## 2. Migration (`ProjectContext.tsx`)

Fonction `migrateBuild` mise à jour pour convertir l'ancien format :
- Anciens postes → `budgetLines` (une ligne par poste non-zéro)
- Ancien `taxeAmenagement` nombre → objet `TaxeAmenagementData`
- `assets` existants → ajout `amortissable: true` par défaut, `commentaire: ""`
- `depenses: []` par défaut

---

## 3. Page (`src/pages/BuildPage.tsx`) — Refonte complète

5 sections via Tabs :

**Tab 1 — Informations générales**
- Début des travaux (mois) + date calendaire
- Durée des travaux (mois) + date fin

**Tab 2 — Budget CAPEX**
- Tableau CRUD : Nom du poste | Catégorie (select) | Budget prévu | Commentaire
- Ligne totale auto-calculée (somme des budgetLines)
- Bouton "Ajouter un poste"

**Tab 3 — Immobilisations**
- Tableau CRUD existant, enrichi :
  - Catégorie | Libellé | Montant | Amortissable (switch) | Durée amort. (conditionnel) | Mise en service (mois + date) | Commentaire
  - Suggestion de durée par défaut selon catégorie (TERRAIN→non amortissable, VRD→15, EQUIPEMENTS→10, BATIMENTS→30, etc.)
- Note : "Ces données seront utilisées par le moteur financier pour calculer les amortissements."

**Tab 4 — Taxe d'aménagement**
- Montant total
- Mode : Auto / Manuel (radio)
- Auto : affichage lecture seule des 2 échéances (50% à M+3, 50% à M+9 après fin travaux)
- Manuel : tableau éditable des échéances (mois + montant)

**Tab 5 — Dépenses réelles**
- Tableau CRUD : Date | Fournisseur | Poste CAPEX (select optionnel lié aux budgetLines) | Montant | Commentaire
- Résumé en haut : Budget total | Engagé | Reste à dépenser

---

## 4. Engine (`src/engine/engine.ts`)

Aucune modification du moteur. Le moteur utilise déjà `assets` pour les amortissements. Le nouveau champ `amortissable` devra être pris en compte (si `!amortissable`, skip l'amortissement). Cela sera fait dans un second temps si nécessaire — vérifier que le moteur filtre déjà correctement.

---

## 5. Constantes & labels

```typescript
export const CAPEX_CATEGORY_LABELS: Record<CapexCategory, string> = {
  TERRAIN: "Terrain",
  VRD: "Aménagement terrain / VRD",
  EQUIPEMENTS_PRODUCTIFS: "Équipements productifs",
  BATIMENTS: "Bâtiments / Structures",
  HONORAIRES: "Honoraires techniques",
  FRAIS_FINANCIERS: "Frais financiers",
  TAXES_URBANISME: "Taxes d'urbanisme",
  DIVERS: "Divers",
};

export const CAPEX_DEFAULT_DEPRECIATION: Partial<Record<CapexCategory, { amortissable: boolean; years: number }>> = {
  TERRAIN: { amortissable: false, years: 0 },
  VRD: { amortissable: true, years: 15 },
  EQUIPEMENTS_PRODUCTIFS: { amortissable: true, years: 10 },
  BATIMENTS: { amortissable: true, years: 30 },
  HONORAIRES: { amortissable: true, years: 10 },
  FRAIS_FINANCIERS: { amortissable: false, years: 0 },
  TAXES_URBANISME: { amortissable: false, years: 0 },
  DIVERS: { amortissable: true, years: 10 },
};
```

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Refonte `BuildData`, nouveaux types `CapexBudgetLine`, `TaxeAmenagementData`, `DepenseReelle`, nouvelles catégories |
| `src/contexts/ProjectContext.tsx` | Migration ancien format → nouveau |
| `src/pages/BuildPage.tsx` | Refonte complète — 5 tabs |
| `src/engine/engine.ts` | Ajout filtre `amortissable` sur assets (mineur) |

