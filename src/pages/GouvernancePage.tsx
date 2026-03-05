import { useState, useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDown, Info, ShieldCheck, Eye, History, ChevronUp, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  GouvernanceData,
  GlobalGouvernanceRule,
  EntityGouvernanceRule,
  CashAllocationStep,
  AllocationStepMode,
  CashAllocationStepType,
  CASH_ALLOCATION_STEP_LABELS,
  ALLOCATION_MODE_LABELS,
  EXPLOITATION_ENTITY_ID,
  FONCIERE_ENTITY_ID,
  BUILT_IN_SOCIETES,
  createDefaultAllocationOrder,
  createDefaultEntityRule,
  DEFAULT_GLOBAL_RULE,
} from "@/types/project";

// ── Waterfall step colors ──
const STEP_COLORS: Record<CashAllocationStepType, { border: string; bg: string; badge: string; circle: string }> = {
  CCA_REPAYMENT: { border: "border-blue-200", bg: "bg-blue-50/50", badge: "bg-blue-100 text-blue-700", circle: "bg-blue-600" },
  RESERVE: { border: "border-amber-200", bg: "bg-amber-50/50", badge: "bg-amber-100 text-amber-700", circle: "bg-amber-600" },
  DIVIDENDS: { border: "border-green-200", bg: "bg-green-50/50", badge: "bg-green-100 text-green-700", circle: "bg-green-600" },
};

