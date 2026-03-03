

# Refonte complète de l'onglet Exploitation

## Résumé

Remplacement total de la structure `ExploitationData` et de la page `ExploitationPage`. Suppression de `opexPercentOfRevenue`, `tauxRemplissage`, et de toute logique en % du CA. Nouvelle structure avec 3 blocs (Box/Capacité, Services, Gestionnaires) + synthèse automatique.

## 1. `src/types/project.ts` — Refonte des types Exploitation

**Supprimer** : `BoxData`, `ServiceItem` (ancien), `ChargeItem`, `GestionnaireData` (ancien), et l'ancien `ExploitationData`.

**Créer** les nouveaux types :

```ts
type BoxMode = "MACRO" | "TYPOLOGIE";

interface Typologie {
  id: string;
  nom: string;
  surfaceParBox: number;
  nombreDeBox: number;
  prixMensuel: number;
  actif: boolean;
}

interface Capacite {
  surfaceMacro: number | null;
  prixM2Macro: number | null;
  typologies: Typologie[];
}

interface ServiceItem {
  id: string;
  nom: string;
  type: "FIXE" | "PAR_BOX" | "PAR_M2";
  montantUnitaire: number;
  actif: boolean;
}

interface GestionnaireParametres {
  ratioNetVersBrut: number;    // 0.78
  tauxChargesPatronales: number; // 0.42
  moisPayes: number;           // 12
}

interface Gestionnaire {
  id: string;
  nom: string;
  actif: boolean;
  dateDebutMois: number;
  netMensuelCible: number;
  tauxActivite: number;
  parametres: GestionnaireParametres;
}

interface ExploitationData {
  modeBox: BoxMode;
  capacite: Capacite;
  services: ServiceItem[];
  gestionnaires: Gestionnaire[];
  phases: Phase[];
}
```

**`DEFAULT_EXPLOITATION`** : modeBox="MACRO", surfaceMacro=500, prixM2Macro=15, typologies=[], services=[], gestionnaires=[], phases=[{1,12,1.0}].

**`ProjectionInputs`** : Supprimer `opexPercentOfRevenue`. Le champ `revenueParams` sera recalculé depuis la nouvelle structure (surface effective + prix m² implicite). `tauxRemplissage` fixé à 1.0 (économie stabilisée).

## 2. `src/contexts/ProjectContext.tsx` — Adapter `buildProjectionInputs()`

Lignes 113-120 : remplacer les accès `e.surface`, `e.prixM2`, `e.tauxRemplissage`, `e.opexPercentOfRevenue` par un calcul depuis la nouvelle structure :
- Si `modeBox === "MACRO"` : surface = `capacite.surfaceMacro`, prixM2 = `capacite.prixM2Macro`
- Si `modeBox === "TYPOLOGIE"` : surface = somme des (surfaceParBox × nombreDeBox) actifs, prixM2 = CA Box / surface
- `tauxRemplissage` = 1.0 (stabilisé)
- Supprimer `opexPercentOfRevenue` du retour

## 3. `src/pages/ExploitationPage.tsx` — Refonte complète UI

Page divisée en 4 blocs dans des Cards séparées :

**Bloc 1 — Box / Capacité** :
- ToggleGroup MACRO / TYPOLOGIE
- Mode MACRO : 2 inputs (surface totale, prix m²), CA Box calculé
- Mode TYPOLOGIE : table dynamique avec bouton "Ajouter une typologie", validation surface ≤ surfaceMacro
- Affichage permanent en lecture seule : surface effective, nb box, CA Box, prix m² implicite

**Bloc 2 — Services** :
- Table dynamique (nom, type select FIXE/PAR_BOX/PAR_M2, montant, actif)
- Bouton "Ajouter un service"
- CA Services calculé automatiquement

**Bloc 3 — Gestionnaires** :
- Table dynamique (nom, actif, mois entrée, net cible, taux activité)
- Paramètres avancés repliables (Collapsible) par gestionnaire
- Calcul brut, charges, coût mensuel affiché par ligne
- Total gestionnaires affiché

**Bloc 4 — Synthèse** :
- Card lecture seule : CA Box, CA Services, CA Total, Coût Gestionnaires, Résultat d'exploitation stabilisé

Bouton "Enregistrer" en bas → `updateSection("exploitation", ...)` + `validateSection("exploitation")`

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Refonte types Exploitation, supprimer anciens types inutilisés |
| `src/contexts/ProjectContext.tsx` | Adapter buildProjectionInputs() |
| `src/pages/ExploitationPage.tsx` | Réécriture complète |

