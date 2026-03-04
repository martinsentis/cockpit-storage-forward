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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight, Package } from "lucide-react";
import { formatMonthIndex, formatMonthRange } from "@/lib/monthUtils";
import type {
  BuildData, BuildAsset, CapexCategory, CapexBudgetLine, CapexEvent,
  DepenseReelle, TaxeEcheance, TaxePaymentMode,
} from "@/types/project";
import {
  CAPEX_CATEGORY_LABELS, CAPEX_DEFAULT_DEPRECIATION, DEFAULT_BUILD, createDefaultCapexEvent,
} from "@/types/project";

function uid() { return crypto.randomUUID(); }
function fmt(n: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n); }
const categories = Object.keys(CAPEX_CATEGORY_LABELS) as CapexCategory[];
const amortizableCategories = categories.filter(c => CAPEX_DEFAULT_DEPRECIATION[c].amortissable);

/** Compute HT from a budget line */
function budgetLineHT(l: CapexBudgetLine): number {
  if (l.prixType === "NON_SOUMIS" || l.prixType === "HT") return l.montant;
  return l.montant / (1 + (l.vatRate || 0.20));
}

export default function BuildPage() {
  const { state, updateSection, validateSection } = useProject();
  const projectStartDate = state.projet.projectStartDate;
  const defaultVatRate = state.projet.defaultVatRate ?? 0.20;

  const [form, setForm] = useState<BuildData>(() => {
    const b = state.build;
    return {
      capexEvents: (b.capexEvents && b.capexEvents.length > 0)
        ? b.capexEvents
        : [createDefaultCapexEvent()],
    };
  });

  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    form.capexEvents.forEach(ev => { init[ev.id] = true; });
    return init;
  });

  const toggleBlock = (id: string) =>
    setOpenBlocks(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Event-level operations ──
  const addCapexEvent = () => {
    const idx = form.capexEvents.length + 1;
    const ev = createDefaultCapexEvent(`CAPEX Tranche ${idx}`);
    setForm(prev => ({ capexEvents: [...prev.capexEvents, ev] }));
    setOpenBlocks(prev => ({ ...prev, [ev.id]: true }));
  };

  const removeCapexEvent = (id: string) => {
    if (form.capexEvents.length <= 1) {
      toast.error("Il doit y avoir au moins un bloc CAPEX.");
      return;
    }
    setForm(prev => ({ capexEvents: prev.capexEvents.filter(e => e.id !== id) }));
  };

  const updateEvent = (id: string, patch: Partial<CapexEvent>) =>
    setForm(prev => ({
      capexEvents: prev.capexEvents.map(e => e.id === id ? { ...e, ...patch } : e),
    }));

  // ── Per-event sub-operations factories ──
  const addBudgetLine = (eventId: string) => {
    const line: CapexBudgetLine = {
      id: uid(), label: "Nouveau poste", category: "DIVERS",
      montant: 0, prixType: "HT", vatRate: defaultVatRate,
    };
    updateEvent(eventId, {
      budgetLines: [...(form.capexEvents.find(e => e.id === eventId)?.budgetLines ?? []), line],
    });
  };

  const updateBudgetLine = (eventId: string, lineId: string, patch: Partial<CapexBudgetLine>) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    const updated = { ...patch };
    if (updated.prixType === "NON_SOUMIS") {
      updated.vatRate = 0;
    }
    updateEvent(eventId, {
      budgetLines: ev.budgetLines.map(l => l.id === lineId ? { ...l, ...updated } : l),
    });
  };

  const removeBudgetLine = (eventId: string, lineId: string) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    updateEvent(eventId, { budgetLines: ev.budgetLines.filter(l => l.id !== lineId) });
  };

  const createAssetFromBudgetLine = (eventId: string, line: CapexBudgetLine) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    const defaults = CAPEX_DEFAULT_DEPRECIATION[line.category];
    const ht = budgetLineHT(line);
    const asset: BuildAsset = {
      id: uid(),
      label: line.label,
      category: line.category,
      amount: ht,
      amortissable: defaults.amortissable,
      depreciationYears: defaults.years,
      commissioningMonth: ev.startMonth + ev.durationMonths,
    };
    updateEvent(eventId, { assets: [...ev.assets, asset] });
    toast.success(`Actif "${line.label}" créé (${fmt(ht)} € HT)`);
  };

  const addAsset = (eventId: string) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    const a: BuildAsset = {
      id: uid(), label: "Nouvel actif", category: "DIVERS",
      amount: 0, amortissable: true, commissioningMonth: ev.startMonth + ev.durationMonths,
      depreciationYears: 10,
    };
    updateEvent(eventId, { assets: [...ev.assets, a] });
  };

  const updateAsset = (eventId: string, assetId: string, patch: Partial<BuildAsset>) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    updateEvent(eventId, {
      assets: ev.assets.map(a => {
        if (a.id !== assetId) return a;
        const updated = { ...a, ...patch };
        if (patch.category && patch.category !== a.category) {
          const defaults = CAPEX_DEFAULT_DEPRECIATION[patch.category];
          updated.amortissable = defaults.amortissable;
          updated.depreciationYears = defaults.years;
        }
        return updated;
      }),
    });
  };

  const removeAsset = (eventId: string, assetId: string) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    updateEvent(eventId, { assets: ev.assets.filter(a => a.id !== assetId) });
  };

  // ── Taxe ──
  const setTaxe = (eventId: string, patch: Partial<CapexEvent["taxeAmenagement"]>) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    updateEvent(eventId, { taxeAmenagement: { ...ev.taxeAmenagement, ...patch } });
  };

  const addEcheance = (eventId: string) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    const e: TaxeEcheance = { id: uid(), monthOffset: 3, montant: 0 };
    setTaxe(eventId, { echeances: [...ev.taxeAmenagement.echeances, e] });
  };

  const updateEcheance = (eventId: string, echeanceId: string, patch: Partial<TaxeEcheance>) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    setTaxe(eventId, {
      echeances: ev.taxeAmenagement.echeances.map(e => e.id === echeanceId ? { ...e, ...patch } : e),
    });
  };

  const removeEcheance = (eventId: string, echeanceId: string) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    setTaxe(eventId, { echeances: ev.taxeAmenagement.echeances.filter(e => e.id !== echeanceId) });
  };

  // ── Dépenses ──
  const addDepense = (eventId: string) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    const d: DepenseReelle = { id: uid(), date: "", fournisseur: "", montant: 0 };
    updateEvent(eventId, { depenses: [...ev.depenses, d] });
  };

  const updateDepense = (eventId: string, depenseId: string, patch: Partial<DepenseReelle>) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    updateEvent(eventId, {
      depenses: ev.depenses.map(d => d.id === depenseId ? { ...d, ...patch } : d),
    });
  };

  const removeDepense = (eventId: string, depenseId: string) => {
    const ev = form.capexEvents.find(e => e.id === eventId);
    if (!ev) return;
    updateEvent(eventId, { depenses: ev.depenses.filter(d => d.id !== depenseId) });
  };

  const save = () => {
    updateSection("build", form);
    validateSection("build");
    toast.success("Section Build enregistrée");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Build / CAPEX</h1>
        <Button variant="outline" onClick={addCapexEvent}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter un bloc CAPEX
        </Button>
      </div>

      {form.capexEvents.map((ev, evIdx) => {
        const isOpen = openBlocks[ev.id] ?? true;
        const budgetTotal = ev.budgetLines.reduce((s, l) => s + budgetLineHT(l), 0);
        const totalDepenses = ev.depenses.reduce((s, d) => s + d.montant, 0);
        const finTravauxMonth = ev.startMonth + ev.durationMonths;

        return (
          <Collapsible key={ev.id} open={isOpen} onOpenChange={() => toggleBlock(ev.id)}>
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <Package className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">{ev.nom}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      M{ev.startMonth}–M{finTravauxMonth} • {fmt(budgetTotal)} € HT
                    </span>
                  </div>
                  {form.capexEvents.length > 1 && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeCapexEvent(ev.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="p-4">
                  <Tabs defaultValue="infos">
                    <TabsList className="grid grid-cols-5 w-full">
                      <TabsTrigger value="infos">Infos</TabsTrigger>
                      <TabsTrigger value="budget">Budget CAPEX</TabsTrigger>
                      <TabsTrigger value="immobilisations">Immobilisations</TabsTrigger>
                      <TabsTrigger value="taxe">Taxe</TabsTrigger>
                      <TabsTrigger value="depenses">Dépenses</TabsTrigger>
                    </TabsList>

                    {/* ═══ TAB 1 — Infos ═══ */}
                    <TabsContent value="infos">
                      <Card>
                        <CardHeader><CardTitle>Informations du bloc</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2 max-w-sm">
                            <Label>Nom du bloc</Label>
                            <Input value={ev.nom} onChange={e => updateEvent(ev.id, { nom: e.target.value })} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Début des travaux (mois)</Label>
                              <Input type="number" min={0} value={ev.startMonth}
                                onChange={e => updateEvent(ev.id, { startMonth: Number(e.target.value) })} />
                              <p className="text-xs text-muted-foreground">{formatMonthIndex(ev.startMonth, projectStartDate)}</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Durée des travaux (mois)</Label>
                              <Input type="number" min={1} value={ev.durationMonths}
                                onChange={e => updateEvent(ev.id, { durationMonths: Number(e.target.value) })} />
                              <p className="text-xs text-muted-foreground">
                                Fin : {formatMonthRange(ev.startMonth, ev.durationMonths, projectStartDate)}
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
                          <CardTitle>Budget CAPEX</CardTitle>
                          <Button variant="outline" size="sm" onClick={() => addBudgetLine(ev.id)}>
                            <Plus className="h-4 w-4 mr-1" /> Ajouter un poste
                          </Button>
                        </CardHeader>
                        <CardContent>
                          {ev.budgetLines.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Aucun poste budgétaire défini.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Catégorie</TableHead>
                                    <TableHead>Nom du poste</TableHead>
                                    <TableHead>Montant (€)</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>TVA %</TableHead>
                                    <TableHead>Montant HT</TableHead>
                                    <TableHead>Commentaire</TableHead>
                                    <TableHead />
                                    <TableHead />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {ev.budgetLines.map(l => {
                                    const ht = budgetLineHT(l);
                                    const canCreateAsset = CAPEX_DEFAULT_DEPRECIATION[l.category]?.amortissable === true;
                                    return (
                                      <TableRow key={l.id}>
                                        <TableCell>
                                          <Select value={l.category} onValueChange={v => updateBudgetLine(ev.id, l.id, { category: v as CapexCategory })}>
                                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              {categories.map(c => <SelectItem key={c} value={c}>{CAPEX_CATEGORY_LABELS[c]}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell><Input className="w-36" value={l.label} onChange={e => updateBudgetLine(ev.id, l.id, { label: e.target.value })} /></TableCell>
                                        <TableCell><Input type="number" className="w-28" value={l.montant} onChange={e => updateBudgetLine(ev.id, l.id, { montant: Number(e.target.value) })} /></TableCell>
                                        <TableCell>
                                          <Select value={l.prixType} onValueChange={v => updateBudgetLine(ev.id, l.id, { prixType: v as CapexBudgetLine["prixType"] })}>
                                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="HT">HT</SelectItem>
                                              <SelectItem value="TTC">TTC</SelectItem>
                                              <SelectItem value="NON_SOUMIS">Non soumis TVA</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell>
                                          {l.prixType === "NON_SOUMIS" ? (
                                            <span className="text-xs text-muted-foreground">—</span>
                                          ) : (
                                            <Input type="number" step="1" className="w-16" value={Math.round((l.vatRate ?? 0.20) * 100)}
                                              onChange={e => updateBudgetLine(ev.id, l.id, { vatRate: Number(e.target.value) / 100 })} />
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{fmt(ht)} €</TableCell>
                                        <TableCell><Input className="w-28" value={l.commentaire ?? ""} onChange={e => updateBudgetLine(ev.id, l.id, { commentaire: e.target.value })} /></TableCell>
                                        <TableCell>
                                          {canCreateAsset && (
                                            <Button variant="outline" size="sm" className="text-xs whitespace-nowrap"
                                              onClick={() => createAssetFromBudgetLine(ev.id, l)}>
                                              Créer actif
                                            </Button>
                                          )}
                                        </TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeBudgetLine(ev.id, l.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                      </TableRow>
                                    );
                                  })}
                                  <TableRow className="font-semibold bg-muted/30">
                                    <TableCell colSpan={5} className="text-right">Total CAPEX HT</TableCell>
                                    <TableCell className="text-right">{fmt(budgetTotal)} €</TableCell>
                                    <TableCell colSpan={3} />
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
                          <Button variant="outline" size="sm" onClick={() => addAsset(ev.id)}>
                            <Plus className="h-4 w-4 mr-1" /> Ajouter un actif
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground mb-3">
                            Ces données seront utilisées par le moteur financier pour calculer les amortissements.
                          </p>
                          {ev.assets.length === 0 ? (
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
                                  {ev.assets.map(a => (
                                    <TableRow key={a.id}>
                                      <TableCell>
                                        <Select value={a.category} onValueChange={v => updateAsset(ev.id, a.id, { category: v as CapexCategory })}>
                                          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {categories.map(c => <SelectItem key={c} value={c}>{CAPEX_CATEGORY_LABELS[c]}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell><Input className="w-32" value={a.label} onChange={e => updateAsset(ev.id, a.id, { label: e.target.value })} /></TableCell>
                                      <TableCell><Input type="number" className="w-28" value={a.amount} onChange={e => updateAsset(ev.id, a.id, { amount: Number(e.target.value) })} /></TableCell>
                                      <TableCell>
                                        <Switch checked={a.amortissable} onCheckedChange={v => updateAsset(ev.id, a.id, { amortissable: v })} />
                                      </TableCell>
                                      <TableCell>
                                        {a.amortissable ? (
                                          <Input type="number" className="w-20" min={0} value={a.depreciationYears} onChange={e => updateAsset(ev.id, a.id, { depreciationYears: Number(e.target.value) })} />
                                        ) : (
                                          <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                          <Input type="number" className="w-20" value={a.commissioningMonth} onChange={e => updateAsset(ev.id, a.id, { commissioningMonth: Number(e.target.value) })} />
                                          <span className="text-[10px] text-muted-foreground">{formatMonthIndex(a.commissioningMonth, projectStartDate)}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell><Input className="w-28" value={a.commentaire ?? ""} onChange={e => updateAsset(ev.id, a.id, { commentaire: e.target.value })} /></TableCell>
                                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeAsset(ev.id, a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
                            <Input type="number" value={ev.taxeAmenagement.montant}
                              onChange={e => setTaxe(ev.id, { montant: Number(e.target.value) })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Mode de paiement</Label>
                            <RadioGroup value={ev.taxeAmenagement.mode} onValueChange={v => setTaxe(ev.id, { mode: v as TaxePaymentMode })}>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="AUTO" id={`taxe-auto-${ev.id}`} />
                                <Label htmlFor={`taxe-auto-${ev.id}`}>Automatique (50% à M+3, 50% à M+9 après fin des travaux)</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="MANUEL" id={`taxe-manuel-${ev.id}`} />
                                <Label htmlFor={`taxe-manuel-${ev.id}`}>Manuel</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {ev.taxeAmenagement.mode === "AUTO" ? (
                            <div className="bg-muted/30 rounded-md p-4 space-y-1">
                              <p className="text-sm font-medium">Échéances automatiques</p>
                              <p className="text-sm">• {fmt(ev.taxeAmenagement.montant * 0.5)} € — Mois {finTravauxMonth + 3} ({formatMonthIndex(finTravauxMonth + 3, projectStartDate)})</p>
                              <p className="text-sm">• {fmt(ev.taxeAmenagement.montant * 0.5)} € — Mois {finTravauxMonth + 9} ({formatMonthIndex(finTravauxMonth + 9, projectStartDate)})</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Échéances manuelles</p>
                                <Button variant="outline" size="sm" onClick={() => addEcheance(ev.id)}>
                                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                                </Button>
                              </div>
                              {ev.taxeAmenagement.echeances.length === 0 ? (
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
                                    {ev.taxeAmenagement.echeances.map(ech => (
                                      <TableRow key={ech.id}>
                                        <TableCell><Input type="number" className="w-20" value={ech.monthOffset} onChange={e => updateEcheance(ev.id, ech.id, { monthOffset: Number(e.target.value) })} /></TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{formatMonthIndex(finTravauxMonth + ech.monthOffset, projectStartDate)}</TableCell>
                                        <TableCell><Input type="number" className="w-28" value={ech.montant} onChange={e => updateEcheance(ev.id, ech.id, { montant: Number(e.target.value) })} /></TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeEcheance(ev.id, ech.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
                          <Button variant="outline" size="sm" onClick={() => addDepense(ev.id)}>
                            <Plus className="h-4 w-4 mr-1" /> Ajouter une dépense
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 mb-4 bg-muted/30 rounded-md p-4">
                            <div><p className="text-xs text-muted-foreground">Budget total HT</p><p className="font-semibold">{fmt(budgetTotal)} €</p></div>
                            <div><p className="text-xs text-muted-foreground">Engagé</p><p className="font-semibold">{fmt(totalDepenses)} €</p></div>
                            <div><p className="text-xs text-muted-foreground">Reste à dépenser</p><p className="font-semibold">{fmt(budgetTotal - totalDepenses)} €</p></div>
                          </div>
                          {ev.depenses.length === 0 ? (
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
                                  {ev.depenses.map(d => (
                                    <TableRow key={d.id}>
                                      <TableCell><Input type="month" className="w-36" value={d.date} onChange={e => updateDepense(ev.id, d.id, { date: e.target.value })} /></TableCell>
                                      <TableCell><Input className="w-32" value={d.fournisseur} onChange={e => updateDepense(ev.id, d.id, { fournisseur: e.target.value })} /></TableCell>
                                      <TableCell>
                                        <Select value={d.posteCapexId ?? "__none__"} onValueChange={v => updateDepense(ev.id, d.id, { posteCapexId: v === "__none__" ? undefined : v })}>
                                          <SelectTrigger className="w-40"><SelectValue placeholder="—" /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="__none__">— Aucun —</SelectItem>
                                            {ev.budgetLines.map(l => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell><Input type="number" className="w-28" value={d.montant} onChange={e => updateDepense(ev.id, d.id, { montant: Number(e.target.value) })} /></TableCell>
                                      <TableCell><Input className="w-32" value={d.commentaire ?? ""} onChange={e => updateDepense(ev.id, d.id, { commentaire: e.target.value })} /></TableCell>
                                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeDepense(ev.id, d.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      <Button onClick={save} className="w-full">Enregistrer</Button>
    </div>
  );
}
