import { useState, useRef, useCallback, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChevronLeft, ChevronRight, Boxes, LayoutGrid, Check } from "lucide-react";
import type {
  CapacityPhase, PhaseDraft, PhaseCapexEstimate, PhaseFinancingLine,
  PhaseFinancingSource, BoxMode, Typologie, RampCurve,
} from "@/types/project";
import { FINANCING_SOURCE_LABELS } from "@/types/project";

function uid() { return crypto.randomUUID(); }
function fmt(n: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n); }

const STEPS = [
  { title: "Mode de création", desc: "Choisissez comment définir la capacité de stockage" },
  { title: "Paramétrage capacitaire", desc: "Définissez la surface et les prix" },
  { title: "Ramp-up", desc: "Planifiez la montée en occupation" },
  { title: "CAPEX estimatif", desc: "Estimez les coûts d'investissement" },
  { title: "Financement du CAPEX", desc: "Répartissez les sources de financement" },
  { title: "Traitement comptable", desc: "Définissez l'amortissement" },
  { title: "Synthèse", desc: "Vérifiez et validez votre phase" },
];

const RAMP_LABELS: Record<RampCurve, string> = {
  LINEAR: "Linéaire",
  FAST_START: "Progression rapide puis plateau",
  SLOW_START: "Courbe logistique (lente au début)",
};

interface Props {
  phase: CapacityPhase;
  existingPhases: CapacityPhase[];
  onUpdate: (patch: Partial<CapacityPhase>) => void;
  onFinalize: () => void;
  onClose: () => void;
  defaultVatRate: number;
  projectStartDate: string;
}

