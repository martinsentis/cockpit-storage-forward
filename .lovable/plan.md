

## Plan : Forcer categoryCode à "SAS_OPEX"

### Modification unique

**Fichier** : `src/engine/mapToProjectionInputs.ts`, ligne 277

Remplacer :
```typescript
categoryCode: charge.categoryCode ?? charge.category ?? "SAS_OPEX",
```
par :
```typescript
categoryCode: "SAS_OPEX",
```

### Fichier modifié

1. `src/engine/mapToProjectionInputs.ts` — 1 ligne modifiée

