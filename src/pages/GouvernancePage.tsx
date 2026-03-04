import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function GouvernancePage() {
  const { state, updateSection, validateSection } = useProject();
  const [form, setForm] = useState({ ...state.gouvernance });

  const set = (key: string, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));

  const save = () => {
    updateSection("gouvernance", form);
    validateSection("gouvernance");
    toast.success("Section Gouvernance enregistrée");
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Gouvernance</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Structure juridique</Label>
            <Input value={form.structureJuridique} onChange={e => set("structureJuridique", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Solde CCA initial (€)</Label>
            <Input type="number" value={form.ccaBalance} onChange={e => set("ccaBalance", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Taux distribuable (%)</Label>
            <Input type="number" step="0.01" value={form.distributableCashRate} onChange={e => set("distributableCashRate", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Priorité CCA (%)</Label>
            <Input type="number" step="0.01" value={form.ccaPriorityRatio} onChange={e => set("ccaPriorityRatio", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Réserve stratégique (%)</Label>
            <Input type="number" step="0.01" value={form.reserveStrategicRatio} onChange={e => set("reserveStrategicRatio", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Réserve après CCA soldé (%)</Label>
            <Input type="number" step="0.01" value={form.reserveAfterCcaFullyRepaid} onChange={e => set("reserveAfterCcaFullyRepaid", Number(e.target.value))} />
          </div>
        </div>

        <Button onClick={save} className="w-full">Enregistrer</Button>
      </CardContent>
    </Card>
  );
}
