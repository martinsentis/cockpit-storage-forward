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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowDown, Info, ShieldCheck, Eye, History, ChevronUp, ChevronDown, Banknote, Shield, Calculator, Layers } from "lucide-react";
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
  BUILT_IN_SOCIETES,
  createDefaultEntityRule,
} from "@/types/project";

// ── Waterfall step colors ──
const STEP_COLORS: Record<CashAllocationStepType, { border: string; bg: string; badge: string; circle: string; progress: string }> = {
  CCA_REPAYMENT: { border: "border-blue-200", bg: "bg-blue-50/50", badge: "bg-blue-100 text-blue-700", circle: "bg-blue-600", progress: "bg-blue-500" },
  RESERVE: { border: "border-amber-200", bg: "bg-amber-50/50", badge: "bg-amber-100 text-amber-700", circle: "bg-amber-600", progress: "bg-amber-500" },
  DIVIDENDS: { border: "border-green-200", bg: "bg-green-50/50", badge: "bg-green-100 text-green-700", circle: "bg-green-600", progress: "bg-green-500" },
};

const fmt = (n: number) => n.toLocaleString("fr-FR");

// ── Step type labels for summary ──
const STEP_TYPE_SUMMARY_LABELS: Record<CashAllocationStepType, string> = {
  CCA_REPAYMENT: "remboursement des comptes courants",
  RESERVE: "réserve stratégique",
  DIVIDENDS: "dividendes",
};

