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
import { toast } from "sonner";
import type { DebtItem, DebtType, DeferralType, CapacityPhase } from "@/types/project";
import { DEBT_TYPE_LABELS, createEmptyDebtItem, BUILT_IN_SOCIETES, EXPLOITATION_ENTITY_ID, FONCIERE_ENTITY_ID } from "@/types/project";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatMonthIndex } from "@/lib/monthUtils";
import { Plus, Landmark, FileText, Pencil, CheckCircle, AlertTriangle, Info } from "lucide-react";

function fmt(n: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n); }
function fmtCurrency(n: number) { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }); }

// ─── Financing Wizard ───

interface FinancingWizardProps {
  item: DebtItem;
  entities: { id: string; nom: string }[];
  onSave: (item: DebtItem) => void;
  onClose: () => void;
}

function FinancingWizard({ item, entities, onSave, onClose }: FinancingWizardProps) {
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
                <Input type="month" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
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
            <Button className="w-full" onClick={handleSave}>
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

// ─── Main Page ───

export default function FinancementPage() {
  const { state, updateSection, validateSection, validated } = useProject();
  const debts = state.financement.debts;
  const associes = state.associes.associes;

  const [showTypeChoice, setShowTypeChoice] = useState(false);
  const [editingItem, setEditingItem] = useState<DebtItem | null>(null);

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

  const handleSave = (item: DebtItem) => {
    const existing = debts.find(d => d.id === item.id);
    const updated = existing
      ? debts.map(d => d.id === item.id ? item : d)
      : [...debts, item];
    updateSection("financement", { debts: updated });
    validateSection("financement");
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    updateSection("financement", { debts: debts.filter(d => d.id !== id) });
  };

  const aConfigurerCount = debts.filter(d => d.status === "A_CONFIGURER").length;

  return (
    <div className="max-w-3xl space-y-6">
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
            <Badge variant="outline" className="border-green-600 text-green-600">
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

      {debts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun financement enregistré.</p>
            <p className="text-sm text-muted-foreground mt-1">Créez un financement ou finalisez une phase capacitaire pour commencer.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {debts.map(d => (
          <Card key={d.id} className={`transition-colors ${d.status === "A_CONFIGURER" ? "border-destructive/50" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {d.type === "BANK_LOAN" ? <Landmark className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                    <span className="font-semibold text-foreground">{d.label || DEBT_TYPE_LABELS[d.type]}</span>
                    <Badge variant="outline" className="text-[10px]">{DEBT_TYPE_LABELS[d.type]}</Badge>
                    {d.status === "A_CONFIGURER" && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">À configurer</Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{entityName(d.entityId)}</span>
                    <span>{fmtCurrency(d.amount)}</span>
                    {d.type === "BANK_LOAN" && d.annualRate > 0 && <span>{fmt(d.annualRate)} %</span>}
                    {d.durationMonths > 0 && <span>{d.durationMonths} mois</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingItem({ ...d })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)} className="text-destructive hover:text-destructive">
                    ×
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialogs */}
      <TypeChoiceDialog open={showTypeChoice} onChoose={handleNewType} onClose={() => setShowTypeChoice(false)} />
      {editingItem && (
        <FinancingWizard
          item={editingItem}
          entities={entities}
          onSave={handleSave}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
