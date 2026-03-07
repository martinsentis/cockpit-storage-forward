

## Plan : Robustesse du tunnel capacitaire — ajustements finaux

### 1. `src/types/project.ts` — Ajouter `startMonth` sur `DebtItem` et `ApportItem`

`DebtItem` : ajouter `startMonth?: number` (en plus de `startDate` existant).
`ApportItem` : ajouter `startMonth?: number`.

`BuildAsset` a déjà `phaseId`, `createdBy`, et `commissioningMonth` (équivalent de startMonth). Rien à ajouter.

### 2. `src/pages/ExploitationPage.tsx` — 3 changements

**a) Propager `startMonth` aux dettes et apports créés**

Dans `onFinalize`, ajouter `startMonth: phaseData.startMonth` sur chaque `DebtItem` et `ApportItem` générés.

**b) Modification = delete + recreate (filtre double condition)**

Avant de générer les nouveaux objets, filtrer les collections existantes pour retirer les objets où `phaseId === phaseData.id && createdBy === "capacity_phase"` :

```typescript
const cleanDebts = state.financement.debts.filter(d => !(d.phaseId === phaseData.id && d.createdBy === "capacity_phase"));
const cleanSciDebts = state.financement.sciDebts.filter(d => !(d.phaseId === phaseData.id && d.createdBy === "capacity_phase"));
const cleanApports = state.apports.apports.filter(a => !(a.phaseId === phaseData.id && a.createdBy === "capacity_phase"));
const cleanCapex = state.build.capexEvents.filter(ev => !(ev.phaseId === phaseData.id && ev.createdBy === "capacity_phase"));
```

Puis utiliser ces listes nettoyées comme base pour les batchUpdates (au lieu de `state.financement.debts` directement). Cela rend la logique idempotente : création initiale et modification utilisent le même code.

**c) Cascade delete : filtre double condition aussi**

Dans `confirmCascadeDelete`, remplacer `d.phaseId !== id` par `!(d.phaseId === id && d.createdBy === "capacity_phase")`. Idem pour apports et capexEvents.

### 3. `src/pages/FinancementPage.tsx` — Détachement automatique étendu

Dans `handleSave`, détecter si l'item a `createdBy === "capacity_phase"` et si un champ significatif a changé. Ajouter `deferralType` et `deferralMonths` à la liste des champs déclencheurs (en plus de `amount`, `annualRate`, `durationMonths`, `entityId`).

Si modification détectée : mettre `phaseId: undefined` et `createdBy: "manual"` sur l'item avant sauvegarde.

Implémentation : comparer l'item entrant avec l'item original trouvé dans `allDebts` :

```typescript
const original = allDebts.find(d => d.id === item.id);
if (original?.createdBy === "capacity_phase") {
  const detachFields: (keyof DebtItem)[] = ["amount", "annualRate", "durationMonths", "entityId", "deferralType", "deferralMonths"];
  const changed = detachFields.some(k => original[k] !== item[k]);
  if (changed) {
    item = { ...item, phaseId: undefined, createdBy: "manual" };
  }
}
```

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/types/project.ts` | `startMonth?: number` sur `DebtItem` et `ApportItem` |
| `src/pages/ExploitationPage.tsx` | Propager `startMonth` ; delete+recreate avec double filtre ; cascade avec double filtre |
| `src/pages/FinancementPage.tsx` | Détachement auto étendu (+ deferralType/deferralMonths) |

