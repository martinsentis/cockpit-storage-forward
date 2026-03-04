

# Plan : Refonte du bloc Services (Exploitation)

## Résumé

Enrichir le type `ServiceItem`, ajouter des presets de création rapide, intégrer coûts/marges, dimension temporelle avec dates calendaires, et une synthèse en bas du bloc.

## 1. `src/types/project.ts` — Étendre `ServiceItem`

```ts
export interface ServiceItem {
  id: string;
  nom: string;
  type: "FIXE" | "PAR_BOX" | "PAR_M2";
  montantUnitaire: number;
  prixType: "HT" | "TTC";
  vatRate: number;
  actif: boolean;
  // Type économique
  typeEco: "AVEC_MARGE" | "SANS_COUT";
  // Coût associé (si AVEC_MARGE)
  coutMode: "FIXE" | "VARIABLE"; // fixe mensuel ou % du CA
  coutMontant: number; // € si FIXE, ratio 0-1 si VARIABLE
  // Temporalité
  activeFromStart: boolean;
  startMonth: number;
  hasEndMonth: boolean;
  endMonth: number | null;
}
```

Mettre à jour `addService` pour préremplir les nouveaux champs avec des valeurs par défaut (prixType héritant de `displayMode`, vatRate du `defaultVatRate`, typeEco: "SANS_COUT", activeFromStart: true, etc.).

## 2. `src/pages/ExploitationPage.tsx` — Refonte UI Services

### Presets de création rapide
Remplacer le bouton unique "Ajouter un service" par un groupe de boutons :
- "Assurance additionnelle client"
- "Vente de cartons et accessoires"
- "Service de déménagement"
- "Autre service" (crée un service vide nommé "Nouveau service")
- "Service personnalisé" (idem)

Chaque preset appelle `addService(presetName)`.

### Formulaire par service (remplacer le tableau par des cartes)
Pour chaque service, afficher une carte dépliable ou inline avec :
1. **En-tête** : nom (éditable) + switch actif/inactif + bouton supprimer
2. **Revenu** : type (Fixe/Par box/Par m²), montant, sélecteur HT/TTC, taux TVA → affichage automatique revenu HT et TTC
3. **Type économique** : radio "Service avec marge" / "Service sans coût"
4. **Coût associé** (conditionnel si AVEC_MARGE) : mode (Fixe mensuel / % du CA), montant
5. **Temporalité** : checkbox "Actif dès le début", sinon input startMonth + annotation calendaire. Checkbox "Date de fin", sinon input endMonth + annotation.
6. **Résumé ligne** : CA HT, Coût HT, Marge brute, Marge %

### Synthèse en bas
Bloc récapitulatif : Total CA services HT, Total coûts HT, Total marge brute, Total marge %.

## 3. Calculs dérivés (dans le composant)

```
revenuHT = prixType === "HT" ? montantUnitaire : montantUnitaire / (1 + vatRate)
revenuTTC = prixType === "TTC" ? montantUnitaire : montantUnitaire * (1 + vatRate)
coutHT = typeEco === "SANS_COUT" ? 0 : (coutMode === "FIXE" ? coutMontant : revenuHT * coutMontant)
margeBrute = revenuHT - coutHT
margePct = revenuHT > 0 ? margeBrute / revenuHT : 0
```

## 4. Migration

Dans `ExploitationPage`, au chargement du formulaire, appliquer des fallbacks pour les anciens `ServiceItem` qui n'ont pas les nouveaux champs (prixType → "HT", vatRate → defaultVatRate, typeEco → "SANS_COUT", activeFromStart → true, etc.).

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Étendre `ServiceItem` avec 8 nouveaux champs |
| `src/pages/ExploitationPage.tsx` | Refonte complète du bloc Services (presets, cartes, coûts, temporalité, synthèse) |