// ── Waterfall Editor (reusable for global + entity) ──
function WaterfallEditor({
  steps,
  onChange,
}: {
  steps: CashAllocationStep[];
  onChange: (steps: CashAllocationStep[]) => void;
}) {
  const updateStep = (idx: number, patch: Partial<CashAllocationStep>) => {
    const next = steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = [...steps];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const colors = STEP_COLORS[step.type];
        return (
          <div key={step.id}>
            {idx > 0 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className={`rounded-lg border p-4 space-y-3 ${colors.border} ${colors.bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center justify-center w-7 h-7 rounded-full ${colors.circle} text-white text-sm font-bold`}>
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-sm">{CASH_ALLOCATION_STEP_LABELS[step.type]}</span>
                  <Badge variant="outline" className={`text-xs ${colors.badge}`}>
                    {ALLOCATION_MODE_LABELS[step.mode]}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(idx, -1)} disabled={idx === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="pl-9 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Label className="text-sm whitespace-nowrap">Mode :</Label>
                  <Select
                    value={step.mode}
                    onValueChange={(v) => updateStep(idx, { mode: v as AllocationStepMode })}
                  >
                    <SelectTrigger className="h-8 w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RATIO">Pourcentage</SelectItem>
                      <SelectItem value="UNTIL_ZERO">Jusqu'à épuisement</SelectItem>
                      <SelectItem value="UNTIL_TARGET">Montant cible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {step.mode === "RATIO" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Part :</Label>
                    <Input
                      type="number" className="h-8 w-20" min={0} max={100} step={1}
                      value={step.ratio}
                      onChange={(e) => updateStep(idx, { ratio: Number(e.target.value) })}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )}

                {step.mode === "UNTIL_TARGET" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Cible :</Label>
                    <Input
                      type="number" className="h-8 w-28" min={0}
                      value={step.target ?? 0}
                      onChange={(e) => updateStep(idx, { target: Number(e.target.value) })}
                    />
                    <span className="text-sm text-muted-foreground">€</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Entity Rule Card ──
function EntityRuleCard({
  rule,
  entityName,
  onChange,
}: {
  rule: EntityGouvernanceRule;
  entityName: string;
  onChange: (r: EntityGouvernanceRule) => void;
}) {
  const update = (patch: Partial<EntityGouvernanceRule>) => {
    const next = { ...rule, ...patch };
    // Enforce: transparent → inheritGlobalRule = true
    if (next.transparentDistribution) {
      next.inheritGlobalRule = true;
    }
    onChange(next);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{entityName}</CardTitle>
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Transparente</Label>
                    <Switch
                      checked={rule.transparentDistribution}
                      onCheckedChange={(v) => update({ transparentDistribution: v })}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Les flux traversent cette société sans application de gouvernance propre. Utilisé pour les holdings intermédiaires.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rule.transparentDistribution && (
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              Cette société est <strong>transparente</strong> : le moteur redistribue directement vers les bénéficiaires finaux. Aucune règle propre ne s'applique.
            </AlertDescription>
          </Alert>
        )}

        {!rule.transparentDistribution && (
          <>
            <div className="flex items-center gap-2">
              <Switch
                checked={rule.inheritGlobalRule}
                onCheckedChange={(v) => update({ inheritGlobalRule: v })}
              />
              <Label className="text-sm">Hériter de la règle globale</Label>
            </div>

            {!rule.inheritGlobalRule && (
              <div className="space-y-4 pt-2 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Cash distribuable (%)</Label>
                    <Input
                      type="number" min={0} max={100}
                      value={Math.round(rule.distributableCashRate * 100)}
                      onChange={(e) => update({ distributableCashRate: Number(e.target.value) / 100 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Réserve stratégique (%)</Label>
                    <Input
                      type="number" min={0} max={100}
                      value={Math.round(rule.reserveStrategicRatio * 100)}
                      onChange={(e) => update({ reserveStrategicRatio: Number(e.target.value) / 100 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Réserve cash min (€)</Label>
                    <Input
                      type="number" min={0}
                      value={rule.minCashReserve}
                      onChange={(e) => update({ minCashReserve: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Flat tax dividendes (%)</Label>
                    <Input
                      type="number" min={0} max={100}
                      value={Math.round(rule.dividendFlatTaxRate * 100)}
                      onChange={(e) => update({ dividendFlatTaxRate: Number(e.target.value) / 100 })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.dscrConstraintEnabled}
                    onCheckedChange={(v) => update({ dscrConstraintEnabled: v })}
                  />
                  <Label className="text-sm">Contrainte DSCR active</Label>
                </div>

                <Separator />
                <Label className="text-sm font-semibold">Waterfall de distribution</Label>
                <WaterfallEditor
                  steps={rule.allocationOrder}
                  onChange={(steps) => update({ allocationOrder: steps })}
                />

                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.distributionOverrideEnabled}
                      onCheckedChange={(v) => update({ distributionOverrideEnabled: v })}
                    />
                    <Label className="text-sm">Override de distribution manuel</Label>
                  </div>
                  {rule.distributionOverrideEnabled && (
                    <div className="flex items-center gap-2 pl-6">
                      <Label className="text-xs">Montant max :</Label>
                      <Input
                        type="number" className="w-32" min={0}
                        value={rule.distributionOverrideAmount ?? 0}
                        onChange={(e) => update({ distributionOverrideAmount: Number(e.target.value) })}
                      />
                      <span className="text-xs text-muted-foreground">€/mois</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──
export default function GouvernancePage() {
  const { state, updateSection, validateSection } = useProject();
  const [form, setForm] = useState<GouvernanceData>({ ...state.gouvernance });

  // Entities eligible for governance rules
  const entities = useMemo(() => {
    const builtIn = BUILT_IN_SOCIETES;
    const userMorales = state.associes.associes.filter(a => a.type === "MORALE");
    return [...builtIn, ...userMorales];
  }, [state.associes.associes]);

  // Ensure all entities have a rule
  const entityRulesMap = useMemo(() => {
    const map = new Map(form.entityRules.map(r => [r.entityId, r]));
    for (const e of entities) {
      if (!map.has(e.id)) {
        map.set(e.id, createDefaultEntityRule(e.id));
      }
    }
    return map;
  }, [form.entityRules, entities]);

  const updateGlobalRule = (patch: Partial<GlobalGouvernanceRule>) => {
    setForm(prev => ({ ...prev, globalRule: { ...prev.globalRule, ...patch } }));
  };

  const updateEntityRule = (rule: EntityGouvernanceRule) => {
    setForm(prev => {
      const rules = prev.entityRules.filter(r => r.entityId !== rule.entityId);
      return { ...prev, entityRules: [...rules, rule] };
    });
  };

  const save = () => {
    // Sync legacy fields from globalRule for engine compatibility
    const synced: GouvernanceData = {
      ...form,
      distributableCashRate: form.globalRule.distributableCashRate,
      reserveStrategicRatio: form.globalRule.reserveStrategicRatio,
    };
    updateSection("gouvernance", synced);
    validateSection("gouvernance");
    toast.success("Section Gouvernance enregistrée");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Gouvernance des flux</h1>

      <Tabs defaultValue="global">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Règle globale
          </TabsTrigger>
          <TabsTrigger value="entities" className="gap-1.5">
            <Eye className="h-4 w-4" /> Par société
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" /> Historique
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Global Rule ── */}
        <TabsContent value="global" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle>Paramètres globaux</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ces paramètres s'appliquent par défaut à toutes les sociétés qui héritent de la règle globale.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Cash distribuable (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min={0} max={100}
                      value={Math.round(form.globalRule.distributableCashRate * 100)}
                      onChange={(e) => updateGlobalRule({ distributableCashRate: Number(e.target.value) / 100 })}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Réserve stratégique (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min={0} max={100}
                      value={Math.round(form.globalRule.reserveStrategicRatio * 100)}
                      onChange={(e) => updateGlobalRule({ reserveStrategicRatio: Number(e.target.value) / 100 })}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Réserve cash minimum (€)</Label>
                  <Input
                    type="number" min={0}
                    value={form.globalRule.minCashReserve}
                    onChange={(e) => updateGlobalRule({ minCashReserve: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Trésorerie plancher sous laquelle aucune distribution n'est possible</p>
                </div>
                <div className="space-y-1">
                  <Label>Flat tax dividendes (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min={0} max={100}
                      value={Math.round(form.globalRule.dividendFlatTaxRate * 100)}
                      onChange={(e) => updateGlobalRule({ dividendFlatTaxRate: Number(e.target.value) / 100 })}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">PFU appliqué aux dividendes des personnes physiques</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={form.globalRule.dscrConstraintEnabled}
                  onCheckedChange={(v) => updateGlobalRule({ dscrConstraintEnabled: v })}
                />
                <Label>Contrainte DSCR active</Label>
                <p className="text-xs text-muted-foreground ml-2">
                  La distribution sera bloquée si le DSCR descend sous le seuil projet
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Waterfall de distribution</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Séquence d'allocation du cash distribuable. Le moteur applique ces étapes dans l'ordre.
              </p>
              <WaterfallEditor
                steps={form.globalRule.allocationOrder}
                onChange={(steps) => updateGlobalRule({ allocationOrder: steps })}
              />
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Rappel :</strong> Le moteur financier est responsable de tous les calculs (remboursement CCA au prorata, distribution au prorata du capital, fiscalité). Ce module ne fait que paramétrer les règles.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* ── Tab: Entity Rules ── */}
        <TabsContent value="entities" className="space-y-6 mt-4">
          <p className="text-sm text-muted-foreground">
            Configurez les règles de distribution pour chaque société. Par défaut, chaque société hérite de la règle globale.
          </p>
          {entities.map((entity) => {
            const rule = entityRulesMap.get(entity.id) ?? createDefaultEntityRule(entity.id);
            return (
              <EntityRuleCard
                key={entity.id}
                entityName={entity.nom}
                rule={rule}
                onChange={updateEntityRule}
              />
            );
          })}
        </TabsContent>

        {/* ── Tab: History ── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Historique des distributions</CardTitle></CardHeader>
            <CardContent>
              {form.distributionHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Aucune distribution enregistrée. L'historique sera alimenté par le moteur financier lors des simulations.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.distributionHistory.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <span className="font-medium text-sm">{CASH_ALLOCATION_STEP_LABELS[event.type]}</span>
                        <span className="text-xs text-muted-foreground ml-2">{event.date}</span>
                        {event.commentaire && <p className="text-xs text-muted-foreground">{event.commentaire}</p>}
                      </div>
                      <span className="font-semibold">{event.amount.toLocaleString("fr-FR")} €</span>
                    </div>
                  ))}
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
