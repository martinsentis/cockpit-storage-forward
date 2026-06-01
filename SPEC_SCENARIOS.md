# Gestionnaire de scénarios — Spécification

Statut : **cadrage validé** (conception, pas encore implémenté)
Dernière mise à jour : 2026-06-01

---

## 1. Objectif

Permettre de **figer des sets de données complets** (scénarios), les **comparer**
entre eux ou au **réel**, et basculer de l'un à l'autre. Un scénario = un jeu
d'hypothèses complet et autonome.

---

## 2. Définitions

- **Scénario** = set de données **complet et autonome** : parc, services, charges,
  hypothèses d'évolution, événements de tréso, calcul du loyer, gouvernance, fiscalité
  + réglages (occupation, indexation, horizon, ramp-up…). Stocké en JSONB (`scenarios.dataset`).
- **Scénario actif** (working) : celui qu'on édite. Un seul par projet.
- **Scénario verrouillé** (`is_locked`) : figé, non éditable (ex : "Budget initial", variante archivée).
- **Réel** : donnée constatée (rapprochement bancaire), **pas un scénario** — rattaché au projet.

> ⚠️ **Vocabulaire** : on standardise sur **« scénario »**. L'ancien code backend parle de
> « version » (`project_versions`, `versioningEngine`, `versionComparisonEngine`…) — même
> concept, à harmoniser vers « scénario ».

---

## 3. Modèle de données (cf. migration 0001 backend)

```
projects   → le centre
scenarios  → N sets autonomes (dataset jsonb), is_active / is_locked
```

Création d'un scénario = **clone d'un existant** ("duplicate then edit"), jamais from scratch.

---

## 4. Briques de calcul existantes (à brancher)

Ces engines existent côté backend mais sont **orphelins** (aucun endpoint) :

| Engine | Rôle |
|---|---|
| `versionComparisonEngine` | comparer 2 sets : baseline vs courant, par entité/catégorie/mois |
| `versionKpiComparisonEngine` | comparer les KPIs (capacité distribution, cash final) |
| `versionIntegrityEngine` | valider un set avant activation |
| `stressScenarioEngine` | appliquer un choc (stress test) sur un set |
| `versioningEngine` | CRUD / lock / clone en base |

→ Le travail = **orchestrer et exposer** ces briques (endpoints), pas les réécrire.

---

## 5. UX

### Comparaison (déjà amorcée dans le header)
Le header des pages de projection a déjà : `[Scénario actif ▾]` + `[Comparer avec ▾]`.
→ Sélectionner un comparé affiche **2 séries** dans chaque onglet (actif vs comparé) + écarts.
Le comparé peut être un autre scénario **ou le réel**.

### Gestion : page dédiée "Scénarios"
Entrée de menu → page type **cartes**, une par scénario, avec actions :
- **Dupliquer** (créer une variante par clone)
- **Figer / verrouiller** (= snapshot, ex "Budget initial")
- **Activer** (devient le working)
- **Renommer**, **Supprimer**

---

## 6. Points ouverts

1. **Stress test** : exposer `stressScenarioEngine` comme une action sur un scénario, ou plus tard ?
2. **Que compare-t-on exactement** dans les onglets en mode comparaison : toutes les séries,
   ou un sous-ensemble de KPIs clés ?
3. **Validation d'intégrité** (`versionIntegrityEngine`) : bloquante à l'activation, ou simple avertissement ?
