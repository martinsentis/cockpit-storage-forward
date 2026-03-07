import { useState, useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import type { DebtItem, DebtType, DeferralType, CapacityPhase } from "@/types/project";
import { DEBT_TYPE_LABELS, createEmptyDebtItem, BUILT_IN_SOCIETES, EXPLOITATION_ENTITY_ID, FONCIERE_ENTITY_ID } from "@/types/project";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatMonthIndex } from "@/lib/monthUtils";
import { computeAmortizationSchedule, computeAmortizationSummary, estimateRemainingBalance, computeNextPayment } from "@/lib/amortization";
import { Plus, Landmark, FileText, Pencil, CheckCircle, AlertTriangle, Info, TrendingDown, Calendar, CreditCard, Hash, Eye } from "lucide-react";

function fmt(n: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n); }
function fmtCurrency(n: number) { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }); }

// ─── Schedule Dialog ───

function ScheduleDialog({ debt, projectStartDate, onClose }: { debt: DebtItem; projectStartDate: string; onClose: () => void }) {
  const rows = useMemo(() => computeAmortizationSchedule(debt), [debt]);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Échéancier — {debt.label || DEBT_TYPE_LABELS[debt.type]}</DialogTitle>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Échéancier indisponible (paramètres incomplets).
          </p>
        ) : (
          <div className="rounded-lg border overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background">Mois</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Capital amorti</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Intérêts</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Assurance</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Mensualité</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">CRD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.month} className={r.isDeferral ? "bg-muted/30" : ""}>
                    <TableCell>
                      {formatMonthIndex(r.month, projectStartDate)}
                      {r.isDeferral && <span className="ml-1 text-xs text-muted-foreground">(différé)</span>}
                    </TableCell>
                    <TableCell className="text-right">{fmt(r.capitalRepaid)} €</TableCell>
                    <TableCell className="text-right">{fmt(r.interest)} €</TableCell>
                    <TableCell className="text-right">{fmt(r.insurance)} €</TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.totalPayment)} €</TableCell>
                    <TableCell className="text-right">{fmt(r.remainingBalance)} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Financing Wizard ───

interface FinancingWizardProps {
  item: DebtItem;
  entities: { id: string; nom: string }[];
  phases: CapacityPhase[];
  projectStartDate: string;
  onSave: (item: DebtItem) => void;
  onClose: () => void;
}

