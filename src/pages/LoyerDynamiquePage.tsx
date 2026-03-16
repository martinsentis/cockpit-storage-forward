import { useState, useMemo } from "react";

import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { RentStrategyMode, RentPlanPhase } from "@/types/project";
import { computeEngine } from "@/engine/engine";
import { fetchEngine } from "@/hooks/useEngine";
import type { EngineInputs } from "@/engine/engineTypes";

function fmt(n: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n); }

const MODE_LABELS: Record<RentStrategyMode, string> = {
  SCI_AUTONOMY: "Autonomie financière SCI",
  DEBT_PAYDOWN: "Désendettement SCI",
  OPTIMIZATION: "Optimisation fiscale",
  MIX: "Mix (autonomie + résultat cible)",
  FIXED_AMOUNT: "Montant fixe",
};

const MODE_DESCRIPTIONS: Record<RentStrategyMode, string> = {
  SCI_AUTONOMY: "Le loyer couvre les charges de la SCI et les intérêts des crédits.",
  DEBT_PAYDOWN: "Le loyer couvre les charges, les intérêts et le remboursement du capital.",
  OPTIMIZATION: "Le loyer est optimisé fiscalement (calcul backend).",
  MIX: "Le loyer est calculé pour couvrir la SCI tout en préservant un résultat cible.",
  FIXED_AMOUNT: "Le loyer est un montant fixe défini manuellement.",
};

