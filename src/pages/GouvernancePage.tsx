import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowDown, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Gouvernance des flux</h1>

      {/* Structure juridique */}
      <Card>
        <CardHeader><CardTitle>Structure juridique</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label>Structure juridique</Label>
            <Input value={form.structureJuridique} onChange={e => set("structureJuridique", e.target.value)} />
          </div>
          <div className="space-y-2 max-w-sm">
            <Label>Solde CCA initial (€)</Label>
            <Input type="number" value={form.ccaBalance} onChange={e => set("ccaBalance", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Solde des comptes courants d'associés en début de projet</p>
          </div>
        </CardContent>
      </Card>

      {/* Ordre d'allocation du cash */}
      <Card>
        <CardHeader>
          <CardTitle>Ordre d'allocation du cash disponible</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Le cash distribuable est alloué dans l'ordre suivant. Ces règles sont utilisées par le moteur financier pour distribuer le résultat des sociétés.
          </p>

          {/* Step 1: Distributable cash rate */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">0</span>
              <span className="font-semibold">Cash distribuable</span>
            </div>
            <p className="text-sm text-muted-foreground pl-9">
              Pourcentage du cash disponible qui est considéré comme distribuable.
            </p>
            <div className="pl-9 flex items-center gap-2 max-w-xs">
              <Input type="number" step="1" min={0} max={100}
                value={Math.round(form.distributableCashRate * 100)}
                onChange={e => set("distributableCashRate", Number(e.target.value) / 100)} />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div className="flex justify-center"><ArrowDown className="h-5 w-5 text-muted-foreground" /></div>

          {/* Step 2: CCA Repayment */}
          <div className="rounded-lg border p-4 space-y-3 border-blue-200 bg-blue-50/50">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">1</span>
              <span className="font-semibold">Remboursement des CCA</span>
              <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-0.5 rounded">Prioritaire</span>
            </div>
            <p className="text-sm text-muted-foreground pl-9">
              Les comptes courants d'associés sont remboursés en priorité, étage par étage (société → créancier direct uniquement).
            </p>
            <div className="pl-9 flex items-center gap-2 max-w-xs">
              <Label className="whitespace-nowrap text-sm">Part allouée :</Label>
              <Input type="number" step="1" min={0} max={100}
                value={Math.round(form.ccaPriorityRatio * 100)}
                onChange={e => set("ccaPriorityRatio", Number(e.target.value) / 100)} />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div className="flex justify-center"><ArrowDown className="h-5 w-5 text-muted-foreground" /></div>

          {/* Step 3: Strategic Reserve */}
          <div className="rounded-lg border p-4 space-y-3 border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white text-sm font-bold">2</span>
              <span className="font-semibold">Réserve stratégique</span>
            </div>
            <p className="text-sm text-muted-foreground pl-9">
              Pourcentage du cash conservé en réserve pour sécuriser la trésorerie et préparer les futurs investissements.
            </p>
            <div className="pl-9 flex items-center gap-2 max-w-xs">
              <Label className="whitespace-nowrap text-sm">Réserve :</Label>
              <Input type="number" step="1" min={0} max={100}
                value={Math.round(form.reserveStrategicRatio * 100)}
                onChange={e => set("reserveStrategicRatio", Number(e.target.value) / 100)} />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Separator className="my-2" />
            <div className="pl-9 flex items-center gap-2 max-w-xs">
              <Label className="whitespace-nowrap text-sm">Réserve après CCA soldé :</Label>
              <Input type="number" step="1" min={0} max={100}
                value={Math.round(form.reserveAfterCcaFullyRepaid * 100)}
                onChange={e => set("reserveAfterCcaFullyRepaid", Number(e.target.value) / 100)} />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground pl-9">
              Taux de réserve appliqué une fois les CCA entièrement remboursés.
            </p>
          </div>

          <div className="flex justify-center"><ArrowDown className="h-5 w-5 text-muted-foreground" /></div>

          {/* Step 4: Dividends */}
          <div className="rounded-lg border p-4 space-y-3 border-green-200 bg-green-50/50">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white text-sm font-bold">3</span>
              <span className="font-semibold">Distribution de dividendes</span>
            </div>
            <p className="text-sm text-muted-foreground pl-9">
              Les dividendes sont distribués uniquement après le remboursement des CCA et la constitution de la réserve.
              Ils suivent toujours la structure capitalistique définie dans le module Associés & Sociétés.
            </p>
            <p className="text-xs text-muted-foreground pl-9">
              Part restante = 100% − CCA − Réserve = <strong>{Math.round((1 - form.ccaPriorityRatio - form.reserveStrategicRatio) * 100)}%</strong> du cash distribuable.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Flux entre sociétés */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Flux entre sociétés :</strong> Dans une structure multi-sociétés, les flux remontent progressivement.
          L'exploitation rembourse ses CCA vers la holding, puis la holding peut rembourser les CCA aux personnes physiques et distribuer des dividendes.
          Le moteur financier applique cette logique étage par étage.
        </AlertDescription>
      </Alert>

      <Button onClick={save} className="w-full">Enregistrer</Button>
    </div>
  );
}
