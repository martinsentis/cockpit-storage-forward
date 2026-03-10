import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Settings2,
  ChevronDown,
  RotateCcw,
  Save,
  Check,
} from "lucide-react";
import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useScenario } from "@/contexts/ScenarioContext";
import { toast } from "@/hooks/use-toast";
import type { RampCurve } from "@/types/project";
import type { RentStrategyMode } from "@/types/project";

const RAMP_CURVE_LABELS: Record<RampCurve, string> = {
  LINEAR: "Linéaire",
  FAST_START: "Rapide puis plateau",
  SLOW_START: "Logistique",
};

const RENT_PRESET_LABELS: Record<RentPreset, string> = {
  SCI_AUTONOMY: "Autonomie financière SCI",
  DEBT_PAYDOWN: "Désendettement SCI",
  OPTIMIZATION: "Optimisation fiscale",
  MIX: "Mixte",
  FIXED_AMOUNT: "Montant fixe",
};

function formatPhaseDate(startMonth: number, projectStartDate: string): string {
  if (!projectStartDate) return `Mois ${startMonth}`;
  const [yearStr, monthStr] = projectStartDate.split("-");
  const baseYear = parseInt(yearStr, 10);
  const baseMonth = parseInt(monthStr, 10) - 1; // 0-indexed
  const totalMonths = baseMonth + startMonth;
  const year = baseYear + Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  return `${monthNames[month]} ${year}`;
}

