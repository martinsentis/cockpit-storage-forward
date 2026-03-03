import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ProjetPage() {
  const { state, updateSection, validateSection } = useProject();
  const [form, setForm] = useState({ ...state.projet });

  const set = (key: string, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));

  const save = () => {
    updateSection("projet", form);
    validateSection("projet");
    toast.success("Section Projet enregistrée");
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Projet</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom du projet</Label>
            <Input value={form.nom} onChange={e => set("nom", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Localisation</Label>
            <Input value={form.localisation} onChange={e => set("localisation", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Horizon (mois)</Label>
            <Input type="number" value={form.horizonMonths} onChange={e => set("horizonMonths", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Taux IS (%)</Label>
            <Input type="number" step="0.01" value={form.taxRate} onChange={e => set("taxRate", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Buffer trésorerie min (€)</Label>
            <Input type="number" value={form.bufferMin} onChange={e => set("bufferMin", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>DSCR min</Label>
            <Input type="number" step="0.1" value={form.dscrMin} onChange={e => set("dscrMin", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Trésorerie initiale SAS (€)</Label>
            <Input type="number" value={form.initialCash} onChange={e => set("initialCash", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Trésorerie initiale SCI (€)</Label>
            <Input type="number" value={form.sciInitialCash} onChange={e => set("sciInitialCash", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Taux TVA par défaut (%)</Label>
            <Input type="number" step="1" value={Math.round((form.defaultVatRate ?? 0.20) * 100)} onChange={e => set("defaultVatRate", Number(e.target.value) / 100)} />
          </div>
          <div className="space-y-2">
            <Label>Affichage montants</Label>
            <Select value={form.displayMode ?? "HT"} onValueChange={v => set("displayMode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HT">HT</SelectItem>
                <SelectItem value="TTC">TTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={save} className="w-full">Enregistrer</Button>
      </CardContent>
    </Card>
  );
}
