import { useState, useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useNavigate } from "react-router-dom";
import type { Associe, PersonType, SocieteType } from "@/types/project";
import { SOCIETE_TYPE_LABELS } from "@/types/project";
import { computeEconomicOwnership, validateOwnership } from "@/lib/ownershipGraph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Plus, Pencil, Trash2, Info, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AssociesPage() {
  const { state, updateSection, validateSection, validated } = useProject();
  const navigate = useNavigate();
  const associes = state.associes.associes;
  const apports = state.apports.apports;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<PersonType>("PHYSIQUE");
  const [formNom, setFormNom] = useState("");
  const [formPrenom, setFormPrenom] = useState("");
  const [formSocieteType, setFormSocieteType] = useState<SocieteType>("HOLDING");
  const [formPartExpl, setFormPartExpl] = useState(0);
  const [formPartFonc, setFormPartFonc] = useState(0);
  const [formParticipations, setFormParticipations] = useState<{ societeId: string; pourcentage: number }[]>([]);

  const morales = associes.filter(a => a.type === "MORALE");
  const ownership = useMemo(() => computeEconomicOwnership(associes), [associes]);
  const errors = useMemo(() => validateOwnership(associes), [associes]);

  const sumExpl = associes.reduce((s, a) => s + a.partExploitation, 0);
  const sumFonc = associes.reduce((s, a) => s + a.partFonciere, 0);

  function openCreate() {
    setEditId(null);
    setFormType("PHYSIQUE");
    setFormNom("");
    setFormPrenom("");
    setFormSocieteType("HOLDING");
    setFormPartExpl(0);
    setFormPartFonc(0);
    setFormParticipations([]);
    setDialogOpen(true);
  }

  function openEdit(a: Associe) {
    setEditId(a.id);
    setFormType(a.type);
    setFormNom(a.nom);
    setFormPrenom(a.prenom ?? "");
    setFormSocieteType(a.societeType ?? "HOLDING");
    setFormPartExpl(a.partExploitation);
    setFormPartFonc(a.partFonciere);
    setFormParticipations([...a.participationsIndirectes]);
    setDialogOpen(true);
  }

  function save() {
    const entry: Associe = {
      id: editId ?? crypto.randomUUID(),
      type: formType,
      nom: formNom.trim(),
      prenom: formType === "PHYSIQUE" ? formPrenom.trim() || undefined : undefined,
      societeType: formType === "MORALE" ? formSocieteType : undefined,
      partExploitation: formPartExpl,
      partFonciere: formPartFonc,
      participationsIndirectes: formType === "PHYSIQUE" ? formParticipations.filter(p => p.pourcentage > 0) : [],
    };
    const updated = editId
      ? associes.map(a => a.id === editId ? entry : a)
      : [...associes, entry];
    updateSection("associes", { associes: updated });
    setDialogOpen(false);
  }

  function remove(id: string) {
    // Also clean up participations referencing this entity
    const updated = associes
      .filter(a => a.id !== id)
      .map(a => ({
        ...a,
        participationsIndirectes: a.participationsIndirectes.filter(p => p.societeId !== id),
      }));
    updateSection("associes", { associes: updated });
  }

  // Available morales for indirect participation (exclude self when editing)
  const availableMorales = morales.filter(m => m.id !== editId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Associés & Sociétés</h1>
        <div className="flex gap-2">
          {validated.associes ? (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" /> Validé
            </Badge>
          ) : (
            <Button size="sm" onClick={() => validateSection("associes")}>Valider la section</Button>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="personnes">
        <TabsList>
          <TabsTrigger value="personnes">Personnes & Sociétés</TabsTrigger>
          <TabsTrigger value="structure">Structure de détention</TabsTrigger>
          <TabsTrigger value="synthese">Synthèse économique</TabsTrigger>
          <TabsTrigger value="apports">Apports associés</TabsTrigger>
        </TabsList>

        {/* ── SECTION 1: Liste ── */}
        <TabsContent value="personnes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Liste des personnes et sociétés</h2>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Créer</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">% Exploitation</TableHead>
                    <TableHead className="text-right">% Foncière</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {associes.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun associé</TableCell></TableRow>
                  )}
                  {associes.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.type === "PHYSIQUE" ? `${a.prenom ? a.prenom + " " : ""}${a.nom}` : a.nom}
                        {a.type === "MORALE" && a.societeType && (
                          <Badge variant="secondary" className="ml-2 text-xs">{SOCIETE_TYPE_LABELS[a.societeType]}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.type === "PHYSIQUE" ? "default" : "outline"}>
                          {a.type === "PHYSIQUE" ? "Personne physique" : "Personne morale"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{a.partExploitation > 0 ? `${a.partExploitation}%` : "—"}</TableCell>
                      <TableCell className="text-right">{a.partFonciere > 0 ? `${a.partFonciere}%` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {associes.length > 0 && (
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={2}>Total détention directe</TableCell>
                      <TableCell className={`text-right ${Math.abs(sumExpl - 100) < 0.01 ? "text-green-600" : sumExpl > 0 ? "text-destructive" : ""}`}>
                        {sumExpl > 0 ? `${sumExpl.toFixed(1)}%` : "—"}
                      </TableCell>
                      <TableCell className={`text-right ${Math.abs(sumFonc - 100) < 0.01 ? "text-green-600" : sumFonc > 0 ? "text-destructive" : ""}`}>
                        {sumFonc > 0 ? `${sumFonc.toFixed(1)}%` : "—"}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SECTION 2: Structure de détention ── */}
        <TabsContent value="structure" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Structure de détention</h2>
          <p className="text-sm text-muted-foreground">
            Configurez les participations indirectes : quelles personnes physiques détiennent des parts dans les sociétés intermédiaires.
          </p>

          {associes.filter(a => a.type === "PHYSIQUE").length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Ajoutez d'abord des personnes physiques dans l'onglet "Personnes & Sociétés".
            </CardContent></Card>
          )}

          {associes.filter(a => a.type === "PHYSIQUE").map(pp => (
            <Card key={pp.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{pp.prenom ? pp.prenom + " " : ""}{pp.nom}</CardTitle>
              </CardHeader>
              <CardContent>
                {morales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune société intermédiaire créée.</p>
                ) : (
                  <div className="space-y-3">
                    {morales.map(m => {
                      const existing = pp.participationsIndirectes.find(p => p.societeId === m.id);
                      return (
                        <div key={m.id} className="flex items-center gap-3">
                          <span className="text-sm flex-1">{m.nom}</span>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className="w-20 text-right"
                              value={existing?.pourcentage ?? 0}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(100, Number(e.target.value)));
                                const newParts = pp.participationsIndirectes.filter(p => p.societeId !== m.id);
                                if (val > 0) newParts.push({ societeId: m.id, pourcentage: val });
                                const updated = associes.map(a =>
                                  a.id === pp.id ? { ...a, participationsIndirectes: newParts } : a
                                );
                                updateSection("associes", { associes: updated });
                              }}
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── SECTION 3: Synthèse économique ── */}
        <TabsContent value="synthese" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Synthèse des détentions économiques</h2>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personne physique</TableHead>
                    <TableHead className="text-right">% éco. Exploitation</TableHead>
                    <TableHead className="text-right">% éco. Foncière</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownership.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Aucune personne physique</TableCell></TableRow>
                  )}
                  {ownership.map(o => (
                    <TableRow key={o.personId}>
                      <TableCell className="font-medium">{o.personName}</TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help inline-flex items-center gap-1">
                              {o.exploitation.toFixed(2)}%
                              {o.exploitationPaths.length > 0 && <Info className="h-3 w-3 text-muted-foreground" />}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {o.exploitationPaths.map((p, i) => (
                              <div key={i} className="text-xs">
                                {p.steps.map(s => `${s.percent}% ${s.entityName}`).join(" × ")} = {p.finalPercent.toFixed(2)}%
                              </div>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help inline-flex items-center gap-1">
                              {o.fonciere.toFixed(2)}%
                              {o.foncierePaths.length > 0 && <Info className="h-3 w-3 text-muted-foreground" />}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {o.foncierePaths.map((p, i) => (
                              <div key={i} className="text-xs">
                                {p.steps.map(s => `${s.percent}% ${s.entityName}`).join(" × ")} = {p.finalPercent.toFixed(2)}%
                              </div>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Vue depuis les sociétés */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Vue Exploitation</CardTitle></CardHeader>
              <CardContent>
                {ownership.filter(o => o.exploitation > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune détention</p>
                ) : (
                  <div className="space-y-2">
                    {ownership.filter(o => o.exploitation > 0).map(o => (
                      <div key={o.personId} className="flex justify-between text-sm">
                        <span>{o.personName}</span>
                        <span className="font-medium">{o.exploitation.toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Vue Foncière</CardTitle></CardHeader>
              <CardContent>
                {ownership.filter(o => o.fonciere > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune détention</p>
                ) : (
                  <div className="space-y-2">
                    {ownership.filter(o => o.fonciere > 0).map(o => (
                      <div key={o.personId} className="flex justify-between text-sm">
                        <span>{o.personName}</span>
                        <span className="font-medium">{o.fonciere.toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── SECTION 4: Apports (placeholder) ── */}
        <TabsContent value="apports" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Synthèse des apports associés</h2>
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground mb-4">
                Les apports associés seront disponibles dans un module dédié.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personne</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">CCA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Aucune donnée</TableCell>
                  </TableRow>
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
            <DialogTitle>{editId ? "Modifier" : "Créer"} un associé</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as PersonType)} disabled={!!editId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHYSIQUE">Personne physique</SelectItem>
                  <SelectItem value="MORALE">Personne morale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{formType === "PHYSIQUE" ? "Nom" : "Nom de la société"}</Label>
              <Input value={formNom} onChange={e => setFormNom(e.target.value)} />
            </div>

            {formType === "PHYSIQUE" && (
              <div>
                <Label>Prénom (optionnel)</Label>
                <Input value={formPrenom} onChange={e => setFormPrenom(e.target.value)} />
              </div>
            )}

            {formType === "MORALE" && (
              <div>
                <Label>Type de société</Label>
                <Select value={formSocieteType} onValueChange={v => setFormSocieteType(v as SocieteType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SOCIETE_TYPE_LABELS) as SocieteType[]).map(k => (
                      <SelectItem key={k} value={k}>{SOCIETE_TYPE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>% Exploitation</Label>
                <Input type="number" min={0} max={100} value={formPartExpl} onChange={e => setFormPartExpl(Number(e.target.value))} />
              </div>
              <div>
                <Label>% Foncière</Label>
                <Input type="number" min={0} max={100} value={formPartFonc} onChange={e => setFormPartFonc(Number(e.target.value))} />
              </div>
            </div>

            {formType === "PHYSIQUE" && availableMorales.length > 0 && (
              <div>
                <Label>Participations dans des sociétés existantes</Label>
                <div className="space-y-2 mt-2">
                  {availableMorales.map(m => {
                    const existing = formParticipations.find(p => p.societeId === m.id);
                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <span className="text-sm flex-1">{m.nom}</span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20 text-right"
                          value={existing?.pourcentage ?? 0}
                          onChange={e => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value)));
                            const newParts = formParticipations.filter(p => p.societeId !== m.id);
                            if (val > 0) newParts.push({ societeId: m.id, pourcentage: val });
                            setFormParticipations(newParts);
                          }}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={!formNom.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
