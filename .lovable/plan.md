

## Bug : la migration localStorage supprime `createdBy` et `startMonth` des dettes

### Cause racine

Dans `src/contexts/ProjectContext.tsx`, la fonction `migrateDebt` (ligne 280-299) reconstruit chaque `DebtItem` avec des champs explicites mais **omet `createdBy` et `startMonth`**. Quand le projet est rechargé depuis localStorage, ces champs disparaissent de toutes les dettes.

Conséquence : le filtre de suppression cascade `d.createdBy === "capacity_phase"` ne matche jamais, car `createdBy` est `undefined` après rechargement.

### Correction

**Fichier unique : `src/contexts/ProjectContext.tsx`**

Ajouter les 2 champs manquants dans `migrateDebt` :

```typescript
createdBy: d.createdBy,
startMonth: d.startMonth,
```

Cela suffit à restaurer le comportement attendu de la cascade delete et du delete+recreate.