// ── Financial Policy Summary ──
function FinancialPolicySummary({ globalRule }: { globalRule: GlobalGouvernanceRule }) {
  const ratioPercent = Math.round(globalRule.distributableCashRate * 100);
  const priorityText = globalRule.allocationOrder
    .map((s) => STEP_TYPE_SUMMARY_LABELS[s.type] ?? s.label ?? s.type)
    .join(" → ");
  const dscrText = globalRule.dscrConstraintEnabled ? "activée" : "désactivée";

  return (
    <Card className="bg-muted/40 border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Politique financière actuelle
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-1.5">
        <p>
          La distribution est limitée à <span className="font-semibold text-foreground">{ratioPercent} %</span> du cash disponible, avec une réserve minimale de <span className="font-semibold text-foreground">{fmt(globalRule.minCashReserve)} €</span>.
        </p>
        <p>
          La priorité de distribution est : <span className="font-medium text-foreground">{priorityText}</span>.
        </p>
        <p>
          La protection dette (DSCR) est <span className="font-semibold text-foreground">{dscrText}</span>.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Simulator ──
function GouvernanceSimulator({ globalRule }: { globalRule: GlobalGouvernanceRule }) {
  const TRESORERIE = 20_000;
  const RESULTAT = 50_000;
  const CASH_DISPO = TRESORERIE + RESULTAT;

  const limiteReserve = Math.max(0, CASH_DISPO - globalRule.minCashReserve);
  const limiteRatio = CASH_DISPO * globalRule.distributableCashRate;
  const cashDistribuable = Math.min(limiteReserve, limiteRatio);
  const limiteRetenue = limiteRatio <= limiteReserve ? "ratio" : "reserve";

  // Waterfall simulation
  const waterfallResult = useMemo(() => {
    let remaining = cashDistribuable;
    return globalRule.allocationOrder.map((step) => {
      let allocated = 0;
      if (step.mode === "RATIO") {
        allocated = Math.min(remaining, cashDistribuable * (step.ratio / 100));
      } else if (step.mode === "UNTIL_TARGET") {
        allocated = Math.min(remaining, step.target ?? 0);
      } else {
        allocated = remaining;
      }
      allocated = Math.max(0, Math.round(allocated));
      remaining = Math.max(0, remaining - allocated);
      return { ...step, allocated, remaining };
    });
  }, [cashDistribuable, globalRule.allocationOrder]);

  return (
    <div className="sticky top-4 space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulateur de gouvernance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Disclaimer */}
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Exemple pédagogique.</strong> Les montants utilisés dans ce simulateur sont fixes et servent uniquement à illustrer le fonctionnement des règles de gouvernance. Ils ne correspondent pas aux données réelles du projet.
            </AlertDescription>
          </Alert>

          {/* Hypothèses */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hypothèses fixes</p>
            <div className="flex justify-between text-sm">
              <span>Trésorerie début d'année</span>
              <span className="font-medium">{fmt(TRESORERIE)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Résultat net après impôt</span>
              <span className="font-medium">{fmt(RESULTAT)} €</span>
            </div>
          </div>

          <Separator />

          {/* Étape 1 — Cash disponible */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">1</span>
              <span className="text-sm font-semibold">Cash disponible</span>
            </div>
            <div className="pl-8 text-sm space-y-1">
              <p className="text-muted-foreground">{fmt(TRESORERIE)} € + {fmt(RESULTAT)} € = <strong className="text-foreground">{fmt(CASH_DISPO)} €</strong></p>
            </div>
          </div>

          <Separator />

          {/* Étape 2 — Contraintes de prudence */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">2</span>
              <span className="text-sm font-semibold">Contraintes de prudence</span>
            </div>
            <div className="pl-8 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Réserve minimum</span>
                <span className="font-medium">{fmt(globalRule.minCashReserve)} €</span>
              </div>
              <p className="text-muted-foreground">
                {fmt(CASH_DISPO)} € − {fmt(globalRule.minCashReserve)} € = <strong className="text-foreground">{fmt(limiteReserve)} €</strong>
              </p>
              <div className="rounded bg-muted/50 px-2 py-1.5 text-xs">
                {globalRule.dscrConstraintEnabled ? (
                  <span className="text-primary font-medium">✓ Protection dette activée — Distribution autorisée uniquement si DSCR ≥ seuil</span>
                ) : (
                  <span className="text-muted-foreground">Protection dette désactivée</span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Étape 3 — Cash distribuable */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">3</span>
              <span className="text-sm font-semibold">Cash distribuable</span>
            </div>
            <div className="pl-8 text-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Limite par ratio</span>
                <span className={`font-medium ${limiteRetenue === "ratio" ? "text-foreground" : "text-muted-foreground"}`}>
                  {fmt(CASH_DISPO)} € × {Math.round(globalRule.distributableCashRate * 100)}% = {fmt(Math.round(limiteRatio))} €
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Limite par réserve</span>
                <span className={`font-medium ${limiteRetenue === "reserve" ? "text-foreground" : "text-muted-foreground"}`}>
                  {fmt(CASH_DISPO)} € − {fmt(globalRule.minCashReserve)} € = {fmt(limiteReserve)} €
                </span>
              </div>
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 px-3 py-2 flex justify-between items-center">
                <span className="text-sm font-semibold">Cash distribuable</span>
                <span className="text-lg font-bold text-primary">{fmt(Math.round(cashDistribuable))} €</span>
              </div>
              <p className="text-xs text-muted-foreground">
                = min({fmt(Math.round(limiteRatio))} €, {fmt(limiteReserve)} €) → la {limiteRetenue === "ratio" ? "limite par ratio" : "limite par réserve"} s'applique
              </p>
            </div>
          </div>

          <Separator />

          {/* Étape 4 — Waterfall */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">4</span>
              <span className="text-sm font-semibold">Waterfall de distribution</span>
            </div>
            <div className="pl-8 space-y-3">
              <p className="text-xs text-muted-foreground">Cash distribuable : {fmt(Math.round(cashDistribuable))} €</p>
              {waterfallResult.map((step, idx) => {
                const colors = STEP_COLORS[step.type];
                const pct = cashDistribuable > 0 ? (step.allocated / cashDistribuable) * 100 : 0;
                return (
                  <div key={step.id} className={`rounded-lg border p-3 space-y-2 ${colors.border} ${colors.bg}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{CASH_ALLOCATION_STEP_LABELS[step.type]}</span>
                      <span className="text-sm font-bold">{fmt(step.allocated)} €</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${colors.progress} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Reste : {fmt(step.remaining)} €</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
              <div className="space-y-6 pt-2 border-t">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Contraintes de prudence</Label>
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
                      <Label className="text-xs">Réserve cash min (€)</Label>
                      <Input
                        type="number" min={0}
                        value={rule.minCashReserve}
                        onChange={(e) => update({ minCashReserve: Number(e.target.value) })}
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
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Waterfall de distribution</Label>
                  <WaterfallEditor
                    steps={rule.allocationOrder}
                    onChange={(steps) => update({ allocationOrder: steps })}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Fiscalité des dividendes</Label>
                  <div className="space-y-1 max-w-xs">
                    <Label className="text-xs">Flat tax dividendes (%)</Label>
                    <Input
                      type="number" min={0} max={100}
                      value={Math.round(rule.dividendFlatTaxRate * 100)}
                      onChange={(e) => update({ dividendFlatTaxRate: Number(e.target.value) / 100 })}
                    />
                  </div>
                </div>

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

  const entities = useMemo(() => {
    const builtIn = BUILT_IN_SOCIETES;
    const userMorales = state.associes.associes.filter(a => a.type === "MORALE");
    return [...builtIn, ...userMorales];
  }, [state.associes.associes]);

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
    const synced: GouvernanceData = {
      ...form,
      distributableCashRate: form.globalRule.distributableCashRate,
    };
    updateSection("gouvernance", synced);
    validateSection("gouvernance");
    toast.success("Section Gouvernance enregistrée");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Gouvernance des flux</h1>

      <Tabs defaultValue="global">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
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

        {/* ── Tab: Global Rule — 2 columns ── */}
        <TabsContent value="global" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Left column — Parameters */}
            <div className="lg:col-span-3 space-y-6">
              {/* Bloc 1 — Cash disponible (informatif) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" /> Cash disponible
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Le cash disponible correspond à la trésorerie restante après exploitation, remboursement de la dette et paiement des impôts.
                  </p>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Le cash distribuable est calculé <strong>par entité</strong> (exploitation, foncière, holding). Chaque entité possède sa propre trésorerie et sa propre logique de distribution.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Bloc 2 — Contraintes de prudence */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" /> Contraintes de prudence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ces règles empêchent une distribution si la situation financière devient trop fragile.
                  </p>

                  <div className="space-y-1">
                    <Label>Trésorerie minimum à conserver (€)</Label>
                    <Input
                      type="number" min={0}
                      value={form.globalRule.minCashReserve}
                      onChange={(e) => updateGlobalRule({ minCashReserve: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Après distribution, la société doit conserver au moins ce niveau de trésorerie.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.globalRule.dscrConstraintEnabled}
                        onCheckedChange={(v) => updateGlobalRule({ dscrConstraintEnabled: v })}
                      />
                      <Label>Protection dette (DSCR)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground pl-11">
                      La distribution est bloquée si la société ne couvre plus correctement le service de sa dette.
                    </p>
                    {form.globalRule.dscrConstraintEnabled && (
                      <p className="text-xs text-primary pl-11 font-medium">
                        La distribution est autorisée uniquement si le DSCR reste supérieur au seuil défini.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bloc 3 — Calcul du cash distribuable */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" /> Calcul du cash distribuable
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>Cash distribuable (%)</Label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <Input
                        type="number" min={0} max={100}
                        value={Math.round(form.globalRule.distributableCashRate * 100)}
                        onChange={(e) => updateGlobalRule({ distributableCashRate: Number(e.target.value) / 100 })}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Part maximale du cash disponible pouvant être distribuée chaque année.
                    </p>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs font-mono">
                      cash_distribuable = min(cash × ratio, cash − réserve_minimum)
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Bloc 4 — Waterfall */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" /> Waterfall de distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Le cash distribuable est ensuite alloué selon l'ordre de priorité défini ci-dessous.
                  </p>
                  <WaterfallEditor
                    steps={form.globalRule.allocationOrder}
                    onChange={(steps) => updateGlobalRule({ allocationOrder: steps })}
                  />
                </CardContent>
              </Card>

              {/* Bloc 5 — Fiscalité dividendes */}
              <Card>
                <CardHeader><CardTitle>Fiscalité des dividendes</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1 max-w-xs">
                    <Label>Prélèvement Forfaitaire Unique (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} max={100}
                        value={Math.round(form.globalRule.dividendFlatTaxRate * 100)}
                        onChange={(e) => updateGlobalRule({ dividendFlatTaxRate: Number(e.target.value) / 100 })}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Appliqué au niveau de la personne physique. Distingue dividendes bruts et dividendes nets.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={save} className="w-full">Enregistrer</Button>
            </div>

            {/* Right column — Simulator */}
            <div className="lg:col-span-2">
              <GouvernanceSimulator globalRule={form.globalRule} />
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Entity Rules ── */}
        <TabsContent value="entities" className="space-y-6 mt-4 max-w-3xl">
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
          <Button onClick={save} className="w-full">Enregistrer</Button>
        </TabsContent>

        {/* ── Tab: History ── */}
        <TabsContent value="history" className="space-y-4 mt-4 max-w-3xl">
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
    </div>
  );
}
