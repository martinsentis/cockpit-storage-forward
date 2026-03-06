

## Plan : Validation par étape et corrections UX du wizard

### Fichier impacté : `src/components/CapacityPhaseWizard.tsx`

---

### 1. Validation `canGoNext` (lignes 108-111)

Remplacer la logique actuelle par une validation par étape :

```ts
const canGoNext = (): boolean => {
  switch (step) {
    case 0: return !!phase.modeBox; // mode sélectionné
    case 1: // nom + surface + prix
      if (phase.modeBox === "MACRO") return !!phase.nom && phase.surface > 0 && phase.prixM2 > 0;
      return !!phase.nom && phase.typologies.length > 0 && totalSurface > 0;
    case 2: return phase.startMonth > 0 && phase.rampUpMonths > 0;
    case 3: return capex.equipementProductifM2 > 0;
    case 4: return capexTotal > 0 && Math.abs(financingDelta) < 0.01;
    case 5: return true; // aucun champ bloquant
    default: return true;
  }
};
```

### 2. Étape 2 — Ramp-up (lignes 271-301)

**Supprimer** le champ "Taux d'occupation cible" éditable. Le remplacer par un affichage lecture seule :

```tsx
<Label>Pourcentage de surface louée cible</Label>
<div className="rounded-md bg-muted p-3 text-sm font-medium">
  {Math.round(computedTargetOccupancy * 100)} %
</div>
<p className="text-xs text-muted-foreground">
  Moyenne des phases précédentes (ou 90 % par défaut)
</p>
```

Calcul (`computedTargetOccupancy`) :
```ts
const computedTargetOccupancy = existingPhases.length > 0
  ? existingPhases.reduce((s, p) => s + p.targetOccupancy, 0) / existingPhases.length
  : 0.9;
```

Au moment de `goNext` depuis l'étape 2, écrire `targetOccupancy: computedTargetOccupancy` via `onUpdate`.

**Ajouter l'affichage calendaire** du mois d'atteinte cible. Importer `formatMonthIndex` de `@/lib/monthUtils` et afficher sous les champs :

```tsx
{phase.startMonth > 0 && phase.rampUpMonths > 0 && (
  <div className="rounded-md bg-muted p-3 text-sm">
    Atteinte du régime cible :&nbsp;
    <strong>{formatMonthIndex(phase.startMonth + phase.rampUpMonths, projectStartDate)}</strong>
  </div>
)}
```

Ajouter `projectStartDate` aux props utilisées (déjà passé, pas utilisé actuellement — l'ajouter dans la destructuration de Props).

### 3. Étape 3 — CAPEX (lignes 303-337)

**Titre** : changer la description du step en `"Estimez les coûts d'investissement (montants HT)"`.

**Champ "Équipement productif"** : remplacer le label `€/m²` par `Équipement productif (montant HT)`. Le champ reste en €/m², mais l'aide informative sous le champ affiche :

```tsx
<p className="text-xs text-muted-foreground">
  Estimation basée sur la surface productive : {fmt(capex.equipementProductifM2)} €/m² × {fmt(totalSurface)} m² = {fmt(capex.equipementProductifM2 * totalSurface)} € HT
</p>
```

**Labels** des autres champs : ajouter `(HT)` — `Aménagement / travaux (HT)`, `Honoraires (HT)`, `Divers / imprévus (HT)`.

**Taxe d'aménagement** : ajouter une aide informative :
```tsx
<p className="text-xs text-muted-foreground">
  Estimation basée sur la surface : {fmt(totalSurface * 5)} €
</p>
```
(placeholder — coefficient arbitraire, à affiner plus tard).

### 4. Étape 6 — Synthèse (lignes 444-481)

Remplacer `Mois ${phase.startMonth}` par `formatMonthIndex(phase.startMonth, projectStartDate)`.

Remplacer `"Occupation cible"` par `"Surface louée cible"` avec la valeur `computedTargetOccupancy`.

Ajouter une ligne "Atteinte régime cible" avec `formatMonthIndex(phase.startMonth + phase.rampUpMonths, projectStartDate)`.

### 5. Import manquant

Ajouter en haut du fichier :
```ts
import { formatMonthIndex } from "@/lib/monthUtils";
```

Et destructurer `projectStartDate` dans les props du composant.

### Résumé des modifications

| Étape | Changement |
|---|---|
| 0 | Validation : mode obligatoire |
| 1 | Validation : nom + surface + prix obligatoires |
| 2 | Occupation cible → lecture seule (moyenne ou 90 %). Affichage calendaire du mois cible. Validation : startMonth + rampUpMonths obligatoires |
| 3 | Titre HT. Labels HT. Équipement productif obligatoire. Aides informatives sous équipement et taxe |
| 4 | Validation inchangée (financement = CAPEX) |
| 5 | Aucun changement (toujours actif) |
| 6 | Dates calendaires. Label "Surface louée cible" |

