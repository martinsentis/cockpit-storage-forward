

## Plan : Ajouter la flat tax dividendes dans Fiscalité

### Modifications

**1. `src/types/project.ts`** — Ajouter `dividendFlatTaxRate` à `FiscaliteData` :
```typescript
export interface FiscaliteData {
  corporateTaxRate: number;
  dividendFlatTaxRate: number; // e.g. 0.30
}
export const DEFAULT_FISCALITE: FiscaliteData = {
  corporateTaxRate: 0.25,
  dividendFlatTaxRate: 0.30,
};
```

**2. `src/pages/FiscalitePage.tsx`** — Ajouter un second bloc de saisie pour la flat tax dividendes, avec :
- Label : "Flat tax sur les dividendes (%)"
- Valeur par défaut : 30 %
- Explication : "Taux appliqué lors du versement de dividendes à un associé personne physique, pour obtenir le montant net d'impôt."
- Même pattern input que le champ IS existant (saisie en %, stockage en décimal)

**Note** : Le champ `dividendFlatTaxRate` existe déjà dans `GlobalGouvernanceRule` et `EntityGouvernanceRule`. Le centraliser dans `FiscaliteData` est plus cohérent. La migration de la gouvernance vers ce champ centralisé pourra être faite ultérieurement.

