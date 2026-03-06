

## Plan : Contrainte de date de début de crédit liée à la phase capacitaire

### Problème
Quand un crédit bancaire est issu d'une phase capacitaire, rien n'empêche l'utilisateur de saisir une date de début postérieure au lancement de l'exploitation. C'est incohérent : le crédit doit être décaissé avant ou au moment du lancement.

### Modifications

#### `src/pages/FinancementPage.tsx`

**1. Passer les données de phases au wizard**

Le `FinancingWizard` reçoit une nouvelle prop `phases: CapacityPhase[]` (provenant de `state.exploitation.capacityPhases`) ainsi que `projectStartDate: string`.

**2. Calculer la date limite**

Si `form.phaseId` existe, retrouver la phase correspondante et convertir `phase.startMonth` en date calendaire "YYYY-MM" à partir de `projectStartDate`. Cette date constitue la borne maximale pour `startDate`.

**3. Afficher un rappel informatif (onglet Général)**

Au-dessus ou en dessous du champ "Date de début", afficher un encart informatif :

```
ℹ️ Phase « {nom} » — Lancement de l'exploitation prévu : {mois année}
   La date de début du crédit ne peut pas être postérieure à cette date.
```

Cet encart n'apparaît que pour les crédits liés à une phase (`phaseId` renseigné).

**4. Bloquer la saisie**

- Ajouter un attribut `max` sur l'`<input type="month">` pour empêcher la sélection d'une date postérieure.
- Si l'utilisateur modifie manuellement et dépasse la limite, afficher un message d'erreur rouge et désactiver le bouton "Créer le crédit" dans l'onglet Résumé.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/FinancementPage.tsx` | Ajout prop `phases` + `projectStartDate` au wizard, calcul date max, encart info, validation |

