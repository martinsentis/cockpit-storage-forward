

## Corrections 2, 3 et 4 (sans toucher à taxSchedules)

### Correction 2 — Horizon dynamique

**Fichier** : `src/engine/mapToProjectionInputs.ts`, ligne 415

Le paramètre `horizonMonths` a une valeur par défaut de 60, mais l'appel depuis les hooks ne passe jamais de second argument. La ligne actuelle `horizonMonths ?? project.projet?.horizonMonths ?? 60` ne fonctionne pas car `horizonMonths` vaut toujours 60 (jamais `null`/`undefined`).

Correction : inverser la priorité pour utiliser `project.projet.horizonMonths` en premier, puis le paramètre en fallback.

```typescript
const horizon: number = project.projet?.horizonMonths ?? horizonMonths;
```

### Correction 3 — Propagation des erreurs backend

**Fichier** : `src/hooks/useEngine.ts`, ligne 28

Actuellement `fetchEngine` jette `"Engine API error"` sans inclure le message du backend (ex: `"No tax schedules provided"`). Impossible de diagnostiquer sans ouvrir le Network tab.

Correction : lire le body d'erreur et l'inclure dans le message.

```typescript
if (!res.ok) {
  const errBody = await res.text();
  throw new Error(`Engine API ${res.status}: ${errBody}`);
}
```

Note : `fetchMonthlyResults` (ligne 137-139) fait déjà correctement ce travail — seul `fetchEngine` est à corriger.

### Correction 4 — Réduction des appels redondants

**Fichier** : `src/hooks/useEngine.ts`

Actuellement `useEngine`, `useEngineWithScenario` et `useMonthlyResults` font chacun un POST séparé vers le même endpoint avec des payloads quasi-identiques. Sur la page `/detail-moteur`, cela génère 2+ appels simultanés.

Correction : aligner les `queryKey` pour que les hooks qui produisent le même `inputs` partagent le cache React Query. Concrètement, `useEngineWithScenario` et `useMonthlyResults` construisent le même objet `inputs` — utiliser un `queryKey` commun basé sur `["engine", inputs]` au lieu de `["monthly-results", inputs]` pour `useMonthlyResults`, ou extraire la construction d'inputs dans un hook partagé.

Approche retenue : extraire un `useBuildEngineInputs()` partagé et harmoniser les query keys.

### Fichiers modifiés

1. `src/engine/mapToProjectionInputs.ts` — 1 ligne (horizon)
2. `src/hooks/useEngine.ts` — error handling dans `fetchEngine` + refactoring pour partager les inputs et réduire les appels

