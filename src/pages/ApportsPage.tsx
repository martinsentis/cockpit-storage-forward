import { useState, useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import type { ApportItem, ApportType, ApportStatut } from "@/types/project";
import { APPORT_TYPE_LABELS, APPORT_STATUT_LABELS } from "@/types/project";
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
import { Plus, Pencil, Trash2, CheckCircle } from "lucide-react";

export default function ApportsPage() {
  const { state, updateSection, validateSection, validated } = useProject();
  const apports = state.apports.apports;
  const associes = state.associes.associes;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [formApporteurId, setFormApporteurId] = useState("");
  const [formBeneficiaire, setFormBeneficiaire] = useState<"EXPLOITATION" | "FONCIERE">("EXPLOITATION");
  const [formType, setFormType] = useState<ApportType>("CAPITAL");
  const [formMontant, setFormMontant] = useState(0);
  const [formDate, setFormDate] = useState("");
  const [formStatut, setFormStatut] = useState<ApportStatut>("PREVU");
  const [formCommentaire, setFormCommentaire] = useState("");

  function resolveNom(id: string): string {
    const a = associes.find(x => x.id === id);
    if (!a) return "Inconnu";
    return a.type === "PHYSIQUE" ? `${a.prenom ? a.prenom + " " : ""}${a.nom}` : a.nom;
  }

  function openCreate() {
    setEditId(null);
    setFormApporteurId(associes[0]?.id ?? "");
    setFormBeneficiaire("EXPLOITATION");
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
    setFormBeneficiaire(item.beneficiaire);
    setFormType(item.type);
    setFormMontant(item.montant);
    setFormDate(item.date);
    setFormStatut(item.statut);
    setFormCommentaire(item.commentaire ?? "");
    setDialogOpen(true);
  }

  function save() {
    const entry: ApportItem = {
      id: editId ?? crypto.randomUUID(),
      apporteurId: formApporteurId,
      beneficiaire: formBeneficiaire,
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

  // Synthèse par associé
  const syntheseParAssocie = useMemo(() => {
    const map = new Map<string, { capital: number; cca: number }>();
    for (const a of apports) {
      if (!map.has(a.apporteurId)) map.set(a.apporteurId, { capital: 0, cca: 0 });
      const entry = map.get(a.apporteurId)!;
      if (a.type === "CAPITAL") entry.capital += a.montant;
      else entry.cca += a.montant;
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, nom: resolveNom(id), ...v, total: v.capital + v.cca }));
  }, [apports, associes]);

  // Synthèse par société
  const syntheseParSociete = useMemo(() => {
    const map = new Map<string, { capital: number; cca: number }>();
    for (const a of apports) {
      if (!map.has(a.beneficiaire)) map.set(a.beneficiaire, { capital: 0, cca: 0 });
      const entry = map.get(a.beneficiaire)!;
      if (a.type === "CAPITAL") entry.capital += a.montant;
      else entry.cca += a.montant;
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      id,
      nom: id === "EXPLOITATION" ? "Société d'exploitation" : "Société foncière (SCI)",
      ...v,
      total: v.capital + v.cca,
    }));
  }, [apports]);

  const fmt = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

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

      <Tabs defaultValue="tableau">
        <TabsList>
          <TabsTrigger value="tableau">Tableau des apports</TabsTrigger>
          <TabsTrigger value="synthese">Synthèse</TabsTrigger>
        </TabsList>

        {/* ── SECTION 1: Tableau ── */}
        <TabsContent value="tableau" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Liste des apports</h2>
            <Button size="sm" onClick={openCreate} disabled={associes.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> Créer un apport
            </Button>
          </div>

          {associes.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Créez d'abord des associés dans le module "Associés & Sociétés".
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Apporteur</TableHead>
                    <TableHead>Bénéficiaire</TableHead>
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
                      <TableCell>
                        {a.beneficiaire === "EXPLOITATION" ? "Exploitation" : "Foncière (SCI)"}
                      </TableCell>
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

        {/* ── SECTION 2: Synthèse ── */}
        <TabsContent value="synthese" className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Synthèse des apports</h2>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Par associé</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Associé</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">CCA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syntheseParAssocie.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucune donnée</TableCell>
                    </TableRow>
                  )}
                  {syntheseParAssocie.map(s => (
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
              <CardTitle className="text-base">Par société</CardTitle>
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
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucune donnée</TableCell>
                    </TableRow>
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
                  {associes.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.type === "PHYSIQUE" ? `${a.prenom ? a.prenom + " " : ""}${a.nom}` : a.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Société bénéficiaire</Label>
              <Select value={formBeneficiaire} onValueChange={v => setFormBeneficiaire(v as "EXPLOITATION" | "FONCIERE")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPLOITATION">Société d'exploitation</SelectItem>
                  <SelectItem value="FONCIERE">Société foncière (SCI)</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={save} disabled={!formApporteurId || formMontant <= 0}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
