

# Diagnostic : Bénéficiaires manquants dans le module Apports

## Problème identifié

Le dropdown "Société bénéficiaire" dans le formulaire d'apport filtre uniquement les `Associe` de type `MORALE` créés manuellement par l'utilisateur. Or, les deux sociétés structurelles du projet -- la **société d'exploitation** et la **société foncière (SCI)** -- n'existent pas en tant qu'entrées `Associe`. Ce sont des concepts implicites dans le modèle actuel (les associés ont des champs `partExploitation` et `partFonciere`, mais il n'y a pas d'entité `Associe` correspondante pour ces deux sociétés).

## Solution proposée

Ajouter deux constantes immuables représentant la société d'exploitation et la SCI foncière, avec des IDs stables et prédéfinis. Ces entités virtuelles seront injectées dans la liste des bénéficiaires éligibles aux côtés des sociétés MORALE créées manuellement.

### Modification dans `src/types/project.ts`

Ajouter deux constantes :

```typescript
export const EXPLOITATION_ENTITY_ID = "__exploitation__";
export const FONCIERE_ENTITY_ID = "__fonciere__";

export const BUILT_IN_SOCIETES: Associe[] = [
  {
    id: EXPLOITATION_ENTITY_ID,
    type: "MORALE",
    nom: "Société d'exploitation",
    societeType: "OPERATIONNELLE",
    partExploitation: 0,
    partFonciere: 0,
    participationsIndirectes: [],
  },
  {
    id: FONCIERE_ENTITY_ID,
    type: "MORALE",
    nom: "Société foncière (SCI)",
    societeType: "SCI",
    partExploitation: 0,
    partFonciere: 0,
    participationsIndirectes: [],
  },
];
```

### Modification dans `src/pages/ApportsPage.tsx`

Modifier `getBeneficiaires()` pour inclure les entités built-in :

```typescript
const societes = [
  ...BUILT_IN_SOCIETES,
  ...associes.filter(a => a.type === "MORALE"),
];
```

Modifier aussi `resolveNom()` pour résoudre ces IDs built-in.

### Modification dans `src/pages/AssociesPage.tsx`

Ajouter la même liste dans les vues ownership et consolidation pour que ces sociétés soient reconnues partout.

---

## Question de conformité moteur

Ces deux entités sont des constantes d'affichage front uniquement -- elles ne créent pas de nouveaux objets métier. L'`ApportItem.beneficiaireId` stockera `"__exploitation__"` ou `"__fonciere__"`, ce qui est un ID conventionnel que le moteur devra reconnaître. **Ceci constitue un nouveau contrat d'identifiant** entre front et moteur.

**Conformément à la règle établie** : ce plan propose ces IDs avant implémentation. Si cette approche est validée, je procède.

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/types/project.ts` | Ajout des 2 constantes built-in |
| `src/pages/ApportsPage.tsx` | Inclusion des built-in dans la liste bénéficiaires |
| `src/pages/GouvernancePage.tsx` | Même inclusion pour les règles par entité |

