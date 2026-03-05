

## Plan : Tunnel de création de phase capacitaire (avec ajustements)

### 1. Modifications types — `src/types/project.ts`

Ajouter les nouveaux types et étendre `CapacityPhase` :

```ts
export type CapacityPhaseStatus = "DRAFT" | "ACTIVE";

export interface PhaseCapexEstimate {
  equipementProductifM2: number;
  amenagement: number;
  taxeAmenagement: number;
  honoraires: number;
  divers: number;
}

export type PhaseFinancingSource = "TRESORERIE" | "CCA" | "CAPITAL" | "DETTE_BANCAIRE" | "CREDIT_BAIL";

export interface PhaseFinancingLine {
  id: string;
  source: PhaseFinancingSource;
  montant: number;
  percent?: number;
}

export interface PhaseDraft {
  currentStep: number;
  capexEstimate: PhaseCapexEstimate;
  financing: PhaseFinancingLine[];
  entityPorteuse: "SCI" | "EXPLOITATION";
  amortissable: boolean;
  dureeAmortissement: number;
}
```

Ajouter à `CapacityPhase` :
```ts
status: CapacityPhaseStatus;  // "DRAFT" | "ACTIVE"
draft?: PhaseDraft;
```

Mettre à jour `createDefaultPhase` pour inclure `status: "ACTIVE"` par défaut (rétrocompatibilité).

### 2. Nouveau fichier — `src/components/CapacityPhaseWizard.tsx`

Composant Dialog en 7 étapes. Props :
- `phase: CapacityPhase`
- `existingPhases: CapacityPhase[]` (phases actives, pour pré-remplissage)
- `onUpdate: (patch: Partial<CapacityPhase>) => void`
- `onFinalize: () => void`
- `onClose: () => void`
- `defaultVatRate`, `projectStartDate`

**State interne** : `step` (0-6), initialisé depuis `phase.draft?.currentStep ?? 0`.

**Sauvegarde** : toutes les modifications de champs passent par un `debouncedUpdate` (300ms) via un `useRef`+`setTimeout` pattern (pas de dépendance externe). `currentStep` est mis à jour uniquement lors de Suivant/Précédent (appel direct `onUpdate`, pas debounced).

**Étapes** :

| # | Titre | Contenu |
|---|---|---|
| 0 | Mode de création | 2 cartes : Macro / Typologie → écrit `modeBox` |
| 1 | Paramétrage capacitaire | Macro : surface + prix/m² (pré-rempli si phases existantes). Typologie : table avec pré-remplissage |
| 2 | Ramp-up | startMonth, targetOccupancy, rampUpMonths, rampCurve — aucune valeur par défaut |
| 3 | CAPEX estimatif | 5 champs dans `draft.capexEstimate`. Équipement productif en €/m² × surface totale (même en mode typologie). Total auto-calculé |
| 4 | Financement CAPEX | Table source/montant/%. Validation : somme = CAPEX total. Messages "Reste à financer" / "Surfinancement". Bouton Suivant désactivé si déséquilibre. Encart trésorerie placeholder |
| 5 | Traitement comptable | entityPorteuse (SCI/Exploitation), amortissable (oui/non), durée |
| 6 | Synthèse | Résumé lecture seule + bouton "Créer cette phase capacitaire" → `onFinalize` |

**Navigation** : Précédent / Suivant en bas. Indicateur de progression (étape X/7).

### 3. Modifications — `src/pages/ExploitationPage.tsx`

**State** : ajouter `wizardPhaseId: string | null`.

**Bouton "Ajouter une phase"** : crée une phase avec `status: "DRAFT"`, `draft` initialisé (currentStep: 0, capexEstimate à zéros, financing: [], entityPorteuse: "SCI", amortissable: true, dureeAmortissement: 10), puis ouvre le wizard.

**Liste des phases** : dans l'`AccordionTrigger`, si `phase.status === "DRAFT"` :
- Badge orange "Brouillon"
- Texte "Étape X/7"
- Clic ouvre le wizard au lieu de l'accordion content

**Finalisation** (`onFinalize`) : `updatePhase(id, { status: "ACTIVE", draft: undefined })`.

**Rendu du wizard** :
```tsx
{wizardPhaseId && (
  <CapacityPhaseWizard
    phase={form.capacityPhases.find(p => p.id === wizardPhaseId)!}
    existingPhases={form.capacityPhases.filter(p => p.status === "ACTIVE")}
    onUpdate={(patch) => updatePhase(wizardPhaseId, patch)}
    onFinalize={() => { updatePhase(wizardPhaseId, { status: "ACTIVE", draft: undefined }); setWizardPhaseId(null); }}
    onClose={() => setWizardPhaseId(null)}
    defaultVatRate={defaultVatRate}
    projectStartDate={projectStartDate}
  />
)}
```

### 4. Rétrocompatibilité

Dans l'initialisation de `form` dans `ExploitationPage`, ajouter `status: phase.status ?? "ACTIVE"` pour les phases existantes qui n'ont pas encore le champ.

### Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Ajouter types + `status`/`draft` sur `CapacityPhase` |
| `src/components/CapacityPhaseWizard.tsx` | Créer (wizard 7 étapes) |
| `src/pages/ExploitationPage.tsx` | Intégrer wizard + gestion brouillons |

