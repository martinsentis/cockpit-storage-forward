import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import type {
  FonciereData, SCIChargeItem, SCIChargeCategory, SCIRevenueItem, ChargeFrequency,
} from "@/types/project";
import {
  SCI_CHARGE_PRESETS, SCI_CATEGORY_LABELS, DEFAULT_FONCIERE, CAPEX_CATEGORY_LABELS,
  isTaxExemptLabel,
} from "@/types/project";
import { formatMonthIndex } from "@/lib/monthUtils";
import { useEngine } from "@/hooks/useEngine";

function uid() { return crypto.randomUUID(); }
function fmt(n: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n); }

export default function FoncierePage() {
  const { state, updateSection, validateSection } = useProject();
  const navigate = useNavigate();
  const projectStartDate = state.projet.projectStartDate;
  const defaultVatRate = state.projet.defaultVatRate ?? 0.20;

  const engine = useEngine();
  const sci = engine.fonciere;
  const loyerMensuel = engine.loyerDynamique.loyerCalcule;

  // Aggregate all assets from all capex events
  const allAssets = (state.build.capexEvents ?? []).flatMap(ev => ev.assets ?? []);

  const [form, setForm] = useState<FonciereData>(() => ({
    ...DEFAULT_FONCIERE,
    ...state.fonciere,
  }));

  const [showPresets, setShowPresets] = useState<SCIChargeCategory | null>(null);

  // ── Charges ──
  const addCharge = (category: SCIChargeCategory = "IMMOBILIER", label = "Nouvelle charge") => {
    const isTaxExempt = isTaxExemptLabel(label);
    const c: SCIChargeItem = {
      id: uid(), label, category, frequency: "MENSUELLE",
      amountInput: 0, amountType: "HT", vatRate: isTaxExempt ? 0 : defaultVatRate,
      annualMonth: null, startMonth: 1, endMonth: null, isActive: true,
    };
    setForm(prev => ({ ...prev, charges: [...prev.charges, c] }));
  };

  const updateCharge = (id: string, patch: Partial<SCIChargeItem>) => {
    setForm(prev => ({
      ...prev,
      charges: prev.charges.map(c => {
        if (c.id !== id) return c;
        const updated = { ...c, ...patch };
        if (patch.frequency === "MENSUELLE") updated.annualMonth = null;
        if (patch.frequency === "ANNUELLE" && updated.annualMonth === null) updated.annualMonth = 1;
        if (patch.label && isTaxExemptLabel(patch.label)) {
          updated.vatRate = 0;
          updated.amountType = "HT";
        }
        return updated;
      }),
    }));
  };

  const removeCharge = (id: string) =>
    setForm(prev => ({ ...prev, charges: prev.charges.filter(c => c.id !== id) }));

  // ── Other revenues ──
  const addRevenue = () => {
    const r: SCIRevenueItem = {
      id: uid(), nom: "Nouveau revenu", montant: 0,
      prixType: "HT", vatRate: defaultVatRate, frequency: "MENSUELLE",
      startMonth: 1, endMonth: null,
    };
    setForm(prev => ({ ...prev, otherRevenues: [...prev.otherRevenues, r] }));
  };

  const updateRevenue = (id: string, patch: Partial<SCIRevenueItem>) =>
    setForm(prev => ({ ...prev, otherRevenues: prev.otherRevenues.map(r => r.id === id ? { ...r, ...patch } : r) }));

  const removeRevenue = (id: string) =>
    setForm(prev => ({ ...prev, otherRevenues: prev.otherRevenues.filter(r => r.id !== id) }));

  const save = () => {
    updateSection("fonciere", form);
    validateSection("fonciere");
    toast.success("Section Foncière enregistrée");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Accordion type="multiple" defaultValue={["actifs", "credits", "revenus", "charges", "synthese"]} className="space-y-4">

        {/* ═══ SECTION 1 — Actifs immobilisés (lecture seule) ═══ */}
        <AccordionItem value="actifs" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold text-lg">1. Actifs immobilisés</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            {allAssets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun actif défini dans le module Build / CAPEX.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Valeur d'acquisition</TableHead>
                    <TableHead className="text-right">Mise en service</TableHead>
                    <TableHead className="text-right">Durée amort. (ans)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAssets.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{CAPEX_CATEGORY_LABELS[a.category]}</TableCell>
                      <TableCell>{a.label}</TableCell>
                      <TableCell className="text-right">{fmt(a.amount)} €</TableCell>
                      <TableCell className="text-right">{formatMonthIndex(a.commissioningMonth, projectStartDate)}</TableCell>
                      <TableCell className="text-right">{a.depreciationYears} ans</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="text-xs text-muted-foreground">
              Les amortissements sont calculés par le moteur financier.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/build")}>
              <ExternalLink className="h-4 w-4 mr-1" /> Modifier dans CAPEX
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* ═══ SECTION 2 — Crédits immobiliers (lecture seule) ═══ */}
        <AccordionItem value="credits" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold text-lg">2. Crédits immobiliers</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            {state.financement.sciDebts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun crédit SCI défini dans le module Financement.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Montant initial</TableHead>
                    <TableHead className="text-right">Taux</TableHead>
                    <TableHead className="text-right">Durée (mois)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.financement.sciDebts.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.label || `Crédit ${i + 1}`}</TableCell>
                      <TableCell className="text-right">{fmt(d.amount)} €</TableCell>
                      <TableCell className="text-right">{d.annualRate} %</TableCell>
                      <TableCell className="text-right">{d.durationMonths}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="text-xs text-muted-foreground">
              Les intérêts et mensualités sont calculés par le moteur financier.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/financement")}>
              <ExternalLink className="h-4 w-4 mr-1" /> Modifier dans Financement
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* ═══ SECTION 3 — Revenus fonciers ═══ */}
        <AccordionItem value="revenus" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold text-lg">3. Revenus fonciers</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Loyer dynamique (exploitation → SCI)</p>
                    <p className="text-2xl font-bold">{fmt(loyerMensuel)} € HT/mois</p>
                    <p className="text-xs text-muted-foreground">Mode : {state.loyerDynamique.mode.replace(/_/g, " ")}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/loyer-dynamique")}>
                    <ExternalLink className="h-4 w-4 mr-1" /> Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Autres revenus fonciers</h4>
                <Button variant="outline" size="sm" onClick={addRevenue}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>
              {form.otherRevenues.map(r => (
                <div key={r.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom</Label>
                      <Input value={r.nom} onChange={e => updateRevenue(r.id, { nom: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Montant</Label>
                      <Input type="number" value={r.montant} onChange={e => updateRevenue(r.id, { montant: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">HT/TTC</Label>
                      <Select value={r.prixType} onValueChange={v => updateRevenue(r.id, { prixType: v as "HT" | "TTC" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HT">HT</SelectItem>
                          <SelectItem value="TTC">TTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">TVA %</Label>
                      <Input type="number" step="1" value={Math.round(r.vatRate * 100)} onChange={e => updateRevenue(r.id, { vatRate: Number(e.target.value) / 100 })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Fréquence</Label>
                      <Select value={r.frequency} onValueChange={v => updateRevenue(r.id, { frequency: v as ChargeFrequency })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MENSUELLE">Mensuelle</SelectItem>
                          <SelectItem value="ANNUELLE">Annuelle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Début (mois)</Label>
                      <Input type="number" min={0} value={r.startMonth} onChange={e => updateRevenue(r.id, { startMonth: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fin (mois, optionnel)</Label>
                      <Input type="number" value={r.endMonth ?? ""} onChange={e => updateRevenue(r.id, { endMonth: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => removeRevenue(r.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ═══ SECTION 4 — Charges SCI ═══ */}
        <AccordionItem value="charges" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold text-lg">4. Charges SCI</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ajouter depuis un preset :</Label>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(SCI_CHARGE_PRESETS) as SCIChargeCategory[]).map(cat => (
                  <Button key={cat} variant={showPresets === cat ? "secondary" : "outline"} size="sm" className="text-xs"
                    onClick={() => setShowPresets(showPresets === cat ? null : cat)}>
                    {SCI_CATEGORY_LABELS[cat]}
                  </Button>
                ))}
              </div>
              {showPresets && SCI_CHARGE_PRESETS[showPresets].length > 0 && (
                <div className="flex flex-wrap gap-1 pl-2">
                  {SCI_CHARGE_PRESETS[showPresets].map(label => (
                    <Button key={label} variant="ghost" size="sm" className="text-xs h-7" onClick={() => addCharge(showPresets, label)}>
                      + {label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {form.charges.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Fréquence</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>TVA %</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.charges.map(c => {
                      const isTaxExempt = isTaxExemptLabel(c.label);
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Select value={c.category} onValueChange={v => updateCharge(c.id, { category: v as SCIChargeCategory })}>
                              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(Object.keys(SCI_CATEGORY_LABELS) as SCIChargeCategory[]).map(cat => (
                                  <SelectItem key={cat} value={cat}>{SCI_CATEGORY_LABELS[cat]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input className="w-40" value={c.label} onChange={e => updateCharge(c.id, { label: e.target.value })} /></TableCell>
                          <TableCell>
                            <Select value={c.frequency} onValueChange={v => updateCharge(c.id, { frequency: v as ChargeFrequency })}>
                              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MENSUELLE">Mensuelle</SelectItem>
                                <SelectItem value="ANNUELLE">Annuelle</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input type="number" className="w-24" value={c.amountInput} onChange={e => updateCharge(c.id, { amountInput: Number(e.target.value) })} /></TableCell>
                          <TableCell>
                            {isTaxExempt ? (
                              <span className="text-xs text-muted-foreground">0 % (taxe)</span>
                            ) : (
                              <Input type="number" step="1" className="w-16" value={Math.round(c.vatRate * 100)} onChange={e => updateCharge(c.id, { vatRate: Number(e.target.value) / 100 })} />
                            )}
                          </TableCell>
                          <TableCell><Checkbox checked={c.isActive} onCheckedChange={v => updateCharge(c.id, { isActive: !!v })} /></TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeCharge(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={() => addCharge()}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter une charge
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* ═══ SECTION 5 — Synthèse financière SCI ═══ */}
        <AccordionItem value="synthese" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold text-lg">5. Synthèse financière SCI</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <p className="text-xs text-muted-foreground mb-3">
              Valeurs calculées par le moteur financier à partir des données saisies.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]"></TableHead>
                  <TableHead className="text-right">Mensuel HT</TableHead>
                  <TableHead className="text-right">Annuel HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-muted-foreground">Loyer dynamique</TableCell>
                  <TableCell className="text-right font-medium">{fmt(sci.loyerMensuelHT)} €</TableCell>
                  <TableCell className="text-right font-medium">{fmt(sci.loyerMensuelHT * 12)} €</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Autres revenus</TableCell>
                  <TableCell className="text-right font-medium">{fmt(sci.totalOtherRevenuesMensuellesHT)} €</TableCell>
                  <TableCell className="text-right font-medium">{fmt(sci.totalOtherRevenuesMensuellesHT * 12)} €</TableCell>
                </TableRow>
                <TableRow className="font-semibold">
                  <TableCell>Total revenus fonciers</TableCell>
                  <TableCell className="text-right">{fmt(sci.totalRevenusMensuelHT)} €</TableCell>
                  <TableCell className="text-right">{fmt(sci.totalRevenusMensuelHT * 12)} €</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">− Charges SCI</TableCell>
                  <TableCell className="text-right font-medium">−{fmt(sci.totalChargesMensuellesHT)} €</TableCell>
                  <TableCell className="text-right font-medium">−{fmt(sci.totalChargesMensuellesHT * 12)} €</TableCell>
                </TableRow>
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>= Résultat d'exploitation SCI</TableCell>
                  <TableCell className={`text-right ${sci.resultatExploitationSCI >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(sci.resultatExploitationSCI)} €</TableCell>
                  <TableCell className={`text-right ${sci.resultatExploitationSCI >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(sci.resultatExploitationSCI * 12)} €</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">− Intérêts crédits</TableCell>
                  <TableCell className="text-right font-medium">−{fmt(sci.interetsMensuels)} €</TableCell>
                  <TableCell className="text-right font-medium">−{fmt(sci.interetsMensuels * 12)} €</TableCell>
                </TableRow>
                <TableRow className="border-t font-semibold">
                  <TableCell>= Résultat courant</TableCell>
                  <TableCell className={`text-right ${sci.resultatCourant >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(sci.resultatCourant)} €</TableCell>
                  <TableCell className={`text-right ${sci.resultatCourant >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(sci.resultatCourant * 12)} €</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">− Amortissements</TableCell>
                  <TableCell className="text-right font-medium">−{fmt(sci.amortissementAnnuel / 12)} €</TableCell>
                  <TableCell className="text-right font-medium">−{fmt(sci.amortissementAnnuel)} €</TableCell>
                </TableRow>
                <TableRow className="border-t-2 font-bold">
                  <TableCell>= Résultat fiscal SCI</TableCell>
                  <TableCell className={`text-right ${sci.resultatFiscal >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(sci.resultatFiscal)} €</TableCell>
                  <TableCell className={`text-right ${sci.resultatFiscal >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(sci.resultatFiscal * 12)} €</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button onClick={save} className="w-full">Enregistrer</Button>
    </div>
  );
}
