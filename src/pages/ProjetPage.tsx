import { useState, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MONTH_NAMES } from "@/lib/monthUtils";
import { EXPLOITATION_ENTITY_ID, FONCIERE_ENTITY_ID } from "@/types/project";

export default function ProjetPage() {
  const { state, updateSection, validateSection, activeProjectMeta, updateProjectMeta } = useProject();
  const [form, setForm] = useState({ ...state.projet });

  // Sync form when project changes
  useEffect(() => { setForm({ ...state.projet }); }, [state.projet]);

  const set = (key: string, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));

  const [startYear, startMonth] = (form.projectStartDate ?? "2026-06").split("-").map(Number);
  const setStartDate = (month: number, year: number) => {
    const val = `${year}-${String(month).padStart(2, "0")}`;
    set("projectStartDate", val);
  };

  const setEntityDisplayName = (entityId: string, name: string) => {
    setForm(prev => ({
      ...prev,
      entityDisplayNames: { ...prev.entityDisplayNames, [entityId]: name },
    }));
  };

  const save = () => {
    updateSection("projet", form);
    // Sync meta
    if (activeProjectMeta) {
      updateProjectMeta(activeProjectMeta.id, {
        nom: form.nom,
        localisation: form.localisation,
        projectStartDate: form.projectStartDate,
        horizonMonths: form.horizonMonths,
      });
    }
    validateSection("projet");
    toast.success("Section Projet enregistrée");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
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
            <div className="space-y-2 col-span-2">
              <Label>Date de début du projet (mois 0)</Label>
              <div className="flex gap-2">
                <Select value={String(startMonth)} onValueChange={v => setStartDate(Number(v), startYear)}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="w-24"
                  value={startYear}
                  onChange={e => setStartDate(startMonth, Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Horizon (mois)</Label>
              <Input type="number" value={form.horizonMonths} onChange={e => set("horizonMonths", Number(e.target.value))} />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Noms affichés des sociétés</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Personnalisez les noms affichés des sociétés structurelles. Les identifiants internes ne sont pas modifiés.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Société d'exploitation</Label>
              <Input
                value={form.entityDisplayNames?.[EXPLOITATION_ENTITY_ID] ?? ""}
                onChange={e => setEntityDisplayName(EXPLOITATION_ENTITY_ID, e.target.value)}
                placeholder="Société d'exploitation"
              />
            </div>
            <div className="space-y-2">
              <Label>Société foncière</Label>
              <Input
                value={form.entityDisplayNames?.[FONCIERE_ENTITY_ID] ?? ""}
                onChange={e => setEntityDisplayName(FONCIERE_ENTITY_ID, e.target.value)}
                placeholder="Société foncière (SCI)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full">Enregistrer</Button>
    </div>
  );
}
