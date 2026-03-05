import { useState, useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import type { ApportItem, ApportType, ApportStatut, Associe } from "@/types/project";
import { APPORT_TYPE_LABELS, APPORT_STATUT_LABELS, BUILT_IN_SOCIETES, EXPLOITATION_ENTITY_ID, FONCIERE_ENTITY_ID } from "@/types/project";
import { computeEconomicOwnership } from "@/lib/ownershipGraph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Trash2, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function ApportsPage() {
  const { state, updateSection, validateSection, validated } = useProject();
  const apports = state.apports.apports;
  const associes = state.associes.associes;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [formApporteurId, setFormApporteurId] = useState("");
  const [formBeneficiaireId, setFormBeneficiaireId] = useState("");
  const [formType, setFormType] = useState<ApportType>("CAPITAL");
  const [formMontant, setFormMontant] = useState(0);
  const [formDate, setFormDate] = useState("");
  const [formStatut, setFormStatut] = useState<ApportStatut>("PREVU");
  const [formCommentaire, setFormCommentaire] = useState("");

  // All entities: sociétés (morales) are potential beneficiaires (built-in + user-created)
  const societes = [...BUILT_IN_SOCIETES, ...associes.filter(a => a.type === "MORALE")];

  // Ownership for consolidation
  const ownership = useMemo(() => computeEconomicOwnership(associes), [associes]);

  function resolveNom(id: string): string {
    // Check built-in entities first
    const builtIn = BUILT_IN_SOCIETES.find(x => x.id === id);
    if (builtIn) return builtIn.nom;
    const a = associes.find(x => x.id === id);
    if (!a) return "Inconnu";
    return a.type === "PHYSIQUE" ? `${a.prenom ? a.prenom + " " : ""}${a.nom}` : a.nom;
  }

  // Get valid apporteurs: all associes + built-in sociétés
  // But société → personne is forbidden, so we validate in save
  function getApporteurs(): Associe[] {
    return [...BUILT_IN_SOCIETES, ...associes];
  }

  // Get valid beneficiaires: only sociétés (personnes morales)
  function getBeneficiaires(): Associe[] {
    return societes;
  }

  // Validate: société → personne is forbidden
  function isValidFlow(apporteurId: string, beneficiaireId: string): boolean {
    const apporteur = [...BUILT_IN_SOCIETES, ...associes].find(a => a.id === apporteurId);
    const beneficiaire = [...BUILT_IN_SOCIETES, ...associes].find(a => a.id === beneficiaireId);
    if (!apporteur || !beneficiaire) return false;
    // société → personne is forbidden
    if (beneficiaire.type === "PHYSIQUE") return false;
    return true;
  }

  function openCreate() {
    setEditId(null);
    setFormApporteurId(associes[0]?.id ?? "");
    setFormBeneficiaireId(societes[0]?.id ?? "");
    setFormType("CAPITAL");
    setFormMontant(0);
    setFormDate("");
    setFormStatut("PREVU");
    setFormCommentaire("");
    setDialogOpen(true);
  }

  function openEdit(item: ApportItem) {
    setEditId(item.id);
    setFormApporteurId(item.apporteurId);
    setFormBeneficiaireId(item.beneficiaireId);
    setFormType(item.type);
    setFormMontant(item.montant);
    setFormDate(item.date);
    setFormStatut(item.statut);
    setFormCommentaire(item.commentaire ?? "");
    setDialogOpen(true);
  }

  function save() {
    if (!isValidFlow(formApporteurId, formBeneficiaireId)) return;
    const entry: ApportItem = {
      id: editId ?? crypto.randomUUID(),
      apporteurId: formApporteurId,
      beneficiaireId: formBeneficiaireId,
      type: formType,
      montant: formMontant,
      date: formDate,
      statut: formStatut,
      commentaire: formCommentaire.trim() || undefined,
    };
    const updated = editId
      ? apports.map(a => a.id === editId ? entry : a)
      : [...apports, entry];
    updateSection("apports", { apports: updated });
    setDialogOpen(false);
  }

  function remove(id: string) {
    updateSection("apports", { apports: apports.filter(a => a.id !== id) });
  }

  const fmt = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  // ── Synthèse par apporteur ──
  const syntheseParApporteur = useMemo(() => {
    const map = new Map<string, { capital: number; cca: number }>();
    for (const a of apports) {
      if (!map.has(a.apporteurId)) map.set(a.apporteurId, { capital: 0, cca: 0 });
      const entry = map.get(a.apporteurId)!;
      if (a.type === "CAPITAL") entry.capital += a.montant;
      else entry.cca += a.montant;
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, nom: resolveNom(id), ...v, total: v.capital + v.cca }));
  }, [apports, associes]);

  // ── Synthèse par société bénéficiaire ──
  const syntheseParSociete = useMemo(() => {
    const map = new Map<string, { capital: number; cca: number }>();
    for (const a of apports) {
      if (!map.has(a.beneficiaireId)) map.set(a.beneficiaireId, { capital: 0, cca: 0 });
      const entry = map.get(a.beneficiaireId)!;
      if (a.type === "CAPITAL") entry.capital += a.montant;
      else entry.cca += a.montant;
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      id, nom: resolveNom(id), ...v, total: v.capital + v.cca,
    }));
  }, [apports, associes]);

  // ── CCA par société (dette directe) ──
  const ccaParSociete = useMemo(() => {
    const map = new Map<string, Map<string, number>>(); // societeId → Map<crediteurId, solde>
    for (const a of apports) {
      if (a.type !== "CCA") continue;
      if (!map.has(a.beneficiaireId)) map.set(a.beneficiaireId, new Map());
      const societe = map.get(a.beneficiaireId)!;
      societe.set(a.apporteurId, (societe.get(a.apporteurId) ?? 0) + a.montant);
    }
    return map;
  }, [apports]);

  // ── Consolidation économique par personne physique ──
  const consolidation = useMemo(() => {
    const physiques = associes.filter(a => a.type === "PHYSIQUE");
    return physiques.map(pp => {
      const ppName = `${pp.prenom ? pp.prenom + " " : ""}${pp.nom}`;
      const expositions: { societeId: string; societeNom: string; capitalDirect: number; ccaDirect: number; capitalIndirect: number; ccaIndirect: number; total: number }[] = [];

      for (const societe of societes) {
        // Direct contributions from this person to this société
        const directCapital = apports
          .filter(a => a.type === "CAPITAL" && a.apporteurId === pp.id && a.beneficiaireId === societe.id)
          .reduce((s, a) => s + a.montant, 0);
        const directCCA = apports
          .filter(a => a.type === "CCA" && a.apporteurId === pp.id && a.beneficiaireId === societe.id)
          .reduce((s, a) => s + a.montant, 0);

        // Indirect contributions: through sociétés this person owns
        let indirectCapital = 0;
        let indirectCCA = 0;
        for (const pi of pp.participationsIndirectes) {
          if (pi.pourcentage <= 0) continue;
          const societeCapital = apports
            .filter(a => a.type === "CAPITAL" && a.apporteurId === pi.societeId && a.beneficiaireId === societe.id)
            .reduce((s, a) => s + a.montant, 0);
          const societeCCA = apports
            .filter(a => a.type === "CCA" && a.apporteurId === pi.societeId && a.beneficiaireId === societe.id)
            .reduce((s, a) => s + a.montant, 0);
          indirectCapital += societeCapital * (pi.pourcentage / 100);
          indirectCCA += societeCCA * (pi.pourcentage / 100);
        }

        const total = directCapital + directCCA + indirectCapital + indirectCCA;
        if (total > 0) {
          expositions.push({
            societeId: societe.id,
            societeNom: societe.nom,
            capitalDirect: directCapital,
            ccaDirect: directCCA,
            capitalIndirect: indirectCapital,
            ccaIndirect: indirectCCA,
            total,
          });
        }
      }

      return {
        personId: pp.id,
        personNom: ppName,
        expositions,
        totalExposition: expositions.reduce((s, e) => s + e.total, 0),
      };
    });
  }, [apports, associes, societes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Apports associés</h1>
        <div className="flex gap-2">
          {validated.apports ? (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" /> Validé
            </Badge>
          ) : (
            <Button size="sm" onClick={() => validateSection("apports")}>Valider la section</Button>
          )}
        </div>
      </div>

      {societes.length === 0 && associes.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Aucun associé défini. Créez des associés dans le module "Associés & Sociétés" pour pouvoir enregistrer des apports.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="tableau">
        <TabsList>
          <TabsTrigger value="tableau">Tableau des apports</TabsTrigger>
          <TabsTrigger value="synthese">Synthèse</TabsTrigger>
          <TabsTrigger value="cca">Dettes CCA</TabsTrigger>
          <TabsTrigger value="consolidation">Consolidation économique</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Tableau des apports ── */}
        <TabsContent value="tableau" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Liste des apports</h2>
            <Button size="sm" onClick={openCreate} disabled={associes.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> Créer un apport
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Apporteur</TableHead>
                    <TableHead>→ Bénéficiaire</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Commentaire</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Aucun apport enregistré
                      </TableCell>
                    </TableRow>
                  )}
                  {apports.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{a.date || "—"}</TableCell>
                      <TableCell className="font-medium">{resolveNom(a.apporteurId)}</TableCell>
                      <TableCell>{resolveNom(a.beneficiaireId)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{APPORT_TYPE_LABELS[a.type]}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmt(a.montant)}</TableCell>
                      <TableCell>
                        <Badge variant={a.statut === "REALISE" ? "default" : "secondary"}>
                          {APPORT_STATUT_LABELS[a.statut]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {a.commentaire || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: Synthèse ── */}
        <TabsContent value="synthese" className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Synthèse des apports</h2>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Par apporteur</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apporteur</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">CCA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syntheseParApporteur.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucune donnée</TableCell></TableRow>
                  )}
                  {syntheseParApporteur.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nom}</TableCell>
                      <TableCell className="text-right">{fmt(s.capital)}</TableCell>
                      <TableCell className="text-right">{fmt(s.cca)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Par société bénéficiaire</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Société</TableHead>
                    <TableHead className="text-right">Capital reçu</TableHead>
                    <TableHead className="text-right">CCA reçu</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syntheseParSociete.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucune donnée</TableCell></TableRow>
                  )}
                  {syntheseParSociete.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nom}</TableCell>
                      <TableCell className="text-right">{fmt(s.capital)}</TableCell>
                      <TableCell className="text-right">{fmt(s.cca)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: Dettes CCA par société ── */}
        <TabsContent value="cca" className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Dettes CCA par société</h2>
          <p className="text-sm text-muted-foreground">
            Chaque société ne doit rembourser que son créancier direct. Le remboursement remonte étage par étage selon les règles de gouvernance.
          </p>

          {societes.map(societe => {
            const dettes = ccaParSociete.get(societe.id);
            if (!dettes || dettes.size === 0) return null;
            const totalDette = Array.from(dettes.values()).reduce((s, v) => s + v, 0);
            return (
              <Card key={societe.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{societe.nom}</span>
                    <Badge variant="outline">Total CCA : {fmt(totalDette)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Créancier direct</TableHead>
                        <TableHead className="text-right">Solde CCA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(dettes.entries()).map(([crediteurId, solde]) => (
                        <TableRow key={crediteurId}>
                          <TableCell className="font-medium">{resolveNom(crediteurId)}</TableCell>
                          <TableCell className="text-right">{fmt(solde)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}

          {Array.from(ccaParSociete.keys()).length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucun CCA enregistré
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── TAB 4: Consolidation économique ── */}
        <TabsContent value="consolidation" className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Consolidation économique par personne physique</h2>
            <p className="text-sm text-muted-foreground">
              Vue analytique uniquement — ne modifie pas les dettes réelles ni les comptes des sociétés.
              L'exposition indirecte est calculée en pondérant les apports des sociétés intermédiaires par le pourcentage de détention.
            </p>
          </div>

          {consolidation.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune personne physique définie
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Exposition consolidée (Capital + CCA)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personne physique</TableHead>
                        {societes.map(s => (
                          <TableHead key={s.id} className="text-right">{s.nom}</TableHead>
                        ))}
                        <TableHead className="text-right font-semibold">Total exposition</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consolidation.map(c => (
                        <TableRow key={c.personId}>
                          <TableCell className="font-medium">{c.personNom}</TableCell>
                          {societes.map(s => {
                            const expo = c.expositions.find(e => e.societeId === s.id);
                            return (
                              <TableCell key={s.id} className="text-right">
                                {expo ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help inline-flex items-center gap-1">
                                        {fmt(expo.total)}
                                        {(expo.capitalIndirect > 0 || expo.ccaIndirect > 0) && <Info className="h-3 w-3 text-muted-foreground" />}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs">
                                      <p>Capital direct : {fmt(expo.capitalDirect)}</p>
                                      {expo.capitalIndirect > 0 && <p>Capital indirect : {fmt(expo.capitalIndirect)}</p>}
                                      <p>CCA direct : {fmt(expo.ccaDirect)}</p>
                                      {expo.ccaIndirect > 0 && <p>CCA indirect : {fmt(expo.ccaIndirect)}</p>}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : "—"}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-semibold">{fmt(c.totalExposition)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 bg-muted/30">
                        <TableCell className="font-semibold">Total</TableCell>
                        {societes.map(s => {
                          const total = consolidation.reduce((sum, c) => {
                            const expo = c.expositions.find(e => e.societeId === s.id);
                            return sum + (expo?.total ?? 0);
                          }, 0);
                          return (
                            <TableCell key={s.id} className="text-right font-semibold">
                              {total > 0 ? fmt(total) : "—"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-bold">
                          {fmt(consolidation.reduce((s, c) => s + c.totalExposition, 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Cette consolidation est une vue analytique. Les dettes comptables réelles restent entre chaque société et son créancier direct.
                </AlertDescription>
              </Alert>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog création/édition ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier" : "Créer"} un apport</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Apporteur</Label>
              <Select value={formApporteurId} onValueChange={setFormApporteurId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {getApporteurs().map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.type === "PHYSIQUE" ? `${a.prenom ? a.prenom + " " : ""}${a.nom}` : `${a.nom} (société)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Personne physique ou société
              </p>
            </div>

            <div>
              <Label>Société bénéficiaire</Label>
              <Select value={formBeneficiaireId} onValueChange={setFormBeneficiaireId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {getBeneficiaires().map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Uniquement les sociétés (personnes morales)
              </p>
            </div>

            <div>
              <Label>Type d'apport</Label>
              <Select value={formType} onValueChange={v => setFormType(v as ApportType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAPITAL">Apport en capital</SelectItem>
                  <SelectItem value="CCA">Compte courant d'associé (CCA)</SelectItem>
                </SelectContent>
              </Select>
              {formType === "CAPITAL" && (
                <p className="text-xs text-muted-foreground mt-1">
                  ⚠ Un apport en capital ne modifie pas automatiquement la structure capitalistique.
                </p>
              )}
            </div>

            <div>
              <Label>Montant (€)</Label>
              <Input
                type="number"
                min={0}
                value={formMontant}
                onChange={e => setFormMontant(Number(e.target.value))}
              />
            </div>

            <div>
              <Label>Date (YYYY-MM)</Label>
              <Input
                type="month"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Statut</Label>
              <Select value={formStatut} onValueChange={v => setFormStatut(v as ApportStatut)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREVU">Prévu</SelectItem>
                  <SelectItem value="REALISE">Réalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Commentaire (optionnel)</Label>
              <Textarea
                value={formCommentaire}
                onChange={e => setFormCommentaire(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={!formApporteurId || !formBeneficiaireId || formMontant <= 0}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
