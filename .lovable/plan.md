

# Plan : Restructuration Build en blocs CAPEX événementiels

## Vue d'ensemble

Transformer le module Build d'une structure plate (un seul jeu de budget/actifs/taxe/dépenses) en une collection de **blocs CAPEX** (événements d'investissement). Chaque bloc est un investissement autonome avec ses propres lignes budgétaires, immobilisations, taxe et dépenses. Le premier bloc "CAPEX Initial" est créé automatiquement.

---

## 1. Types (`src/types/project.ts`)

### Nouveau : CapexEvent (bloc)
```typescript
export interface CapexEvent {
  id: string;
  nom: string;                    // "CAPEX Initial", "CAPEX Tranche 2"...
  startMonth: number;
  durationMonths: number;
  budgetLines: CapexBudgetLine[];
  assets: BuildAsset[];
  taxeAmenagement: TaxeAmenagementData;
  depenses: DepenseReelle[];
}
```

### Modifier CapexBudgetLine — ajout HT/TTC
```typescript
export interface CapexBudgetLine {
  id: string;
  label: string;
  category: CapexCategory;
  montant: number;               // was budgetPrevu
  prixType: "HT" | "TTC" | "NON_SOUMIS";
  vatRate: number;               // default 0.20
  commentaire?: string;
}
```
Calcul dérivé côté affichage : si TTC → HT = montant/(1+vatRate), si NON_SOUMIS → HT=montant, vatRate=0.

### Modifier BuildData
```typescript
export interface BuildData {
  capexEvents: CapexEvent[];
}
```
Supprimer les champs plats `startMonth`, `durationMonths`, `budgetLines`, `assets`, `taxeAmenagement`, `depenses` — tout migre dans le premier CapexEvent.

### Helper
```typescript
export function createDefaultCapexEvent(nom?: string): CapexEvent;
```

---

## 2. Migration (`ProjectContext.tsx`)

`migrateBuild` : si `parsed.state.build` contient les anciens champs plats (pas de `capexEvents`), créer un seul `CapexEvent` "CAPEX Initial" avec toutes les données existantes. Migrer `budgetPrevu` → `montant`, ajouter `prixType: "HT"`, `vatRate: 0.20`.

---

## 3. Page (`src/pages/BuildPage.tsx`) — Refonte complète

### Structure globale
- Bouton "Ajouter un bloc CAPEX" en haut
- Liste de blocs, chaque bloc = un `Collapsible` (repliable/dépliable)
- Chaque bloc contient les mêmes 4 sous-sections via des sous-onglets ou cartes empilées :
  1. **Infos** : nom, startMonth, durationMonths (+ dates calendaires)
  2. **Budget CAPEX** : tableau avec colonnes Catégorie | Nom | Montant | HT/TTC/Non soumis | TVA | Montant HT (calculé) | Commentaire + bouton "Créer un actif" par ligne (uniquement si catégorie amortissable)
  3. **Immobilisations** : tableau actifs (inchangé sauf lié au bloc)
  4. **Taxe d'aménagement** : identique à avant, par bloc
  5. **Dépenses réelles** : identique à avant, par bloc

### Logique "Créer un actif depuis un poste budget"
- Bouton visible uniquement si `CAPEX_DEFAULT_DEPRECIATION[category].amortissable === true`
- Pré-remplit : label, catégorie, montant HT, durée par défaut, commissioningMonth = startMonth + durationMonths
- L'utilisateur peut modifier le montant avant confirmation

### Gestion HT/TTC dans le budget
- Select à 3 options : HT / TTC / Non soumis à TVA
- Si HT : montant = HT, affichage direct
- Si TTC : calcul HT = montant / (1 + vatRate), affiché en colonne dérivée
- Si Non soumis : vatRate forcé à 0, HT = montant
- Champ TVA (%) éditable sauf si Non soumis

---

## 4. Engine (`src/engine/engine.ts`)

Adapter les accès à `build` : au lieu de `build.assets`, utiliser `build.capexEvents.flatMap(e => e.assets)`. Idem pour les lignes budgétaires si le moteur les utilise. Vérifier et mettre à jour tous les accès.

---

## 5. Autres fichiers impactés

- `ProjectContext.tsx` : `buildProjectionInputs` — agréger les assets de tous les blocs
- `DashboardPage.tsx` : si référence à `build.startMonth` → prendre le premier bloc
- `FoncierePage.tsx` : si affichage des actifs en lecture seule → agréger depuis tous les blocs

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Nouveau `CapexEvent`, modifier `CapexBudgetLine` (ajout prixType/vatRate/montant), modifier `BuildData` |
| `src/contexts/ProjectContext.tsx` | Migration + mise à jour `buildProjectionInputs` |
| `src/pages/BuildPage.tsx` | Refonte complète — blocs collapsibles |
| `src/engine/engine.ts` | Adapter accès `build.assets` → `build.capexEvents.flatMap(...)` |
| `src/pages/DashboardPage.tsx` | Adapter accès aux données build |
| `src/pages/FoncierePage.tsx` | Adapter accès aux actifs |

