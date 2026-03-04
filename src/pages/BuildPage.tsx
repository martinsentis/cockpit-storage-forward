import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatMonthIndex, formatMonthRange } from "@/lib/monthUtils";

export default function BuildPage() {
  const { state, updateSection, validateSection } = useProject();
  const [form, setForm] = useState({ ...state.build });
  const projectStartDate = state.projet.projectStartDate;

  const set = (key: string, value: number) => setForm(prev => ({ ...prev, [key]: value }));

  const save = () => {
    updateSection("build", form);
    validateSection("build");
    toast.success("Section Build enregistrée");
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Build / CAPEX</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Début des travaux (mois)</Label>
            <Input type="number" min={0} value={form.startMonth} onChange={e => set("startMonth", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">{formatMonthIndex(form.startMonth, projectStartDate)}</p>
          </div>
          <div className="space-y-2">
            <Label>Durée des travaux (mois)</Label>
            <Input type="number" min={1} value={form.durationMonths} onChange={e => set("durationMonths", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">
              Fin : {formatMonthRange(form.startMonth, form.durationMonths, projectStartDate)}
            </p>
          </div>
          <div className="space-y-2">
            <Label>CAPEX total (€)</Label>
            <Input type="number" value={form.capexTotal} onChange={e => set("capexTotal", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Poste Foncier (€)</Label>
            <Input type="number" value={form.posteFoncier} onChange={e => set("posteFoncier", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Poste Travaux (€)</Label>
            <Input type="number" value={form.posteTravaux} onChange={e => set("posteTravaux", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Poste Honoraires (€)</Label>
            <Input type="number" value={form.posteHonoraires} onChange={e => set("posteHonoraires", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Poste Divers (€)</Label>
            <Input type="number" value={form.posteDivers} onChange={e => set("posteDivers", Number(e.target.value))} />
          </div>
        </div>
        <Button onClick={save} className="w-full">Enregistrer</Button>
      </CardContent>
    </Card>
  );
}
