# Module Rapprochement bancaire — Spécification

Statut : **cadrage validé** (conception, pas encore implémenté)
Dernière mise à jour : 2026-06-01

---

## 1. Objectif

Importer les extracts bancaires de la société d'exploitation, pré-catégoriser
automatiquement les lignes selon les **charges/revenus déjà configurés dans le cockpit**,
faire valider l'affectation par l'utilisateur, produire une **synthèse d'exploitation
réelle mois par mois**, et permettre — manuellement — d'ajuster les hypothèses de projection.

---

## 2. Périmètre (V1)

- **SAS exploitation seule** (pas la SCI)
- Source : extract bancaire Excel/CSV
- Pas d'auto-modification des hypothèses : tout ajustement est manuel
- Pas de versioning des charges : édition simple + 1 snapshot "budget initial"

---

## 3. Flux utilisateur

1. **Import** d'un extract bancaire
2. **Pré-catégorisation auto** par signature de libellé → label de charge/revenu du cockpit
3. **Validation** humaine, par mois (récurrent auto, ponctuel à confirmer, exclu à valider)
4. **Synthèse réelle** de l'exploitation, mois par mois, en HT
5. **Comparaison** au snapshot "budget initial" + ajustement manuel optionnel des hypothèses

---

## 4. Format de l'extract (banque AlloBox observée)

- **11 lignes d'en-tête** à ignorer (société, n° compte, solde, période)
- Colonnes : `Date | Libellé | Débit euros | Crédit euros`
- Montants **positifs**, en deux colonnes séparées (débit OU crédit), pas de signe
- Libellés multi-lignes (`\n`) à normaliser
- Période d'un extract = souvent partielle (mois non pleins) → la synthèse mensuelle doit le gérer

---

## 5. Modèle de données — ligne bancaire importée

```
BankLine {
  id: string                  // identifiant interne
  importId: string            // lot d'import d'origine
  date: string                // YYYY-MM-DD (date d'opération)
  monthIndex: number          // mois de rattachement (= date d'opération en V1)
  rawLabel: string            // libellé brut d'origine
  signature: string           // libellé normalisé (IDs/dates/réfs retirés) — clé de matching
  amountTTC: number           // montant signé (crédit + / débit −), vérité bancaire
  amountHT: number            // dérivé via le taux TVA (du label, ou défaut catégorie)
  targetType: "LABEL" | "CATEGORY" | null  // niveau de rattachement
  targetId: string|null       // id du label OU code de la catégorie cockpit affecté(e)
  classification: "RECURRENT" | "PONCTUEL" | "EXCLU"
  status: "SUGGESTED" | "CONFIRMED"   // pré-catégo vs validé par l'utilisateur
  occurrenceKey: string       // date+montant+signature+rang → déduplication
}
```

**Déduplication** : la clé inclut un **rang d'occurrence** car des lignes strictement
identiques existent légitimement le même jour (ex : plusieurs "Frais de rejet 9,80 €").

---

## 6. CA Box (agrégat mensuel)

Le CA Box réel n'est jamais une ligne unique : il est éclaté sur plusieurs canaux.

**CA Box net du mois = Σ encaissements − Σ impayés**, avec :

| Canal d'encaissement | Signature |
|---|---|
| Prélèvement groupé | `AVIS DE PRELEVEMENT EMIS PREL ECH` |
| Carte bancaire | `REMISE CARTE` |
| Plateforme costockage | `VIREMENT … Mangopay … costockage` |
| Stripe | `VIREMENT … STRIPE` |
| Virement client direct | ex. `VIR … DECOTTIGNIES` |
| **Impayés (à déduire)** | `IMPAYE PREL …` |

→ Les **impayés sont déduits mais restent visibles** (suivi du taux de recouvrement ;
certains clients sont chroniquement en impayé).

---

## 7. Règles de catégorisation — signature → label OU catégorie

La cible du rattachement se fait à **deux niveaux** :
- **Label précis** (Assurance des box, Buxida…) — porte catégorie + HT/TTC + TVA. Cible privilégiée des **récurrents**.
- **Catégorie générique** (Administratif, Marketing…) — quand aucun label ne correspond. Cible des **ponctuels**, sans créer de label.

La **synthèse agrège aux deux niveaux** : macro par catégorie, détail par label.
Matching sur **signature stable**, pas sur le libellé brut (les IDs de transaction varient).

| Signature bancaire | → Label preset cockpit | Catégorie | HT/TTC |
|---|---|---|---|
| `AXA …CONTRAT…063704` (≈ 344 €) | Assurance des box | Administratif | TTC 20 % |
| `AXA …CONTRAT…457504` (≈ 114 €, véhicule) | Assurance activité stockage | Administratif | TTC 20 % |
| `UBICX` / `BUXIDA` | Outil de gestion ERP | Exploitation | TTC 20 % |
| `SCM Local SASU` | Abonnement Leboncoin | Marketing | TTC 20 % |
| `HelloCSE` / `SYLARELE` | Abonnement plateforme diffusion | Marketing | TTC 20 % |
| `Google` (ADS) | Google Ads | Marketing | TTC 20 % |
| `Up2Pay` / `Location équipement de paiement` | Logiciel paiement | Exploitation | TTC 20 % |
| `COTISATION`, `COMMISSION CARTE`, `Frais de rejet/émission`, `EDIWEB` | Frais bancaires | Administratif | TTC 20 % |
| *(compta, si signature observée)* | Frais comptables | Administratif | HT 20 % |
| `DEPENSES CARTE X9467` (variable, hétérogène) | **ponctuel à ventiler** (pas de label fixe) | — | — |
| Encaissements box (cf. §6) | CA Box | revenu | — |
| `IMPAYE PREL` | CA Box (−) | revenu | — |

