import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatMonthIndex, formatMonthRange } from "@/lib/monthUtils";
import type {
  BuildData, BuildAsset, CapexCategory, CapexBudgetLine, DepenseReelle, TaxeEcheance, TaxePaymentMode,
} from "@/types/project";
import { CAPEX_CATEGORY_LABELS, CAPEX_DEFAULT_DEPRECIATION, DEFAULT_BUILD } from "@/types/project";

function uid() { return crypto.randomUUID(); }
function fmt(n: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n); }
const categories = Object.keys(CAPEX_CATEGORY_LABELS) as CapexCategory[];

export default function BuildPage() {
  const { state, updateSection, validateSection } = useProject();
  const [form, setForm] = useState<BuildData>(() => {
    const s = state.build;
    return {
      startMonth: s.startMonth ?? 0,
      durationMonths: s.durationMonths ?? 6,
      budgetLines: s.budgetLines ?? [],
      assets: s.assets ?? [],
      taxeAmenagement: s.taxeAmenagement && typeof s.taxeAmenagement === "object"
        ? s.taxeAmenagement
        : { montant: 0, mode: "AUTO" as const, echeances: [] },
      depenses: s.depenses ?? [],
    };
  });
  const projectStartDate = state.projet.projectStartDate;

  const set = (key: string, value: number) => setForm(prev => ({ ...prev, [key]: value }));

  // ── Budget lines ──
  const addBudgetLine = () => {
    const line: CapexBudgetLine = { id: uid(), label: "Nouveau poste", category: "DIVERS", budgetPrevu: 0 };
    setForm(prev => ({ ...prev, budgetLines: [...prev.budgetLines, line] }));
  };
  const updateBudgetLine = (id: string, patch: Partial<CapexBudgetLine>) =>
    setForm(prev => ({ ...prev, budgetLines: prev.budgetLines.map(l => l.id === id ? { ...l, ...patch } : l) }));
  const removeBudgetLine = (id: string) =>
    setForm(prev => ({ ...prev, budgetLines: prev.budgetLines.filter(l => l.id !== id) }));

  const budgetTotal = form.budgetLines.reduce((s, l) => s + l.budgetPrevu, 0);

  // ── Assets ──
  const addAsset = () => {
    const a: BuildAsset = {
      id: uid(), label: "Nouvel actif", category: "DIVERS",
      amount: 0, amortissable: true, commissioningMonth: form.startMonth + form.durationMonths,
      depreciationYears: 10,
    };
    setForm(prev => ({ ...prev, assets: [...prev.assets, a] }));
  };
  const updateAsset = (id: string, patch: Partial<BuildAsset>) => {
    setForm(prev => ({
      ...prev,
      assets: prev.assets.map(a => {
        if (a.id !== id) return a;
        const updated = { ...a, ...patch };
        // Auto-set defaults when category changes
        if (patch.category && patch.category !== a.category) {
          const defaults = CAPEX_DEFAULT_DEPRECIATION[patch.category];
          updated.amortissable = defaults.amortissable;
          updated.depreciationYears = defaults.years;
        }
        return updated;
      }),
    }));
  };
  const removeAsset = (id: string) =>
    setForm(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));

  // ── Taxe ──
  const setTaxe = (patch: Partial<typeof form.taxeAmenagement>) =>
    setForm(prev => ({ ...prev, taxeAmenagement: { ...prev.taxeAmenagement, ...patch } }));
  const addEcheance = () => {
    const e: TaxeEcheance = { id: uid(), monthOffset: 3, montant: 0 };
    setTaxe({ echeances: [...form.taxeAmenagement.echeances, e] });
  };
  const updateEcheance = (id: string, patch: Partial<TaxeEcheance>) =>
    setTaxe({ echeances: form.taxeAmenagement.echeances.map(e => e.id === id ? { ...e, ...patch } : e) });
  const removeEcheance = (id: string) =>
    setTaxe({ echeances: form.taxeAmenagement.echeances.filter(e => e.id !== id) });

  const finTravauxMonth = form.startMonth + form.durationMonths;

  // ── Dépenses ──
  const addDepense = () => {
    const d: DepenseReelle = { id: uid(), date: "", fournisseur: "", montant: 0 };
    setForm(prev => ({ ...prev, depenses: [...prev.depenses, d] }));
  };
  const updateDepense = (id: string, patch: Partial<DepenseReelle>) =>
    setForm(prev => ({ ...prev, depenses: prev.depenses.map(d => d.id === id ? { ...d, ...patch } : d) }));
  const removeDepense = (id: string) =>
    setForm(prev => ({ ...prev, depenses: prev.depenses.filter(d => d.id !== id) }));

  const totalDepenses = form.depenses.reduce((s, d) => s + d.montant, 0);

  const save = () => {
    updateSection("build", form);
    validateSection("build");
    toast.success("Section Build enregistrée");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Tabs defaultValue="general">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="budget">Budget CAPEX</TabsTrigger>
          <TabsTrigger value="immobilisations">Immobilisations</TabsTrigger>
          <TabsTrigger value="taxe">Taxe d'aménagement</TabsTrigger>
          <TabsTrigger value="depenses">Dépenses réelles</TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1 — Général ═══ */}
        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Début des travaux (mois)</Label>
                  <Input type="number" min={0} value={form.startMonth} onChange={e => set("startMonth", Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">{formatMonthIndex(form.startMonth, projectStartDate)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Durée des travaux (mois)</Label>
                  <Input type="number" min={1} value={form.durationMonths} onChange={e => set("durationMonths", Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">
                    Fin : {formatMonthRange(form.startMonth, form.durationMonths, projectStartDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 2 — Budget CAPEX ═══ */}
        <TabsContent value="budget">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Budget CAPEX (Plan d'investissement)</CardTitle>
              <Button variant="outline" size="sm" onClick={addBudgetLine}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter un poste
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Définissez les enveloppes budgétaires prévues. Le total est calculé automatiquement.
              </p>
              {form.budgetLines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun poste budgétaire défini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Nom du poste</TableHead>
                        <TableHead>Budget prévu (€)</TableHead>
                        <TableHead>Commentaire</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.budgetLines.map(l => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <Select value={l.category} onValueChange={v => updateBudgetLine(l.id, { category: v as CapexCategory })}>
                              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {categories.map(c => <SelectItem key={c} value={c}>{CAPEX_CATEGORY_LABELS[c]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input className="w-40" value={l.label} onChange={e => updateBudgetLine(l.id, { label: e.target.value })} /></TableCell>
                          <TableCell><Input type="number" className="w-28" value={l.budgetPrevu} onChange={e => updateBudgetLine(l.id, { budgetPrevu: Number(e.target.value) })} /></TableCell>
                          <TableCell><Input className="w-40" value={l.commentaire ?? ""} onChange={e => updateBudgetLine(l.id, { commentaire: e.target.value })} /></TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeBudgetLine(l.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/30">
                        <TableCell colSpan={2} className="text-right">Total CAPEX</TableCell>
                        <TableCell>{fmt(budgetTotal)} €</TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 3 — Immobilisations ═══ */}
        <TabsContent value="immobilisations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Immobilisations (Actifs)</CardTitle>
              <Button variant="outline" size="sm" onClick={addAsset}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter un actif
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Ces données seront utilisées par le moteur financier pour calculer les amortissements.
              </p>
              {form.assets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun actif défini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead>Montant (€)</TableHead>
                        <TableHead>Amortissable</TableHead>
                        <TableHead>Durée (ans)</TableHead>
                        <TableHead>Mise en service</TableHead>
                        <TableHead>Commentaire</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.assets.map(a => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <Select value={a.category} onValueChange={v => updateAsset(a.id, { category: v as CapexCategory })}>
                              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {categories.map(c => <SelectItem key={c} value={c}>{CAPEX_CATEGORY_LABELS[c]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input className="w-32" value={a.label} onChange={e => updateAsset(a.id, { label: e.target.value })} /></TableCell>
                          <TableCell><Input type="number" className="w-28" value={a.amount} onChange={e => updateAsset(a.id, { amount: Number(e.target.value) })} /></TableCell>
                          <TableCell>
                            <Switch checked={a.amortissable} onCheckedChange={v => updateAsset(a.id, { amortissable: v })} />
                          </TableCell>
                          <TableCell>
                            {a.amortissable ? (
                              <Input type="number" className="w-20" min={0} value={a.depreciationYears} onChange={e => updateAsset(a.id, { depreciationYears: Number(e.target.value) })} />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <Input type="number" className="w-20" value={a.commissioningMonth} onChange={e => updateAsset(a.id, { commissioningMonth: Number(e.target.value) })} />
                              <span className="text-[10px] text-muted-foreground">{formatMonthIndex(a.commissioningMonth, projectStartDate)}</span>
                            </div>
                          </TableCell>
                          <TableCell><Input className="w-28" value={a.commentaire ?? ""} onChange={e => updateAsset(a.id, { commentaire: e.target.value })} /></TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeAsset(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 4 — Taxe d'aménagement ═══ */}
        <TabsContent value="taxe">
          <Card>
            <CardHeader><CardTitle>Taxe d'aménagement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                La taxe d'aménagement fait partie du CAPEX. Elle n'apparaît pas dans les charges d'exploitation.
              </p>
              <div className="space-y-2 max-w-xs">
                <Label>Montant total (€)</Label>
                <Input type="number" value={form.taxeAmenagement.montant} onChange={e => setTaxe({ montant: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <RadioGroup value={form.taxeAmenagement.mode} onValueChange={v => setTaxe({ mode: v as TaxePaymentMode })}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="AUTO" id="taxe-auto" />
                    <Label htmlFor="taxe-auto">Automatique (50% à M+3, 50% à M+9 après fin des travaux)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="MANUEL" id="taxe-manuel" />
                    <Label htmlFor="taxe-manuel">Manuel</Label>
                  </div>
                </RadioGroup>
              </div>

              {form.taxeAmenagement.mode === "AUTO" ? (
                <div className="bg-muted/30 rounded-md p-4 space-y-1">
                  <p className="text-sm font-medium">Échéances automatiques</p>
                  <p className="text-sm">• {fmt(form.taxeAmenagement.montant * 0.5)} € — Mois {finTravauxMonth + 3} ({formatMonthIndex(finTravauxMonth + 3, projectStartDate)})</p>
                  <p className="text-sm">• {fmt(form.taxeAmenagement.montant * 0.5)} € — Mois {finTravauxMonth + 9} ({formatMonthIndex(finTravauxMonth + 9, projectStartDate)})</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Échéances manuelles</p>
                    <Button variant="outline" size="sm" onClick={addEcheance}>
                      <Plus className="h-4 w-4 mr-1" /> Ajouter
                    </Button>
                  </div>
                  {form.taxeAmenagement.echeances.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Aucune échéance définie.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mois après fin travaux</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Montant (€)</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.taxeAmenagement.echeances.map(e => (
                          <TableRow key={e.id}>
                            <TableCell><Input type="number" className="w-20" value={e.monthOffset} onChange={ev => updateEcheance(e.id, { monthOffset: Number(ev.target.value) })} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatMonthIndex(finTravauxMonth + e.monthOffset, projectStartDate)}</TableCell>
                            <TableCell><Input type="number" className="w-28" value={e.montant} onChange={ev => updateEcheance(e.id, { montant: Number(ev.target.value) })} /></TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => removeEcheance(e.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 5 — Dépenses réelles ═══ */}
        <TabsContent value="depenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Dépenses réelles (suivi chantier)</CardTitle>
              <Button variant="outline" size="sm" onClick={addDepense}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter une dépense
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4 bg-muted/30 rounded-md p-4">
                <div><p className="text-xs text-muted-foreground">Budget total</p><p className="font-semibold">{fmt(budgetTotal)} €</p></div>
                <div><p className="text-xs text-muted-foreground">Engagé</p><p className="font-semibold">{fmt(totalDepenses)} €</p></div>
                <div><p className="text-xs text-muted-foreground">Reste à dépenser</p><p className="font-semibold">{fmt(budgetTotal - totalDepenses)} €</p></div>
              </div>
              {form.depenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune dépense enregistrée.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Poste CAPEX</TableHead>
                        <TableHead>Montant (€)</TableHead>
                        <TableHead>Commentaire</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.depenses.map(d => (
                        <TableRow key={d.id}>
                          <TableCell><Input type="month" className="w-36" value={d.date} onChange={e => updateDepense(d.id, { date: e.target.value })} /></TableCell>
                          <TableCell><Input className="w-32" value={d.fournisseur} onChange={e => updateDepense(d.id, { fournisseur: e.target.value })} /></TableCell>
                          <TableCell>
                            <Select value={d.posteCapexId ?? "__none__"} onValueChange={v => updateDepense(d.id, { posteCapexId: v === "__none__" ? undefined : v })}>
                              <SelectTrigger className="w-40"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Aucun —</SelectItem>
                                {form.budgetLines.map(l => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input type="number" className="w-28" value={d.montant} onChange={e => updateDepense(d.id, { montant: Number(e.target.value) })} /></TableCell>
                          <TableCell><Input className="w-32" value={d.commentaire ?? ""} onChange={e => updateDepense(d.id, { commentaire: e.target.value })} /></TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeDepense(d.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={save} className="w-full">Enregistrer</Button>
    </div>
  );
}