export default function CapacityPhaseWizard({
  phase, existingPhases, onUpdate, onFinalize, onClose, defaultVatRate,
}: Props) {
  const [step, setStep] = useState(phase.draft?.currentStep ?? 0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedUpdate = useCallback((patch: Partial<CapacityPhase>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onUpdate(patch), 300);
  }, [onUpdate]);

  const draft = phase.draft!;
  const capex = draft.capexEstimate;

  const updateDraft = useCallback((patch: Partial<PhaseDraft>) => {
    debouncedUpdate({ draft: { ...draft, ...patch } });
  }, [draft, debouncedUpdate]);

  const updateCapex = useCallback((patch: Partial<PhaseCapexEstimate>) => {
    updateDraft({ capexEstimate: { ...capex, ...patch } });
  }, [capex, updateDraft]);

  // Surface calculation (works for both modes)
  const totalSurface = phase.modeBox === "TYPOLOGIE"
    ? phase.typologies.reduce((s, t) => s + t.surfaceParBox * t.nombreDeBox, 0)
    : phase.surface;

  const capexTotal = useMemo(() => {
    const equip = capex.equipementProductifM2 * totalSurface;
    return equip + capex.amenagement + capex.taxeAmenagement + capex.honoraires + capex.divers;
  }, [capex, totalSurface]);

  const financingTotal = draft.financing.reduce((s, f) => s + f.montant, 0);
  const financingDelta = financingTotal - capexTotal;

  // Pre-fill helpers
  const avgPrixM2 = existingPhases.length > 0
    ? existingPhases.reduce((s, p) => s + p.prixM2, 0) / existingPhases.length
    : undefined;

  const avgEquipM2 = useMemo(() => {
    const withCapex = existingPhases.filter(p => p.draft === undefined);
    // No historical CAPEX data available yet (placeholder)
    return undefined;
  }, [existingPhases]);

  const goNext = () => {
    const next = Math.min(step + 1, 6);
    setStep(next);
    onUpdate({ draft: { ...draft, currentStep: next } });
  };
  const goPrev = () => {
    const prev = Math.max(step - 1, 0);
    setStep(prev);
    onUpdate({ draft: { ...draft, currentStep: prev } });
  };

  const canGoNext = (): boolean => {
    if (step === 4) return Math.abs(financingDelta) < 0.01 || capexTotal === 0;
    return true;
  };

  // Financing helpers
  const addFinancingLine = () => {
    const line: PhaseFinancingLine = { id: uid(), source: "TRESORERIE", montant: 0 };
    updateDraft({ financing: [...draft.financing, line] });
  };
  const updateFinancingLine = (id: string, patch: Partial<PhaseFinancingLine>) => {
    const updated = draft.financing.map(f => {
      if (f.id !== id) return f;
      const line = { ...f, ...patch };
      if (capexTotal > 0) line.percent = Math.round((line.montant / capexTotal) * 100);
      return line;
    });
    updateDraft({ financing: updated });
  };
  const removeFinancingLine = (id: string) => {
    updateDraft({ financing: draft.financing.filter(f => f.id !== id) });
  };

  // Typology helpers for wizard
  const addTypo = () => {
    const t: Typologie = { id: uid(), nom: "Nouveau type", surfaceParBox: 5, nombreDeBox: 10, prixMensuel: 100, prixType: "HT", vatRate: defaultVatRate, actif: true };
    debouncedUpdate({ typologies: [...phase.typologies, t] });
  };
  const updateTypo = (tid: string, patch: Partial<Typologie>) => {
    debouncedUpdate({ typologies: phase.typologies.map(t => t.id === tid ? { ...t, ...patch } : t) });
  };
  const removeTypo = (tid: string) => {
    debouncedUpdate({ typologies: phase.typologies.filter(t => t.id !== tid) });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>{STEPS[step].title}</DialogTitle>
            <Badge variant="secondary" className="text-xs">Étape {step + 1} / 7</Badge>
          </div>
          <DialogDescription>{STEPS[step].desc}</DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="min-h-[300px] py-4">
          {/* ═══ Step 0: Mode ═══ */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${phase.modeBox === "MACRO" ? "ring-2 ring-primary" : ""}`}
                onClick={() => debouncedUpdate({ modeBox: "MACRO" as BoxMode })}
              >
                <CardContent className="pt-6 text-center space-y-3">
                  <LayoutGrid className="h-10 w-10 mx-auto text-primary" />
                  <h3 className="font-semibold">Capacitaire macro</h3>
                  <p className="text-sm text-muted-foreground">Surface totale en m², prix moyen au m²</p>
                  {phase.modeBox === "MACRO" && <Check className="h-5 w-5 mx-auto text-primary" />}
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${phase.modeBox === "TYPOLOGIE" ? "ring-2 ring-primary" : ""}`}
                onClick={() => debouncedUpdate({ modeBox: "TYPOLOGIE" as BoxMode })}
              >
                <CardContent className="pt-6 text-center space-y-3">
                  <Boxes className="h-10 w-10 mx-auto text-primary" />
                  <h3 className="font-semibold">Par typologie de box</h3>
                  <p className="text-sm text-muted-foreground">Types de box avec surface et quantité</p>
                  {phase.modeBox === "TYPOLOGIE" && <Check className="h-5 w-5 mx-auto text-primary" />}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ Step 1: Paramétrage ═══ */}
          {step === 1 && phase.modeBox === "MACRO" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de la phase</Label>
                <Input value={phase.nom} onChange={e => debouncedUpdate({ nom: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Surface totale créée (m²)</Label>
                  <Input type="number" value={phase.surface || ""} onChange={e => debouncedUpdate({ surface: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Prix moyen au m² / mois (€ HT)</Label>
                  <Input
                    type="number" step="0.5"
                    value={phase.prixM2 || ""}
                    placeholder={avgPrixM2 ? `Suggestion : ${fmt(avgPrixM2)} €` : ""}
                    onChange={e => debouncedUpdate({ prixM2: Number(e.target.value) })}
                  />
                  {avgPrixM2 && phase.prixM2 === 0 && (
                    <p className="text-xs text-muted-foreground">Prix moyen observé : {fmt(avgPrixM2)} €/m²</p>
                  )}
                </div>
              </div>
              {phase.surface > 0 && phase.prixM2 > 0 && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">CA mensuel potentiel HT : </span>
                  <strong>{fmt(phase.surface * phase.prixM2)} €</strong>
                </div>
              )}
            </div>
          )}

          {step === 1 && phase.modeBox === "TYPOLOGIE" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de la phase</Label>
                <Input value={phase.nom} onChange={e => debouncedUpdate({ nom: e.target.value })} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Surface (m²)</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Prix/mois</TableHead>
                    <TableHead>CA potentiel</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phase.typologies.map(t => (
                    <TableRow key={t.id}>
                      <TableCell><Input className="w-28" value={t.nom} onChange={e => updateTypo(t.id, { nom: e.target.value })} /></TableCell>
                      <TableCell><Input type="number" className="w-20" value={t.surfaceParBox} onChange={e => updateTypo(t.id, { surfaceParBox: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input type="number" className="w-16" value={t.nombreDeBox} onChange={e => updateTypo(t.id, { nombreDeBox: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input type="number" className="w-20" value={t.prixMensuel} onChange={e => updateTypo(t.id, { prixMensuel: Number(e.target.value) })} /></TableCell>
                      <TableCell className="text-sm font-medium">{fmt(t.nombreDeBox * t.prixMensuel)} €</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeTypo(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={addTypo}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter une typologie
              </Button>
              {totalSurface > 0 && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">Surface totale : </span><strong>{fmt(totalSurface)} m²</strong>
                  <span className="ml-4 text-muted-foreground">CA potentiel : </span>
                  <strong>{fmt(phase.typologies.reduce((s, t) => s + t.nombreDeBox * t.prixMensuel, 0))} €/mois</strong>
                </div>
              )}
            </div>
          )}

          {/* ═══ Step 2: Ramp-up ═══ */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mois de début d'exploitation</Label>
                  <Input type="number" min={0} value={phase.startMonth || ""} placeholder="Ex: 6" onChange={e => debouncedUpdate({ startMonth: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Mois après le début du projet</p>
                </div>
                <div className="space-y-2">
                  <Label>Taux d'occupation cible (%)</Label>
                  <Input type="number" min={0} max={100} value={phase.targetOccupancy ? Math.round(phase.targetOccupancy * 100) : ""} placeholder="Ex: 85" onChange={e => debouncedUpdate({ targetOccupancy: Number(e.target.value) / 100 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Durée de montée en charge (mois)</Label>
                <Input type="number" min={1} value={phase.rampUpMonths || ""} placeholder="Ex: 12" onChange={e => debouncedUpdate({ rampUpMonths: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Forme de la courbe</Label>
                <RadioGroup value={phase.rampCurve} onValueChange={v => debouncedUpdate({ rampCurve: v as RampCurve })}>
                  {(["LINEAR", "FAST_START", "SLOW_START"] as RampCurve[]).map(c => (
                    <div key={c} className="flex items-center space-x-2">
                      <RadioGroupItem value={c} id={`rc-${c}`} />
                      <Label htmlFor={`rc-${c}`}>{RAMP_LABELS[c]}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* ═══ Step 3: CAPEX ═══ */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Équipement productif (€/m²)</Label>
                  <Input type="number" value={capex.equipementProductifM2 || ""} placeholder="€/m²" onChange={e => updateCapex({ equipementProductifM2: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Surface : {fmt(totalSurface)} m² → {fmt(capex.equipementProductifM2 * totalSurface)} €</p>
                </div>
                <div className="space-y-2">
                  <Label>Aménagement / travaux (€)</Label>
                  <Input type="number" value={capex.amenagement || ""} onChange={e => updateCapex({ amenagement: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Taxe d'aménagement (€)</Label>
                  <Input type="number" value={capex.taxeAmenagement || ""} onChange={e => updateCapex({ taxeAmenagement: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Honoraires (€)</Label>
                  <Input type="number" value={capex.honoraires || ""} onChange={e => updateCapex({ honoraires: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Divers / imprévus (€)</Label>
                <Input type="number" value={capex.divers || ""} onChange={e => updateCapex({ divers: Number(e.target.value) })} />
              </div>
              <Separator />
              <div className="rounded-md bg-muted p-4 flex justify-between items-center">
                <span className="font-semibold">CAPEX total estimé</span>
                <span className="text-lg font-bold">{fmt(capexTotal)} €</span>
              </div>
            </div>
          )}

          {/* ═══ Step 4: Financement ═══ */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">Trésorerie estimée disponible à la date de la phase : </span>
                <strong className="text-foreground">— € (projection à venir)</strong>
              </div>

              <div className="rounded-md bg-muted p-3 text-sm flex justify-between">
                <span>CAPEX total à financer</span>
                <strong>{fmt(capexTotal)} €</strong>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Montant (€)</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.financing.map(f => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Select value={f.source} onValueChange={v => updateFinancingLine(f.id, { source: v as PhaseFinancingSource })}>
                          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(FINANCING_SOURCE_LABELS) as PhaseFinancingSource[]).map(s => (
                              <SelectItem key={s} value={s}>{FINANCING_SOURCE_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="w-32" value={f.montant || ""} onChange={e => updateFinancingLine(f.id, { montant: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {capexTotal > 0 ? `${Math.round((f.montant / capexTotal) * 100)} %` : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeFinancingLine(f.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button variant="outline" size="sm" onClick={addFinancingLine}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter une source
              </Button>

              {capexTotal > 0 && Math.abs(financingDelta) > 0.01 && (
                <div className={`rounded-md p-3 text-sm font-medium ${financingDelta < 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-destructive/10 text-destructive"}`}>
                  {financingDelta < 0
                    ? `Reste à financer : ${fmt(Math.abs(financingDelta))} €`
                    : `Surfinancement : ${fmt(financingDelta)} €`}
                </div>
              )}

              {capexTotal > 0 && Math.abs(financingDelta) < 0.01 && (
                <div className="rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm font-medium text-green-700 dark:text-green-300">
                  ✓ Financement équilibré
                </div>
              )}
            </div>
          )}

          {/* ═══ Step 5: Comptable ═══ */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="font-semibold">Entité porteuse de l'investissement</Label>
                <RadioGroup value={draft.entityPorteuse} onValueChange={v => updateDraft({ entityPorteuse: v as "SCI" | "EXPLOITATION" })}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SCI" id="ep-sci" />
                    <Label htmlFor="ep-sci">SCI (foncière)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EXPLOITATION" id="ep-expl" />
                    <Label htmlFor="ep-expl">Société d'exploitation</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="font-semibold">Amortissable</Label>
                  <Switch checked={draft.amortissable} onCheckedChange={v => updateDraft({ amortissable: v })} />
                </div>
                {draft.amortissable && (
                  <div className="space-y-2">
                    <Label>Durée d'amortissement (années)</Label>
                    <Input type="number" min={1} value={draft.dureeAmortissement} onChange={e => updateDraft({ dureeAmortissement: Number(e.target.value) })} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ Step 6: Synthèse ═══ */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: "Nom", value: phase.nom },
                  { label: "Mode", value: phase.modeBox === "MACRO" ? "Macro" : "Typologie" },
                  { label: "Surface", value: `${fmt(totalSurface)} m²` },
                  { label: "CAPEX total", value: `${fmt(capexTotal)} €` },
                  { label: "Début exploitation", value: `Mois ${phase.startMonth}` },
                  { label: "Occupation cible", value: `${Math.round(phase.targetOccupancy * 100)} %` },
                  { label: "Durée ramp-up", value: `${phase.rampUpMonths} mois` },
                  { label: "Courbe", value: RAMP_LABELS[phase.rampCurve] },
                  { label: "Entité porteuse", value: draft.entityPorteuse === "SCI" ? "SCI" : "Exploitation" },
                  { label: "Amortissement", value: draft.amortissable ? `${draft.dureeAmortissement} ans` : "Non amortissable" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-1 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>

              {draft.financing.length > 0 && (
                <>
                  <Label className="font-semibold">Répartition du financement</Label>
                  <div className="space-y-1">
                    {draft.financing.map(f => (
                      <div key={f.id} className="flex justify-between text-sm py-1">
                        <span className="text-muted-foreground">{FINANCING_SOURCE_LABELS[f.source]}</span>
                        <span>{fmt(f.montant)} € ({capexTotal > 0 ? Math.round((f.montant / capexTotal) * 100) : 0} %)</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-2 border-t border-border">
          <Button variant="outline" onClick={step === 0 ? onClose : goPrev}>
            {step === 0 ? "Annuler" : <><ChevronLeft className="h-4 w-4 mr-1" /> Précédent</>}
          </Button>
          {step < 6 ? (
            <Button onClick={goNext} disabled={!canGoNext()}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={onFinalize}>
              <Check className="h-4 w-4 mr-1" /> Créer cette phase capacitaire
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
