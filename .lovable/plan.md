

## Plan : Réécrire mapOperatingCharges + ajouter log de debug

### Constat

La fonction `mapOperatingCharges` (ligne 256) et le champ `operatingCharges` dans le return (ligne 467) existent déjà et sont correctement branchés. Le problème potentiel est dans la conversion de fréquence : le code actuel utilise `"MENSUELLE"` / `"ANNUELLE"` comme valeurs de fréquence, mais le frontend stocke peut-être `"MONTHLY"` / `"ANNUAL"` / `"QUARTERLY"` / `"SEMI_ANNUAL"`.

### Modifications

**Fichier** : `src/engine/mapToProjectionInputs.ts`

1. **Réécrire `mapOperatingCharges`** (lignes 256-299) avec la version fournie par l'utilisateur :
   - Support des fréquences `QUARTERLY`, `ANNUAL`, `SEMI_ANNUAL`, `MONTHLY` (en plus de `MENSUELLE`/`ANNUELLE`)
   - Utilise `Number()` pour sécuriser les conversions
   - Supprime le filtrage `monthlyHT <= 0` (les charges à 0 seront envoyées, le backend filtre)
   - Conserve la section gestionnaires après le mapping des charges

2. **Ajouter un `console.log`** juste avant le `return` final (ligne 455) :
   ```typescript
   console.log('operatingCharges built:', operatingCharges);
   ```

3. **Mettre à jour `toMonthlyAmount`** (ligne 109) pour supporter les nouvelles fréquences (`QUARTERLY`, `SEMI_ANNUAL`, `ANNUAL`) en plus de `ANNUELLE`.

### Fichier modifié

1. `src/engine/mapToProjectionInputs.ts` — réécriture mapOperatingCharges + log debug

