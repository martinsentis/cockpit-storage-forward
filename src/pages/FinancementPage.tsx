import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function FinancementPage() {
  const { state, updateSection, validateSection } = useProject();
  const [form, setForm] = useState({ ...state.financement });

  const set = (key: string, value: number) => setForm(prev => ({ ...prev, [key]: value }));

  const save = () => {
    updateSection("financement", form);
    validateSection("financement");
    toast.success("Section Financement enregistrée");
  };

  return (
    <Card className="max-w-2xl">
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
        <p className="text-sm text-muted-foreground">
          Les dettes (debts / sciDebts) seront gérées dans une version ultérieure avec un tableau dynamique.
        </p>
        <Button onClick={save} className="w-full">Enregistrer</Button>
      </CardContent>
    </Card>
  );
}
