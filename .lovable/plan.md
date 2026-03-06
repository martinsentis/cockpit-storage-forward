

## Plan : Ajustements wizard — texte occupation cible + création auto financement

### Fichier 1 : `src/components/CapacityPhaseWizard.tsx`

**Étape 2 (lignes 300-307)** — Remplacer le texte explicatif sous le champ "Pourcentage de surface louée cible" :

```tsx
<p className="text-xs text-muted-foreground">
  Moyenne observée sur les phases précédentes (ou 90 % par défaut).
  <br /><br />
  Cette valeur est indicative.
  Le remplissage réel du parc est piloté globalement par les hypothèses de projection.
  <br /><br />
  Dans les projections, la cible de surface louée s'applique à l'ensemble du parc de stockage et non à chaque phase individuellement.
</p>
```

**Étape 6 / Synthèse (après le bloc financement, lignes 504-516)** — Ajouter un encart conditionnel si des lignes de financement DETTE_BANCAIRE ou CREDIT_BAIL existent :

```tsx
{externalFinancingTotal > 0 && (
  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950 p-4 space-y-2">
    <h4 className="font-semibold text-amber-800 dark:text-amber-200">Financement à compléter</h4>
    <p className="text-sm text-amber-700 dark:text-amber-300">
      Cette phase crée un besoin de financement externe de {fmt(externalFinancingTotal)} €.
      Un objet de financement a été créé dans le module Financement avec le statut : <strong>À configurer</strong>.
      Les paramètres du financement (taux, durée, différé, assurance…) devront être complétés dans ce module.
    </p>
  </div>
)}
```

Avec le calcul :
```ts
const externalFinancingTotal = draft.financing
  .filter(f => f.source === "DETTE_BANCAIRE" || f.source === "CREDIT_BAIL")
  .reduce((s, f) => s + f.montant, 0);
```

**Props** — Ajouter `onCreateFinancing` callback :
```ts
onCreateFinancing?: (lines: { phaseId: string; phaseName: string; source: PhaseFinancingSource; montant: number }[]) => void;
```

Appeler `onCreateFinancing` dans `onFinalize` (au moment du clic sur "Créer cette phase capacitaire") — le composant parent gère la création effective.

### Fichier 2 : `src/pages/ExploitationPage.tsx`

**Ligne 1137** — Modifier le callback `onFinalize` pour extraire les lignes DETTE_BANCAIRE/CREDIT_BAIL et les stocker. Ajouter un state temporaire ou passer directement au contexte financement :

```tsx
onFinalize={() => {
  const phase = form.capacityPhases.find(p => p.id === wizardPhaseId)!;
  const externalLines = (phase.draft?.financing ?? [])
    .filter(f => f.source === "DETTE_BANCAIRE" || f.source === "CREDIT_BAIL");
  
  // Create financing objects to configure
  if (externalLines.length > 0) {
    // Store in financement section via context
    const newDebts = externalLines.map(f => ({
      label: `Financement – ${phase.nom}`,
      amount: f.montant,
      annualRate: 0,
      durationMonths: 0,
      deferralMonths: 0,
    }));
    // Add to appropriate debt array in financement
    updateSection("financement", {
      ...financement,
      debts: [...financement.debts, ...newDebts],
    });
  }
  
  updatePhase(wizardPhaseId, { status: "ACTIVE", draft: undefined });
  setWizardPhaseId(null);
  toast.success("Phase créée avec succès");
}}
```

This requires reading the current financement data from context. Add access via `const { financement } = state` or equivalent from `useProject()`.

### Fichier 3 : `src/types/project.ts`

No type changes needed — `DebtItem` already has `label`, `amount`, `annualRate`, `durationMonths`, `deferralMonths` which is sufficient. The "À configurer" status is implicit (rate/duration = 0).

### Summary

| Change | File |
|---|---|
| Replace occupation cible help text | `CapacityPhaseWizard.tsx` step 2 |
| Add external financing info block | `CapacityPhaseWizard.tsx` step 6 |
| Auto-create DebtItem on finalize | `ExploitationPage.tsx` onFinalize |

