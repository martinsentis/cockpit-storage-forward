

# Plan : Refonte fiscale + Module Foncière (SCI) + Loyer Dynamique

## Périmètre

Trois parties distinctes mais interdépendantes. Implémentation progressive recommandée.

---

## PARTIE 1 — Corrections fiscales charges exploitation

### 1a. Charges exploitation (`ExploitationPage.tsx` + `project.ts`)
- **Supprimer** "Taxe foncière" et "Taxe d'aménagement" des presets `CHARGE_PRESETS.IMMOBILIER`
- **Déplacer** "CFE" de `ADMINISTRATIF` vers une position visible (il y est déjà, on le garde)
- **Règle TVA** : si label contient "Taxe foncière", "CFE" ou "Taxe d'aménagement" → forcer `vatRate=0`, `amountType="HT"`, désactiver le sélecteur TVA dans l'UI

### 1b. Build / CAPEX (`BuildPage.tsx` + `BuildData` dans `project.ts`)
- Ajouter champ `taxeAmenagement: number` dans `BuildData`
- Ajouter input correspondant dans `BuildPage`
- Ajouter aussi des champs pour les **catégories d'actifs** (terrain, VRD, clôture/portail, conteneurs, équipements) avec valeur d'acquisition et durée d'amortissement — nécessaire pour la Section 1 du module SCI

### 1c. Types (`project.ts`)
- Nouveau type `BuildAsset` : `{ id, label, category, amount, commissioningMonth, depreciationYears }`
- `BuildData` : ajouter `assets: BuildAsset[]` et `taxeAmenagement: number`

---

## PARTIE 2 — Module Foncière / SCI

### 2a. Types (`project.ts`)
```
SCIChargeItem { id, label, category: "IMMOBILIER"|"ADMINISTRATIF", ... }
SCIRevenueItem { id, nom, montant, prixType, vatRate, frequency, startMonth, endMonth? }
FonciereData { charges: SCIChargeItem[], otherRevenues: SCIRevenueItem[] }
```

Ajouter `fonciere` dans `ProjectState` et `ValidatedFlags`.

### 2b. Page Foncière (`src/pages/FoncierePage.tsx`)
5 sections en accordéon/tabs :

| Section | Source | Éditable |
|---|---|---|
| Actifs immobilisés | `state.build.assets` | Non (bouton → `/build`) |
| Crédits immobiliers | `state.financement.sciDebts` | Non (bouton → `/financement`) |
| Revenus fonciers | Loyer dynamique (lecture) + `fonciere.otherRevenues` (éditable) | Partiel |
| Charges SCI | `fonciere.charges` avec presets (taxe foncière, assurance PNO, etc.) | Oui |
| Synthèse financière | Calcul en temps réel | Non |

**Synthèse** :
```
Revenus fonciers (loyer dynamique + autres)
− Charges SCI
= Résultat d'exploitation SCI
− Intérêts crédits (somme des sciDebts)
= Résultat courant
− Amortissements (somme des assets)
= Résultat fiscal SCI
```

### 2c. Sidebar + Routing
- Ajouter entrée "Foncière" dans `AppSidebar.tsx` (entre Exploitation et Gouvernance)
- Ajouter route `/fonciere` dans `App.tsx`

---

## PARTIE 3 — Module Loyer Dynamique

### 3a. Types (`project.ts`)
```
LoyerDynamiqueData {
  mode: "AUTONOMIE_SCI" | "OPTIMISATION_FISCALE" | "DESENDETTEMENT_SCI" | "MIX"
  targetExploitationResult?: number  // pour mode MIX
  manualOverride?: number
}
```

Ajouter `loyerDynamique` dans `ProjectState`.

### 3b. Page (`src/pages/LoyerDynamiquePage.tsx`)
- Sélection du mode de calcul
- Calcul automatique du loyer mensuel basé sur :
  - **AUTONOMIE_SCI** : loyer = charges SCI + intérêts crédits SCI
  - **DESENDETTEMENT_SCI** : loyer = charges + intérêts + remboursement capital
  - **OPTIMISATION_FISCALE** : loyer maximisé pour absorber les amortissements
  - **MIX** : plafonné pour préserver un résultat minimum en exploitation
- Affichage : loyer mensuel, impact exploitation, impact SCI

### 3c. Intégration croisée
- **ExploitationPage** : ajouter ligne "Loyer SCI" (non éditable, lue depuis le calcul) dans la synthèse
- **FoncierePage** : section Revenus affiche le loyer dynamique calculé

### 3d. Sidebar + Routing
- Entrée "Loyer dynamique" dans sidebar (après Foncière)
- Route `/loyer-dynamique`

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Nouveaux types `BuildAsset`, `SCIChargeItem`, `SCIRevenueItem`, `FonciereData`, `LoyerDynamiqueData` + defaults |
| `src/contexts/ProjectContext.tsx` | Ajouter `fonciere` + `loyerDynamique` dans state, validated, persistence |
| `src/pages/BuildPage.tsx` | Ajouter taxe d'aménagement + tableau d'actifs immobilisés |
| `src/pages/ExploitationPage.tsx` | Nettoyer presets charges, règle TVA=0% pour taxes, ajouter ligne loyer SCI en synthèse |
| `src/pages/FoncierePage.tsx` | **Nouveau** — 5 sections |
| `src/pages/LoyerDynamiquePage.tsx` | **Nouveau** — calcul + affichage |
| `src/pages/GouvernancePage.tsx` | Retirer la section "Contraintes de loyer" (migrée vers Loyer Dynamique) |
| `src/components/AppSidebar.tsx` | 2 nouvelles entrées |
| `src/App.tsx` | 2 nouvelles routes |

---

## Ordre d'implémentation suggéré

1. Types + Context (fondations)
2. Corrections charges exploitation (Partie 1)
3. Build — actifs + taxe d'aménagement
4. Page Foncière (Partie 2)
5. Page Loyer Dynamique (Partie 3)
6. Intégrations croisées (synthèses)