export default function LoyerDynamiquePage() {
  const { state, updateSection, validateSection } = useProject();

  const [phases, setPhases] = useState<RentPlanPhase[]>(() =>
    [...state.loyerDynamique.rentPlan].sort((a, b) => a.startMonth - b.startMonth)
  );

  // Engine for informative indicators only
  const inputs = useMemo<EngineInputs>(() => ({
    ...state,
    loyerDynamique: { rentPlan: phases },
  }), [state, phases]);

  const { data: engineOutputs } = useQuery({
    queryKey: ["engine-loyer", inputs],
    queryFn: () => fetchEngine(inputs),
    initialData: computeEngine(inputs),
    staleTime: 10_000,
  });

  const computed = engineOutputs.loyerDynamique;

  const updatePhase = (id: string, updater: (p: RentPlanPhase) => RentPlanPhase) => {
    setPhases(prev => prev.map(p => p.id === id ? updater(p) : p));
  };

  const addPhase = () => {
    const lastMonth = phases.length > 0 ? phases[phases.length - 1].startMonth : -1;
    setPhases(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        startMonth: lastMonth + 1,
        strategy: { mode: "SCI_AUTONOMY", parameters: {} },
      },
    ]);
  };

  const removePhase = (id: string) => {
    if (phases.length <= 1) return;
    setPhases(prev => prev.filter(p => p.id !== id));
  };

  const save = () => {
    // Sort by startMonth
    const sorted = [...phases].sort((a, b) => a.startMonth - b.startMonth);

    // Validate no duplicate startMonth
    const months = sorted.map(p => p.startMonth);
    const hasDuplicates = new Set(months).size !== months.length;
    if (hasDuplicates) {
      toast.error("Chaque phase doit avoir un mois de démarrage unique.");
      return;
    }

    // Validate startMonth >= 0
    if (sorted.some(p => p.startMonth < 0)) {
      toast.error("Le mois de démarrage doit être ≥ 0.");
      return;
    }

    // Validate ratios 0-1
    for (const p of sorted) {
      const params = p.strategy.parameters;
      if (params.rn_exploitation_floor_ratio != null && (params.rn_exploitation_floor_ratio < 0 || params.rn_exploitation_floor_ratio > 1)) {
        toast.error("Le ratio plancher exploitation doit être entre 0 et 1.");
        return;
      }
      if (params.target_sci_result_ratio != null && (params.target_sci_result_ratio < 0 || params.target_sci_result_ratio > 1)) {
        toast.error("Le ratio résultat SCI cible doit être entre 0 et 1.");
        return;
      }
      if (params.fixed_rent_amount != null && params.fixed_rent_amount < 0) {
        toast.error("Le montant fixe du loyer doit être ≥ 0.");
        return;
      }
    }

    setPhases(sorted);
    updateSection("loyerDynamique", { rentPlan: sorted });
    validateSection("loyerDynamique");
    toast.success("Plan de loyer enregistré");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Informative indicators */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Indicateurs financiers SCI</CardTitle>
            <Badge variant="outline" className="text-xs">Informatif</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Valeurs calculées localement à titre indicatif. Le calcul définitif est réalisé par le moteur backend.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Composante</TableHead>
                <TableHead className="text-right">Mensuel</TableHead>
                <TableHead className="text-right">Annuel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground">Charges SCI</TableCell>
                <TableCell className="text-right">{fmt(computed.sciCharges)} €</TableCell>
                <TableCell className="text-right">{fmt(computed.sciCharges * 12)} €</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Intérêts crédits SCI</TableCell>
                <TableCell className="text-right">{fmt(computed.interets)} €</TableCell>
                <TableCell className="text-right">{fmt(computed.interets * 12)} €</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Remboursement capital</TableCell>
                <TableCell className="text-right">{fmt(computed.principal)} €</TableCell>
                <TableCell className="text-right">{fmt(computed.principal * 12)} €</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rent Plan Phases */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Plan de loyer</CardTitle>
            <Button variant="outline" size="sm" onClick={addPhase}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter une phase
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Définissez la stratégie de loyer par phase temporelle. Le moteur backend appliquera chaque phase selon son mois de démarrage.
          </p>

          {phases.map((phase, index) => (
            <Card key={phase.id} className="border-dashed">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Phase {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePhase(phase.id)}
                    disabled={phases.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mois de démarrage</Label>
                    <Input
                      type="number"
                      min={0}
                      value={phase.startMonth}
                      onChange={e => updatePhase(phase.id, p => ({ ...p, startMonth: Math.max(0, Number(e.target.value)) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mode de calcul</Label>
                    <Select
                      value={phase.strategy.mode}
                      onValueChange={v => updatePhase(phase.id, p => ({
                        ...p,
                        strategy: { mode: v as RentStrategyMode, parameters: {} },
                      }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(MODE_LABELS) as RentStrategyMode[]).map(mode => (
                          <SelectItem key={mode} value={mode}>{MODE_LABELS[mode]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{MODE_DESCRIPTIONS[phase.strategy.mode]}</p>

                {/* Conditional parameters */}
                {phase.strategy.mode === "OPTIMIZATION" && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <div className="space-y-2">
                      <Label>Ratio plancher exploitation (0-1)</Label>
                      <Input
                        type="number"
                        min={0} max={1} step={0.01}
                        placeholder="Ex: 0.03 pour 3%"
                        value={phase.strategy.parameters.rn_exploitation_floor_ratio ?? ""}
                        onChange={e => updatePhase(phase.id, p => ({
                          ...p,
                          strategy: { ...p.strategy, parameters: { ...p.strategy.parameters, rn_exploitation_floor_ratio: e.target.value ? Number(e.target.value) : undefined } },
                        }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={phase.strategy.parameters.use_market_rent_cap ?? false}
                        onCheckedChange={checked => updatePhase(phase.id, p => ({
                          ...p,
                          strategy: { ...p.strategy, parameters: { ...p.strategy.parameters, use_market_rent_cap: !!checked, ...(!checked ? { market_rent_cap: undefined } : {}) } },
                        }))}
                      />
                      <Label>Activer le plafond de marché</Label>
                    </div>
                    {phase.strategy.parameters.use_market_rent_cap && (
                      <div className="space-y-2">
                        <Label>Plafond de marché (€/mois)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={phase.strategy.parameters.market_rent_cap ?? ""}
                          onChange={e => updatePhase(phase.id, p => ({
                            ...p,
                            strategy: { ...p.strategy, parameters: { ...p.strategy.parameters, market_rent_cap: e.target.value ? Number(e.target.value) : undefined } },
                          }))}
                        />
                      </div>
                    )}
                  </div>
                )}

                {phase.strategy.mode === "DEBT_PAYDOWN" && (
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <Label>Ratio plancher exploitation (0-1)</Label>
                    <Input
                      type="number"
                      min={0} max={1} step={0.01}
                      placeholder="Ex: 0.03 pour 3%"
                      value={phase.strategy.parameters.rn_exploitation_floor_ratio ?? ""}
                      onChange={e => updatePhase(phase.id, p => ({
                        ...p,
                        strategy: { ...p.strategy, parameters: { ...p.strategy.parameters, rn_exploitation_floor_ratio: e.target.value ? Number(e.target.value) : undefined } },
                      }))}
                    />
                  </div>
                )}

                {phase.strategy.mode === "MIX" && (
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <Label>Ratio résultat SCI cible (0-1)</Label>
                    <Input
                      type="number"
                      min={0} max={1} step={0.01}
                      placeholder="Ex: 0.05 pour 5%"
                      value={phase.strategy.parameters.target_sci_result_ratio ?? ""}
                      onChange={e => updatePhase(phase.id, p => ({
                        ...p,
                        strategy: { ...p.strategy, parameters: { ...p.strategy.parameters, target_sci_result_ratio: e.target.value ? Number(e.target.value) : undefined } },
                      }))}
                    />
                  </div>
                )}

                {phase.strategy.mode === "FIXED_AMOUNT" && (
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <Label>Loyer mensuel fixe (€/mois)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Montant en €/mois"
                      value={phase.strategy.parameters.fixed_rent_amount ?? ""}
                      onChange={e => updatePhase(phase.id, p => ({
                        ...p,
                        strategy: { ...p.strategy, parameters: { ...p.strategy.parameters, fixed_rent_amount: e.target.value ? Number(e.target.value) : undefined } },
                      }))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Impact preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Aperçu impact</CardTitle>
            <Badge variant="outline" className="text-xs">Informatif</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Estimation basée sur la dernière phase du plan. Valeurs définitives calculées par le moteur backend.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">Impact Exploitation (SAS)</p>
              <p className={`text-xl font-bold ${computed.exploitationImpact >= 0 ? "text-green-600" : "text-destructive"}`}>
                {fmt(computed.exploitationImpact)} €/mois
              </p>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">Impact SCI (revenu)</p>
              <p className="text-xl font-bold text-green-600">+{fmt(computed.loyerCalcule)} €/mois</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full">Enregistrer</Button>
    </div>
  );
}
