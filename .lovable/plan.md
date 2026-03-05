

## Plan : Corriger le simulateur waterfall et clarifier le mode Percentage

### Fichier impacté : `src/pages/GouvernancePage.tsx`

---

### Changement 1 — Corriger le calcul waterfall (lignes 89-103)

Le mode `RATIO` applique actuellement le pourcentage sur `cashDistribuable` (montant initial). Il doit s'appliquer sur `remaining` (montant restant à l'étape).

```ts
// Avant (ligne 94)
allocated = Math.min(remaining, cashDistribuable * (step.ratio / 100));

// Après
allocated = remaining * (step.ratio / 100);
```

Le reste de la logique (`UNTIL_TARGET`, `UNTIL_ZERO`) est déjà correct.

### Changement 2 — Stocker le montant "avant" dans le résultat waterfall (ligne 91-102)

Ajouter `remainingBefore` au résultat de chaque step pour pouvoir l'afficher :

```ts
return globalRule.allocationOrder.map((step) => {
  const remainingBefore = remaining;
  let allocated = 0;
  // ... calcul selon mode ...
  remaining = Math.max(0, remaining - allocated);
  return { ...step, allocated, remaining, remainingBefore };
});
```

### Changement 3 — Affichage détaillé de chaque étape waterfall (lignes 217-231)

Remplacer l'affichage actuel par 3 lignes par step :

- **Avant** : `{fmt(step.remainingBefore)} €`
- **Prélèvement** : selon le mode, afficher le détail (ex: `80 % de {remainingBefore} = {allocated} €`)
- **Reste** : `{fmt(step.remaining)} €`

Les barres de progression conservent le calcul `step.allocated / cashDistribuable * 100` (proportion du total initial).

### Changement 4 — Texte d'aide sous le sélecteur de mode (WaterfallEditor, ligne 309)

Après le `</Select>` du mode, ajouter conditionnellement :

```tsx
{step.mode === "RATIO" && (
  <p className="text-xs text-muted-foreground mt-1">
    Le pourcentage s'applique au montant restant au moment de l'étape.
  </p>
)}
```

Placer ce texte sous le bloc `pl-9` (après les inputs de chaque step, vers ligne 335).

### Résumé des modifications

| Zone | Changement |
|---|---|
| Lignes 89-103 | RATIO appliqué sur `remaining` + ajout `remainingBefore` |
| Lignes 217-231 | Affichage Avant / Prélèvement / Reste par step |
| Lignes 309-335 | Texte d'aide sous mode Percentage dans WaterfallEditor |