export function ProjectionHeader() {
  const { state } = useProject();
  const {
    scenarioState,
    updateScenarioField,
    updatePhaseOverride,
    resetToDefaults,
  } = useScenario();
  const [open, setOpen] = useState(true);

  const phases = state.exploitation.capacityPhases;
  const projectStartDate = state.projet.projectStartDate;

  const handleApply = () => {
    toast({ title: "Hypothèses appliquées", description: "Le scénario de travail a été mis à jour." });
  };

  const handleSave = () => {
    toast({ title: "Sauvegarde", description: "Fonctionnalité de sauvegarde de scénario à venir." });
  };

  const handleReset = () => {
    resetToDefaults();
    toast({ title: "Réinitialisé", description: "Les hypothèses ont été remises aux valeurs par défaut." });
  };

  return (
    <div className="space-y-4">
      {/* Scenario context line */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Scénario actif :</span>
              <Badge>Working scenario</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="compare-select" className="text-sm text-muted-foreground whitespace-nowrap">
                Comparer avec :
              </Label>
              <Select
                value={scenarioState.compareWith}
                onValueChange={(v) => updateScenarioField("compareWith", v as "none" | "baseline" | "snapshot")}
              >
                <SelectTrigger id="compare-select" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  <SelectItem value="baseline">Baseline</SelectItem>
                  <SelectItem value="snapshot">Snapshot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hypotheses panel */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-4 hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5" />
                Hypothèses structurantes
                <ChevronDown className={`ml-auto h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* 4.1 — Indexations */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Indexations</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="idx-ca">Indexation CA exploitation (%)</Label>
                    <Input
                      id="idx-ca"
                      type="number"
                      step={0.1}
                      value={(scenarioState.indexationCA * 100).toFixed(1)}
                      onChange={(e) => updateScenarioField("indexationCA", (Number(e.target.value) || 0) / 100)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="idx-charges">Indexation charges (%)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="idx-charges"
                        type="number"
                        step={0.1}
                        className="flex-1"
                        value={(scenarioState.indexationCharges * 100).toFixed(1)}
                        onChange={(e) => updateScenarioField("indexationCharges", (Number(e.target.value) || 0) / 100)}
                      />
                      <Select
                        value={scenarioState.indexationChargesTarget}
                        onValueChange={(v) =>
                          updateScenarioField("indexationChargesTarget", v as "exploitation" | "fonciere" | "les_deux")
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exploitation">Exploitation</SelectItem>
                          <SelectItem value="fonciere">Foncière</SelectItem>
                          <SelectItem value="les_deux">Les deux</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="idx-autres">Indexation autres revenus foncière (%)</Label>
                    <Input
                      id="idx-autres"
                      type="number"
                      step={0.1}
                      value={(scenarioState.indexationAutresRevenusFonciere * 100).toFixed(1)}
                      onChange={(e) =>
                        updateScenarioField("indexationAutresRevenusFonciere", (Number(e.target.value) || 0) / 100)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 4.1b — Mode de loyer */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Mode de loyer</h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-muted-foreground">Mode actuel :</span>
                  <Badge variant="secondary">{RENT_PRESET_LABELS[scenarioState.rentPreset]}</Badge>
                </div>
                <div className="max-w-xs space-y-2">
                  <Select
                    value={scenarioState.rentPreset}
                    onValueChange={(v) => updateScenarioField("rentPreset", v as RentPreset)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RENT_PRESET_LABELS) as RentPreset[]).map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          {RENT_PRESET_LABELS[preset]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Ce paramètre modifie uniquement le mode de calcul du loyer dans le scénario courant.
                    Le calcul du loyer sera effectué par le moteur de projection.
                  </p>
                </div>
              </div>

              <Separator />

              {/* 4.2 — Remplissage */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Remplissage des box
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Pourcentage de surface louée cible pour l'ensemble du capacitaire</Label>
                    <span className="text-sm font-semibold tabular-nums">
                      {Math.round(scenarioState.targetOccupancy * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[Math.round(scenarioState.targetOccupancy * 100)]}
                    onValueChange={([v]) => updateScenarioField("targetOccupancy", v / 100)}
                  />
                </div>
              </div>

              <Separator />

              {/* 4.3 — Ramp-up par phase */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Ramp-up par phase
                </h4>
                <div className="space-y-4">
                  {phases.map((phase, idx) => {
                    const override = scenarioState.phaseOverrides[phase.id];
                    const rampUpMonths = override?.rampUpMonths ?? phase.rampUpMonths;
                    const rampCurve = override?.rampCurve ?? phase.rampCurve;

                    return (
                      <Card key={phase.id} className="border-dashed">
                        <CardContent className="py-4">
                          <div className="mb-3">
                            <p className="font-medium">Phase {idx + 1} — {phase.nom}</p>
                            <p className="text-sm text-muted-foreground">
                              Mise en exploitation : {formatPhaseDate(phase.startMonth, projectStartDate)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Surface : {phase.surface.toLocaleString("fr-FR")} m²
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label>Durée de ramp-up (mois)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={rampUpMonths}
                                onChange={(e) =>
                                  updatePhaseOverride(phase.id, { rampUpMonths: Number(e.target.value) || 0 })
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Forme de courbe</Label>
                              <Select
                                value={rampCurve}
                                onValueChange={(v) => updatePhaseOverride(phase.id, { rampCurve: v as RampCurve })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(RAMP_CURVE_LABELS) as RampCurve[]).map((curve) => (
                                    <SelectItem key={curve} value={curve}>
                                      {RAMP_CURVE_LABELS[curve]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {phases.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Aucune phase capacitaire configurée.</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* 4.4 — Salaire gestionnaire */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Salaire du gestionnaire
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="gest-net">Net mensuel cible (€)</Label>
                    <Input
                      id="gest-net"
                      type="number"
                      min={0}
                      value={scenarioState.gestionnaireNetMensuel}
                      onChange={(e) => updateScenarioField("gestionnaireNetMensuel", Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gest-start">Date de début</Label>
                    <Input
                      id="gest-start"
                      type="month"
                      value={scenarioState.gestionnaireStartDate ?? ""}
                      onChange={(e) =>
                        updateScenarioField("gestionnaireStartDate", e.target.value || null)
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Checkbox
                        id="gest-has-end"
                        checked={scenarioState.gestionnaireHasEndDate}
                        onCheckedChange={(v) => {
                          updateScenarioField("gestionnaireHasEndDate", !!v);
                          if (!v) updateScenarioField("gestionnaireEndDate", null);
                        }}
                      />
                      <Label htmlFor="gest-has-end" className="cursor-pointer">Date de fin</Label>
                    </div>
                    <Input
                      id="gest-end"
                      type="month"
                      disabled={!scenarioState.gestionnaireHasEndDate}
                      value={scenarioState.gestionnaireEndDate ?? ""}
                      onChange={(e) =>
                        updateScenarioField("gestionnaireEndDate", e.target.value || null)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleApply} className="gap-2">
                  <Check className="h-4 w-4" />
                  Appliquer
                </Button>
                <Button variant="outline" onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Sauvegarder
                </Button>
                <Button variant="ghost" onClick={handleReset} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