**Signature stable** : pour AXA, identifier la police par le **n° de contrat**
(`…063704` ≈ 344 € = Assurance des box ; `…457504` ≈ 114 € = véhicule → Assurance activité stockage),
pas par l'ID de transaction qui change à chaque prélèvement.

**Catalogue des presets cockpit** (cibles de rattachement possibles) :
- *Immobilier* : Entretien bâtiment, Entretien espaces verts, Maintenance portail
- *Sécurité* : Vidéosurveillance, Alarme, Maintenance sécurité
- *Marketing* : Abonnement Leboncoin, Abonnement plateforme diffusion, Google Ads, SEO/agence, Hébergement site web, Maintenance site web, Outil création site, Signalétique
- *Exploitation* : Outil de gestion ERP, Logiciel paiement, Maintenance containers, Ménage, Fournitures
- *Administratif* : Frais bancaires, Frais comptables, Assurance activité stockage, Assurance des box, CFE, Honoraires juridiques

### Toujours EXCLU (hors exploitation)
`REMBOURSEMENT DE PRET`, `REALISATION DE PRET`, `DGFIP TVA`, `WEB SCI CANDIE` (loyer SCI),
`VIR … CSB`, virements fournisseurs travaux (`STGC`, `BELPRO`, `THIRARD`, `COLOR PUB`,
`BRUNET`, containers, portail, cadenas), `ASSU. CAAE PRET` (assurance emprunteur).

> Le **loyer SCI est toujours exclu** — y compris quand il apparaît sous un libellé
> de charge. Validation manuelle requise pour les exclusions.

---

## 8. Récurrent / Ponctuel / Exclu

| Classe | Détection | Rattachement | Traitement | Rôle |
|---|---|---|---|---|
| **Récurrent** | signature vue à intervalle régulier (≥ 2 mois) | **label précis** | catégorisé **auto** | challenge les hypothèses |
| **Ponctuel** | signature isolée | **catégorie générique** (ou label si évident) | **demande** : "exceptionnel du mois" OU rattacher | compte dans le réel, pas dans le futur |
| **Exclu** | signature de la liste §7 | — | proposé exclu, **validation manuelle** | invisible des deux côtés |

**Règle ferme** : ne **jamais créer** de nouveau label/catégorie depuis le rapprochement.
On rattache toujours à l'existant (un label "fourre-tout" tient le rôle de divers si besoin).

**Apprentissage — mémoire de signatures persistante** : une signature validée une fois
(ex : `AXA …063704 → Assurance des box`) est **retenue définitivement**. À chaque nouvel
import, toute ligne dont la signature est déjà connue est **pré-catégorisée automatiquement**
(statut SUGGESTED rempli) ; seules les **signatures inédites** sont présentées à classer.
La connaissance s'accumule au lieu d'être recalculée → neutralise le problème de
l'historique court (un extract d'1 mois suffit dès lors que les signatures sont connues).

Les règles restent **déterministes par signature**, pas un apprentissage statistique des
montants/choix passés (le fichier de référence contient des erreurs humaines — loyer SCI
tantôt exclu tantôt en charge, loyers box classés en frais bancaires, etc. : à ne pas apprendre).

---

## 9. HT/TTC — résolu par le label

Le réel bancaire est en **TTC**. La synthèse d'exploitation (EBE) est en **HT**.

- Rattachement à un **label** → conversion via le **taux TVA du label** : `amountHT = amountTTC / (1 + tvaDuLabel)`
- Rattachement à une **catégorie** (sans label) → **taux TVA par défaut** (20 % proposé, modifiable sur la ligne)
- On **stocke le TTC** (vérité bancaire) **et on dérive le HT** (pour l'EBE).
- Les lignes de **TVA elles-mêmes** (`DGFIP`) sont **exclues** pour éviter le double comptage.

---

## 10. Hypothèses & comparaison

- **Pas d'auto-update.** Le module *propose* des écarts, l'utilisateur ajuste à la main.
- **Snapshot "budget initial"** : 1 photo figée (mécanisme `compareWith: "snapshot"` déjà
  présent dans `ScenarioState`), pas de versioning continu.
- Le **réel ancre le passé** ; on ne reprojette que le futur lors d'un ajustement.

---

## 11. Points encore ouverts

1. **`DEPENSES CARTE X9467`** : montant variable, achats hétérogènes → traité en
   **ponctuel à ventiler** à chaque import (pas de label fixe). À confirmer.
2. **`CFE`** (500 €/mois dans le cockpit) : typiquement une taxe **annuelle** (souvent
   décembre), pas mensuelle → vérifier la périodicité réelle et sa signature bancaire.

### Résolu
- Apprentissage récurrence → **mémoire de signatures persistante** (cf. §8) ✓
- HelloCSE → Abonnement plateforme diffusion ✓
- Buxida → Outil de gestion ERP ✓ • Compta → Frais comptables ✓
- AXA 344 € → Assurance des box ✓ • AXA 114 € (véhicule) → Assurance activité stockage ✓

---

## 12. Limitations connues (assumées en V1)

- Pas de SCI (périmètre V1)
- Date de rattachement = date d'opération bancaire (pas la période comptable)
- Détection de récurrence fiable seulement avec plusieurs mois d'historique
- CA Box en agrégat mensuel (pas de suivi client par client, hors impayés)
