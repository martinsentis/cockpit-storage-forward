import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatMonthIndex, formatMonthRange } from "@/lib/monthUtils";
import { DebtItem } from "@/types/project";
import { Plus, Trash2 } from "lucide-react";

function createEmptyDebt(): DebtItem {
  return { label: "", amount: 0, annualRate: 0, durationMonths: 240, deferralMonths: 0 };
}

interface DebtTableProps {
  title: string;
  debts: DebtItem[];
  onChange: (debts: DebtItem[]) => void;
  projectStartDate: string;
}

function DebtTable({ title, debts, onChange, projectStartDate }: DebtTableProps) {
  const update = (idx: number, key: keyof DebtItem, value: string | number) => {
    const next = debts.map((d, i) => i === idx ? { ...d, [key]: value } : d);
    onChange(next);
  };
  const add = () => onChange([...debts, createEmptyDebt()]);
  const remove = (idx: number) => onChange(debts.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button variant="outline" size="sm" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" />Ajouter</Button>
      </div>
      {debts.length === 0 && <p className="text-xs text-muted-foreground">Aucune dette ajoutée.</p>}
      {debts.map((d, idx) => (
        <div key={idx} className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Dette {idx + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(idx)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Libellé</Label>
              <Input value={d.label} onChange={e => update(idx, "label", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Montant (€)</Label>
              <Input type="number" value={d.amount} onChange={e => update(idx, "amount", Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Taux annuel (%)</Label>
              <Input type="number" step={0.01} value={d.annualRate} onChange={e => update(idx, "annualRate", Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Durée (mois)</Label>
              <Input type="number" value={d.durationMonths} onChange={e => update(idx, "durationMonths", Number(e.target.value))} />
              <p className="text-[10px] text-muted-foreground">
                Fin : {formatMonthRange(d.deferralMonths, d.durationMonths, projectStartDate)}
              </p>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Différé (mois)</Label>
              <Input type="number" value={d.deferralMonths} onChange={e => update(idx, "deferralMonths", Number(e.target.value))} />
              <p className="text-[10px] text-muted-foreground">
                Début remboursement : {formatMonthIndex(d.deferralMonths, projectStartDate)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FinancementPage() {
  const { state, updateSection, validateSection } = useProject();
  const [form, setForm] = useState({ ...state.financement });
  const projectStartDate = state.projet.projectStartDate;

  const set = (key: string, value: number) => setForm(prev => ({ ...prev, [key]: value }));

  const save = () => {
    updateSection("financement", form);
    validateSection("financement");
    toast.success("Section Financement enregistrée");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Financement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Apport fonds propres (€)</Label>
              <Input type="number" value={form.apportFondsPropres} onChange={e => set("apportFondsPropres", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Charges SCI cash (€/mois)</Label>
              <Input type="number" value={form.sciChargesCash} onChange={e => set("sciChargesCash", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Amortissement SCI (€/mois)</Label>
              <Input type="number" value={form.sciAmortization} onChange={e => set("sciAmortization", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dettes SAS</CardTitle></CardHeader>
        <CardContent>
          <DebtTable
            title="Dettes SAS"
            debts={form.debts}
            onChange={debts => setForm(prev => ({ ...prev, debts }))}
            projectStartDate={projectStartDate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dettes SCI</CardTitle></CardHeader>
        <CardContent>
          <DebtTable
            title="Dettes SCI"
            debts={form.sciDebts}
            onChange={sciDebts => setForm(prev => ({ ...prev, sciDebts }))}
            projectStartDate={projectStartDate}
          />
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full">Enregistrer</Button>
    </div>
  );
}
