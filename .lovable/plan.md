

## Plan : Ajouter un console.log de debug dans mapOperatingCharges

### Modification unique

**Fichier** : `src/engine/mapToProjectionInputs.ts`, ligne 257

Ajouter un `console.log` après la déclaration de `charges` :

```typescript
function mapOperatingCharges(project: any): BackendOperatingCharge[] {
  const charges: any[] = project.exploitation?.charges ?? [];
  console.log("CHARGES SAS:", charges.length, charges);
  const gestionnaires: any[] = project.exploitation?.gestionnaires ?? [];
```

### Étape suivante

Une fois le log en place, je lirai les console logs du preview pour voir ce que le mapper reçoit effectivement comme charges SAS.

### Fichier modifié

1. `src/engine/mapToProjectionInputs.ts` — 1 ligne ajoutée (console.log)

