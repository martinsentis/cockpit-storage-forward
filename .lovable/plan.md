

## Plan : UX Financement — Synthèse wizard, agrégats et échéancier

### 1. Wizard — Décomposition des mensualités (lignes 255-316)

Modifier le mini tableau d'amortissement dans l'onglet "Résumé" du `FinancingWizard` pour afficher 4 colonnes au lieu de 3 : **Capital**, **Intérêts**, **Assurance**, **Mensualité totale**.

- Période différé : afficher `0 €` ou `Capitalisé` pour capital, intérêts du différé, assurance mensuelle, total
- Période amortissement : capital moyen, intérêts moyens, assurance, mensualité totale moyenne

### 2. Agrégats en haut de page

Ajouter un bloc de KPIs au-dessus de la liste des crédits dans `FinancementPage` :

- **Encours total** : `sum(d.amount)` pour tous les crédits
- **Mensualité totale** : calculée à partir des paramètres de chaque crédit (capital/durée + intérêts moyens + assurance)
- **Intérêts restants estimés** : somme des intérêts totaux estimés sur la durée restante
- **Date de fin** : max des dates de fin calculées (startDate + durationMonths)
- **Nombre de crédits actifs** : `allDebts.filter(d => d.status === "CONFIGURE").length`

Visuellement : 5 cartes en grille horizontale avec icônes et valeurs.

### 3. Cartes crédit enrichies

Remplacer les cartes crédit actuelles (lignes 488-523) par des cartes plus riches :

- **Jauge** du capital restant dû (Progress bar, ratio CRD/montant initial — approximé linéairement si pas de date courante, sinon basé sur mois écoulés)
- **Prochaine mensualité** : calculée (si en différé → mensualité différé, sinon → mensualité pleine)
- **Fin du différé** : si `deferralType !== "NONE"`, afficher la date de fin du différé
- **Mensualité en période pleine** : capital + intérêts moyens + assurance

### 4. Échéancier détaillé par crédit

Ajouter un bouton "Voir l'échéancier" sur chaque carte crédit qui ouvre un `Dialog` avec un tableau mois par mois :

| Mois | Capital amorti | Intérêts | Assurance | Mensualité | CRD |
|------|---------------|----------|-----------|------------|-----|

Calcul autonome (pas de dépendance au moteur) :
- Amortissement linéaire : capital constant = montant / nbMoisAmort
- Intérêts dégressifs : CRD × taux mensuel
- Différé partiel : intérêts seuls + assurance
- Différé total : intérêts capitalisés (CRD augmente)

Extraire une fonction utilitaire `computeAmortizationSchedule(debt: DebtItem)` retournant un tableau de lignes pour réutilisation dans le wizard et l'échéancier.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/lib/amortization.ts` | **Nouveau** — `computeAmortizationSchedule(debt): AmortizationRow[]` |
| `src/pages/FinancementPage.tsx` | Agrégats KPI, cartes enrichies (jauge, mensualité, différé), dialog échéancier, refactor wizard summary pour utiliser la fonction partagée |

