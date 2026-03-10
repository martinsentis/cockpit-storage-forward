import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function FiscalitePage() {
  const { state, updateSection, validateSection } = useProject();
  const [form, setForm] = useState({ ...state.fiscalite });

  const save = () => {
    updateSection("fiscalite", form);
    validateSection("fiscalite");
    toast.success("Section Fiscalité enregistrée");
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Fiscalité</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Taux d'impôt sur les sociétés (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={Math.round(form.corporateTaxRate * 100 * 100) / 100}
            onChange={e => setForm({ ...form, corporateTaxRate: Number(e.target.value) / 100 })}
          />
          <p className="text-xs text-muted-foreground">
            Ce taux s'applique au résultat fiscal de la société d'exploitation et de la société foncière.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Flat tax sur les dividendes (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={Math.round((form.dividendFlatTaxRate ?? 0.30) * 100 * 100) / 100}
            onChange={e => setForm({ ...form, dividendFlatTaxRate: Number(e.target.value) / 100 })}
          />
          <p className="text-xs text-muted-foreground">
            Taux appliqué lors du versement de dividendes à un associé personne physique, pour obtenir le montant net d'impôt.
          </p>
        </div>
        <Button onClick={save} className="w-full">Enregistrer</Button>
      </CardContent>
    </Card>
  );
}