function FinancingWizard({ item, entities, phases, projectStartDate, onSave, onClose }: FinancingWizardProps) {
  const [form, setForm] = useState<DebtItem>({ ...item });
  const isLease = form.type === "LEASE";
  const tabs = isLease
    ? ["general", "loyers", "resume"]
    : ["general", "differe", "suspension", "resume"];
  const tabLabels = isLease
    ? { general: "Général", loyers: "Loyers", resume: "Résumé" }
    : { general: "Général", differe: "Différé", suspension: "Suspension", resume: "Résumé" };

  const [activeTab, setActiveTab] = useState("general");

  const set = <K extends keyof DebtItem>(k: K, v: DebtItem[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const durationYears = form.durationMonths > 0 ? (form.durationMonths / 12) : 0;

  // ── Phase date constraint ──
  const linkedPhase = form.phaseId ? phases.find(p => p.id === form.phaseId) : null;
  const maxStartDate = useMemo(() => {
    if (!linkedPhase || !projectStartDate) return null;
    const [y, m] = projectStartDate.split("-").map(Number);
    const d = new Date(y, m - 1 + linkedPhase.startMonth);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }, [linkedPhase, projectStartDate]);

  const maxStartDateLabel = linkedPhase ? formatMonthIndex(linkedPhase.startMonth, projectStartDate) : null;
  const dateExceeded = maxStartDate && form.startDate ? form.startDate > maxStartDate : false;

  const summary = useMemo(() => computeAmortizationSummary(form), [form]);

  const handleSave = () => {
    onSave({ ...form, status: "CONFIGURE" });
    toast.success(`${DEBT_TYPE_LABELS[form.type]} enregistré`);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id === item.id && item.status === "A_CONFIGURER" ? "Configurer" : "Modifier"} — {DEBT_TYPE_LABELS[form.type]}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            {tabs.map(t => (
              <TabsTrigger key={t} value={t}>{(tabLabels as Record<string, string>)[t]}</TabsTrigger>
            ))}
          </TabsList>

          {/* ─ Général ─ */}
          <TabsContent value="general" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{isLease ? "Nom du contrat" : "Nom du crédit"}</Label>
              <Input value={form.label} onChange={e => set("label", e.target.value)} placeholder={isLease ? "Crédit-bail équipement" : "Crédit bancaire principal"} />
            </div>
            <div className="space-y-2">
              <Label>Entité porteuse</Label>
              <Select value={form.entityId} onValueChange={v => set("entityId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {entities.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isLease ? "Montant du bien financé (€)" : "Montant emprunté (€)"}</Label>
                <Input type="number" value={form.amount || ""} onChange={e => set("amount", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input type="month" value={form.startDate} onChange={e => set("startDate", e.target.value)} max={maxStartDate ?? undefined} />
                {dateExceeded && (
                  <p className="text-xs text-destructive font-medium">La date dépasse le lancement de l'exploitation ({maxStartDateLabel}).</p>
                )}
                {linkedPhase && maxStartDateLabel && !dateExceeded && (
                  <Alert className="mt-2 py-2 px-3 border-primary/30 bg-primary/5">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-xs">
                      Phase « {linkedPhase.nom} » — Lancement de l'exploitation prévu : <strong>{maxStartDateLabel}</strong>. La date de début du crédit ne peut pas être postérieure à cette date.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            {!isLease && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Taux annuel (%)</Label>
                  <Input type="number" step={0.01} value={form.annualRate || ""} onChange={e => set("annualRate", Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Durée (mois)</Label>
                  <Input type="number" value={form.durationMonths || ""} onChange={e => set("durationMonths", Number(e.target.value))} />
                  {form.durationMonths > 0 && (
                    <p className="text-xs text-muted-foreground">{form.durationMonths} mois ({fmt(durationYears)} ans)</p>
                  )}
                </div>
              </div>
            )}
            {!isLease && (
              <div className="space-y-2">
                <Label>Assurance mensuelle (€)</Label>
                <Input type="number" value={form.insuranceMonthly || ""} onChange={e => set("insuranceMonthly", Number(e.target.value))} />
              </div>
            )}
            {isLease && (
              <div className="space-y-2">
                <Label>Durée du contrat (mois)</Label>
                <Input type="number" value={form.durationMonths || ""} onChange={e => set("durationMonths", Number(e.target.value))} />
                {form.durationMonths > 0 && (
                  <p className="text-xs text-muted-foreground">{form.durationMonths} mois ({fmt(durationYears)} ans)</p>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─ Différé (bank loan only) ─ */}
          {!isLease && (
            <TabsContent value="differe" className="space-y-4 pt-4">
              <Label className="text-base font-semibold">Type de différé</Label>
              <RadioGroup
                value={form.deferralType}
                onValueChange={v => set("deferralType", v as DeferralType)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="NONE" id="def-none" />
                  <Label htmlFor="def-none">Aucun différé</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PARTIAL" id="def-partial" />
                  <Label htmlFor="def-partial">Différé partiel (intérêts payés)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TOTAL" id="def-total" />
                  <Label htmlFor="def-total">Différé total (intérêts capitalisés)</Label>
                </div>
              </RadioGroup>

              {form.deferralType !== "NONE" && (
                <div className="space-y-2 pt-2">
                  <Label>Durée du différé (mois)</Label>
                  <Input type="number" value={form.deferralMonths || ""} onChange={e => set("deferralMonths", Number(e.target.value))} />
                </div>
              )}
            </TabsContent>
          )}

          {/* ─ Suspension (bank loan only) ─ */}
          {!isLease && (
            <TabsContent value="suspension" className="space-y-4 pt-4">
              <Label className="text-base font-semibold">Suspension annuelle de mensualité</Label>
              <p className="text-sm text-muted-foreground">
                Option permettant de suspendre une ou plusieurs mensualités chaque année.
              </p>
              <div className="flex items-center gap-3">
                <Switch checked={form.suspensionEnabled} onCheckedChange={v => set("suspensionEnabled", v)} />
                <Label>Activer la suspension annuelle</Label>
              </div>
              {form.suspensionEnabled && (
                <div className="space-y-2">
                  <Label>Nombre de mensualités suspendues par an</Label>
                  <Input type="number" min={1} max={6} value={form.suspensionMonthsPerYear || ""} onChange={e => set("suspensionMonthsPerYear", Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">
                    Les mensualités suspendues sont reportées en fin de crédit.
                  </p>
                </div>
              )}
            </TabsContent>
          )}

          {/* ─ Loyers (lease only) ─ */}
          {isLease && (
            <TabsContent value="loyers" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Premier loyer (€)</Label>
                <Input type="number" value={form.firstPayment || ""} onChange={e => set("firstPayment", Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Paiement initial souvent majoré</p>
              </div>
              <div className="space-y-2">
                <Label>Loyer mensuel (€)</Label>
                <Input type="number" value={form.monthlyPayment || ""} onChange={e => set("monthlyPayment", Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Loyer standard pendant le contrat</p>
              </div>
              <div className="space-y-2">
                <Label>Option d'achat finale (€)</Label>
                <Input type="number" value={form.purchaseOption || ""} onChange={e => set("purchaseOption", Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Montant payé pour acquérir l'actif en fin de contrat</p>
              </div>
            </TabsContent>
          )}

          {/* ─ Résumé ─ */}
          <TabsContent value="resume" className="space-y-4 pt-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              {[
                { label: isLease ? "Nom du contrat" : "Nom du crédit", value: form.label || "—" },
                { label: "Entité", value: entities.find(e => e.id === form.entityId)?.nom ?? "—" },
                { label: isLease ? "Montant financé" : "Montant emprunté", value: fmtCurrency(form.amount) },
                { label: "Durée", value: form.durationMonths > 0 ? `${form.durationMonths} mois (${fmt(form.durationMonths / 12)} ans)` : "—" },
                ...(!isLease ? [
                  { label: "Taux annuel", value: form.annualRate > 0 ? `${fmt(form.annualRate)} %` : "—" },
                  { label: "Différé", value: form.deferralType === "NONE" ? "Aucun" : `${form.deferralType === "PARTIAL" ? "Partiel" : "Total"} — ${form.deferralMonths} mois` },
                  { label: "Assurance mensuelle", value: form.insuranceMonthly > 0 ? fmtCurrency(form.insuranceMonthly) : "—" },
                  { label: "Suspension", value: form.suspensionEnabled ? `${form.suspensionMonthsPerYear} mois/an` : "Non" },
                ] : [
                  { label: "Premier loyer", value: fmtCurrency(form.firstPayment) },
                  { label: "Loyer mensuel", value: fmtCurrency(form.monthlyPayment) },
                  { label: "Option d'achat", value: fmtCurrency(form.purchaseOption) },
                ]),
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-medium">{row.value}</span>
                </div>
              ))}
            </div>

            {/* ── Mini tableau d'amortissement avec 4 colonnes ── */}
            {!isLease && summary && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h4 className="text-sm font-semibold">Aperçu du tableau d'amortissement</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 text-muted-foreground font-medium">Période</th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">Capital</th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">Intérêts</th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">Assurance</th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">Mensualité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.deferralMonths > 0 && (
                      <tr className="border-b border-border">
                        <td className="py-1.5">Différé ({summary.deferralMonths} mois)</td>
                        <td className="text-right">{form.deferralType === "TOTAL" ? "Capitalisé" : "0 €"}</td>
                        <td className="text-right">{fmt(summary.deferralInterest)} €</td>
                        <td className="text-right">{fmt(summary.deferralInsurance)} €</td>
                        <td className="text-right font-medium">{fmt(summary.deferralPayment)} €</td>
                      </tr>
                    )}
                    {summary.amortMonths > 0 && (
                      <tr className="border-b border-border">
                        <td className="py-1.5">Amortissement ({summary.amortMonths} mois)</td>
                        <td className="text-right">{fmt(summary.amortCapital)} €</td>
                        <td className="text-right">{fmt(summary.amortAvgInterest)} € <span className="text-xs text-muted-foreground">(moy.)</span></td>
                        <td className="text-right">{fmt(summary.amortInsurance)} €</td>
                        <td className="text-right font-medium">{fmt(summary.amortPayment)} € <span className="text-xs text-muted-foreground">(moy.)</span></td>
                      </tr>
                    )}
                    <tr className="font-semibold">
                      <td className="py-1.5">Coût total estimé</td>
                      <td colSpan={4} className="text-right">
                        {fmtCurrency(summary.totalCost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground">
                  Estimation indicative (amortissement linéaire, intérêts moyennés).
                </p>
              </div>
            )}

            {dateExceeded && (
              <Alert variant="destructive" className="py-2 px-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  La date de début dépasse le lancement de l'exploitation. Corrigez-la dans l'onglet Général.
                </AlertDescription>
              </Alert>
            )}
            <Button className="w-full" onClick={handleSave} disabled={dateExceeded}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {isLease ? "Créer le crédit-bail" : "Créer le crédit"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Type Choice Dialog ───

interface TypeChoiceDialogProps {
  open: boolean;
  onChoose: (type: DebtType) => void;
  onClose: () => void;
}

function TypeChoiceDialog({ open, onChoose, onClose }: TypeChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau financement</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Choisissez le type de financement à créer :</p>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={() => onChoose("BANK_LOAN")}
            className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary transition-colors cursor-pointer"
          >
            <Landmark className="h-8 w-8 text-primary" />
            <span className="font-semibold text-foreground">Crédit bancaire</span>
            <span className="text-xs text-muted-foreground text-center">Emprunt classique avec taux, durée, différé</span>
          </button>
          <button
            onClick={() => onChoose("LEASE")}
            className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary transition-colors cursor-pointer"
          >
            <FileText className="h-8 w-8 text-primary" />
            <span className="font-semibold text-foreground">Crédit-bail</span>
            <span className="text-xs text-muted-foreground text-center">Leasing avec loyers et option d'achat</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── KPI Aggregates ───

function FinancingKPIs({ debts, projectStartDate }: { debts: DebtItem[]; projectStartDate: string }) {
  const stats = useMemo(() => {
    const configured = debts.filter(d => d.status === "CONFIGURE");
    const activeCount = configured.length;
    const totalOutstanding = debts.reduce((s, d) => s + d.amount, 0);

    let totalMonthly = 0;
    let totalInterest = 0;
    let maxEndDate = "";

    for (const d of debts) {
      if (d.type === "BANK_LOAN") {
        const summary = computeAmortizationSummary(d);
        if (summary) {
          totalMonthly += summary.amortPayment;
          totalInterest += summary.totalInterest;
        }
      } else {
        totalMonthly += d.monthlyPayment;
      }

      // Compute end date
      if (d.startDate && d.durationMonths > 0) {
        const [y, m] = d.startDate.split("-").map(Number);
        const end = new Date(y, m - 1 + d.durationMonths);
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
        if (endStr > maxEndDate) maxEndDate = endStr;
      }
    }

    const endLabel = maxEndDate
      ? new Date(Number(maxEndDate.split("-")[0]), Number(maxEndDate.split("-")[1]) - 1)
          .toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      : "—";

    return { totalOutstanding, totalMonthly, totalInterest, endLabel, activeCount };
  }, [debts]);

  if (debts.length === 0) return null;

  const kpis = [
    { icon: CreditCard, label: "Encours total", value: fmtCurrency(stats.totalOutstanding) },
    { icon: Calendar, label: "Mensualité totale", value: `${fmtCurrency(stats.totalMonthly)}/mois` },
    { icon: TrendingDown, label: "Intérêts restants", value: fmtCurrency(stats.totalInterest) },
    { icon: Calendar, label: "Date de fin", value: stats.endLabel },
    { icon: Hash, label: "Crédits actifs", value: String(stats.activeCount) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map(k => (
        <Card key={k.label}>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <k.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{k.label}</span>
            </div>
            <span className="text-lg font-bold text-foreground">{k.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Enriched Debt Card ───

function DebtCard({ debt, entityName, projectStartDate, onEdit, onDelete, onViewSchedule }: {
  debt: DebtItem;
  entityName: string;
  projectStartDate: string;
  onEdit: () => void;
  onDelete: () => void;
  onViewSchedule: () => void;
}) {
  const summary = useMemo(() => debt.type === "BANK_LOAN" ? computeAmortizationSummary(debt) : null, [debt]);

  // Progress: approximate repaid ratio (use 0 elapsed months for now — static view)
  const progressPercent = useMemo(() => {
    if (debt.amount <= 0) return 0;
    if (debt.type === "LEASE") return 0;
    const remaining = estimateRemainingBalance(debt, 0);
    return Math.max(0, Math.min(100, ((debt.amount - remaining) / debt.amount) * 100));
  }, [debt]);

  const nextPayment = useMemo(() => computeNextPayment(debt, 0), [debt]);

  // Deferral end date
  const deferralEndLabel = useMemo(() => {
    if (debt.deferralType === "NONE" || !debt.startDate || !debt.deferralMonths) return null;
    const [y, m] = debt.startDate.split("-").map(Number);
    const d = new Date(y, m - 1 + debt.deferralMonths);
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [debt]);

  return (
    <Card className={`transition-colors ${debt.status === "A_CONFIGURER" ? "border-destructive/50" : ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {debt.type === "BANK_LOAN" ? <Landmark className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
              <span className="font-semibold text-foreground">{debt.label || DEBT_TYPE_LABELS[debt.type]}</span>
              <Badge variant="outline" className="text-[10px]">{DEBT_TYPE_LABELS[debt.type]}</Badge>
              {debt.entityId === FONCIERE_ENTITY_ID && (
                <Badge variant="secondary" className="text-[10px]">Foncière</Badge>
              )}
              {debt.status === "A_CONFIGURER" && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">À configurer</Badge>
              )}
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{entityName}</span>
              <span>{fmtCurrency(debt.amount)}</span>
              {debt.type === "BANK_LOAN" && debt.annualRate > 0 && <span>{fmt(debt.annualRate)} %</span>}
              {debt.durationMonths > 0 && <span>{debt.durationMonths} mois</span>}
            </div>
          </div>
          <div className="flex gap-1">
            {debt.type === "BANK_LOAN" && debt.status === "CONFIGURE" && (
              <Button variant="ghost" size="sm" onClick={onViewSchedule} title="Voir l'échéancier">
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              ×
            </Button>
          </div>
        </div>

        {/* Enriched info for configured bank loans */}
        {debt.type === "BANK_LOAN" && debt.status === "CONFIGURE" && summary && (
          <div className="space-y-2 pt-1">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Capital restant dû</span>
                <span>{fmtCurrency(debt.amount)} restant</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Prochaine mensualité</span>
                <p className="font-medium">{fmtCurrency(nextPayment)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Mensualité pleine</span>
                <p className="font-medium">{fmtCurrency(summary.amortPayment)}</p>
              </div>
              {deferralEndLabel && (
                <div>
                  <span className="text-muted-foreground text-xs">Fin du différé</span>
                  <p className="font-medium">{deferralEndLabel}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lease summary */}
        {debt.type === "LEASE" && debt.status === "CONFIGURE" && (
          <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm pt-1">
            <div>
              <span className="text-muted-foreground text-xs">Loyer mensuel</span>
              <p className="font-medium">{fmtCurrency(debt.monthlyPayment)}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Premier loyer</span>
              <p className="font-medium">{fmtCurrency(debt.firstPayment)}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Option d'achat</span>
              <p className="font-medium">{fmtCurrency(debt.purchaseOption)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───

export default function FinancementPage() {
  const { state, updateSection, validateSection, validated } = useProject();
  const associes = state.associes.associes;

  const allDebts = useMemo(() => [
    ...state.financement.debts,
    ...state.financement.sciDebts,
  ], [state.financement.debts, state.financement.sciDebts]);

  const [showTypeChoice, setShowTypeChoice] = useState(false);
  const [editingItem, setEditingItem] = useState<DebtItem | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<DebtItem | null>(null);

  const entities = useMemo(() => {
    const builtIn = BUILT_IN_SOCIETES.map(s => ({ id: s.id, nom: s.nom }));
    const userMorales = associes.filter(a => a.type === "MORALE").map(a => ({ id: a.id, nom: a.nom }));
    return [...builtIn, ...userMorales];
  }, [associes]);

  const entityName = (id: string) => {
    const e = entities.find(x => x.id === id);
    return e?.nom ?? "—";
  };

  const handleNewType = (type: DebtType) => {
    setShowTypeChoice(false);
    const item = createEmptyDebtItem(type);
    setEditingItem(item);
  };

  const handleSave = (incoming: DebtItem) => {
    let item = { ...incoming };
    const original = allDebts.find(d => d.id === item.id);
    if (original?.createdBy === "capacity_phase") {
      const detachFields: (keyof DebtItem)[] = ["amount", "annualRate", "durationMonths", "entityId", "deferralType", "deferralMonths"];
      const changed = detachFields.some(k => original[k] !== item[k]);
      if (changed) {
        item = { ...item, phaseId: undefined, createdBy: "manual" };
      }
    }
    const isFonciere = item.entityId === FONCIERE_ENTITY_ID;
    if (isFonciere) {
      const existing = state.financement.sciDebts.find(d => d.id === item.id);
      const cleanedDebts = state.financement.debts.filter(d => d.id !== item.id);
      const updatedSciDebts = existing
        ? state.financement.sciDebts.map(d => d.id === item.id ? item : d)
        : [...state.financement.sciDebts, item];
      updateSection("financement", { debts: cleanedDebts, sciDebts: updatedSciDebts });
    } else {
      const existing = state.financement.debts.find(d => d.id === item.id);
      const cleanedSciDebts = state.financement.sciDebts.filter(d => d.id !== item.id);
      const updatedDebts = existing
        ? state.financement.debts.map(d => d.id === item.id ? item : d)
        : [...state.financement.debts, item];
      updateSection("financement", { debts: updatedDebts, sciDebts: cleanedSciDebts });
    }
    validateSection("financement");
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    updateSection("financement", {
      debts: state.financement.debts.filter(d => d.id !== id),
      sciDebts: state.financement.sciDebts.filter(d => d.id !== id),
    });
  };

  const aConfigurerCount = allDebts.filter(d => d.status === "A_CONFIGURER").length;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Financement</h1>
          {aConfigurerCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {aConfigurerCount} à configurer
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {validated.financement ? (
            <Badge variant="outline" className="border-primary text-primary">
              <CheckCircle className="h-3 w-3 mr-1" /> Validé
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={() => validateSection("financement")}>Valider</Button>
          )}
          <Button size="sm" onClick={() => setShowTypeChoice(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau financement
          </Button>
        </div>
      </div>

      {/* KPI Aggregates */}
      <FinancingKPIs debts={allDebts} projectStartDate={state.projet.projectStartDate} />

      {allDebts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun financement enregistré.</p>
            <p className="text-sm text-muted-foreground mt-1">Créez un financement ou finalisez une phase capacitaire pour commencer.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {allDebts.map(d => (
          <DebtCard
            key={d.id}
            debt={d}
            entityName={entityName(d.entityId)}
            projectStartDate={state.projet.projectStartDate}
            onEdit={() => setEditingItem({ ...d })}
            onDelete={() => handleDelete(d.id)}
            onViewSchedule={() => setViewingSchedule(d)}
          />
        ))}
      </div>

      {/* Dialogs */}
      <TypeChoiceDialog open={showTypeChoice} onChoose={handleNewType} onClose={() => setShowTypeChoice(false)} />
      {editingItem && (
        <FinancingWizard
          item={editingItem}
          entities={entities}
          phases={state.exploitation.capacityPhases}
          projectStartDate={state.projet.projectStartDate}
          onSave={handleSave}
          onClose={() => setEditingItem(null)}
        />
      )}
      {viewingSchedule && (
        <ScheduleDialog
          debt={viewingSchedule}
          projectStartDate={state.projet.projectStartDate}
          onClose={() => setViewingSchedule(null)}
        />
      )}
    </div>
  );
}
