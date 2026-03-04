

# Plan : Refonte du bloc Gestionnaire

## Constat

Le bloc actuel utilise un modèle unique basé sur un calcul net→brut+charges patronales, sans distinction prestataire/salarié, sans gestion HT/TTC pour les prestataires, et sans date de fin optionnelle.

## 1. `src/types/project.ts` — Refondre `Gestionnaire`

```ts
export type GestionnaireType = "PRESTATAIRE" | "SALARIE";

export interface Gestionnaire {
  id: string;
  nom: string;
  type: GestionnaireType;
  actif: boolean;
  // Prestataire
  facturationMensuelle: number;
  prixType: "HT" | "TTC";
  vatRate: number;
  // Salarié
  salaireBrut: number;
  tauxChargesPatronales: number;
  // Temporalité
  activeFromStart: boolean;
  startMonth: number;
  hasEndMonth: boolean;
  endMonth: number | null;
}
```

Supprimer `GestionnaireParametres` (ratioNetVersBrut, moisPayes, tauxActivite — remplacés par le nouveau modèle). Mettre à jour `DEFAULT_GESTIONNAIRE_PARAMS` ou le supprimer.

## 2. `src/pages/ExploitationPage.tsx` — Refonte UI

### Calcul du coût mensuel HT
- **Prestataire** : `toHT(facturationMensuelle, prixType, vatRate)`
- **Salarié** : `salaireBrut * (1 + tauxChargesPatronales)`

### Migration des anciens gestionnaires
Fonction `migrateGestionnaire` : si un gestionnaire n'a pas le champ `type`, le convertir en `SALARIE` avec les anciens champs mappés.

### UI par gestionnaire (carte dépliable)
1. **En-tête** : checkbox actif + nom (éditable) + type (Select: Prestataire/Salarié) + coût mensuel HT + supprimer
2. **Corps conditionnel** :
   - Si **Prestataire** : facturation mensuelle, sélecteur HT/TTC, taux TVA, affichage montant HT calculé
   - Si **Salarié** : salaire brut, taux charges patronales (défaut 42%), affichage coût employeur calculé
3. **Temporalité** : checkbox "Actif dès le début", sinon input startMonth + annotation calendaire. Checkbox "Date de fin", sinon input endMonth + annotation.

### Synthèse
- Nombre de gestionnaires actifs
- Coût mensuel total HT
- Coût annuel total HT (× 12)

### Mise à jour du `derived`
Adapter le calcul de `coutGestionnaires` pour utiliser le nouveau modèle (prestataire vs salarié).

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Refondre `Gestionnaire`, supprimer `GestionnaireParametres` |
| `src/pages/ExploitationPage.tsx` | Refonte UI gestionnaires, migration, synthèse enrichie |

