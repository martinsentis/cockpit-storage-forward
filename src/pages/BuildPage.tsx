import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatMonthIndex, formatMonthRange } from "@/lib/monthUtils";
import type { BuildData, BuildAsset, BuildAssetCategory } from "@/types/project";
import { BUILD_ASSET_CATEGORY_LABELS, DEFAULT_BUILD } from "@/types/project";

function uid() { return crypto.randomUUID(); }
function fmt(n: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n); }

export default function BuildPage() {
  const { state, updateSection, validateSection } = useProject();
  const [form, setForm] = useState<BuildData>(() => ({
    ...DEFAULT_BUILD,
    ...state.build,
  }));
  const projectStartDate = state.projet.projectStartDate;

  const set = (key: string, value: number) => setForm(prev => ({ ...prev, [key]: value }));

  // ── Assets ──
  const addAsset = () => {
    const a: BuildAsset = {
      id: uid(), label: "Nouvel actif", category: "AUTRE",
      amount: 0, commissioningMonth: form.startMonth + form.durationMonths, depreciationYears: 10,
    };
    setForm(prev => ({ ...prev, assets: [...prev.assets, a] }));
  };

  const updateAsset = (id: string, patch: Partial<BuildAsset>) =>
    setForm(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? { ...a, ...patch } : a) }));

  const removeAsset = (id: string) =>
    setForm(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));

  const save = () => {
    updateSection("build", form);
    validateSection("build");
    toast.success("Section Build enregistrée");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
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
            <div className="space-y-2">
              <Label>Taxe d'aménagement (€)</Label>
              <Input type="number" value={form.taxeAmenagement} onChange={e => set("taxeAmenagement", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Taxe liée au permis de construire (TVA 0 %)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Actifs immobilisés ═══ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Actifs immobilisés</CardTitle>
          <Button variant="outline" size="sm" onClick={addAsset}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter un actif
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Ces actifs seront utilisés dans le module Foncière (SCI) pour calculer les amortissements.
          </p>
          {form.assets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun actif défini.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Valeur (€)</TableHead>
                    <TableHead>Mise en service (mois)</TableHead>
                    <TableHead>Amortissement (ans)</TableHead>
                    <TableHead>Amort. annuel</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.assets.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Select value={a.category} onValueChange={v => updateAsset(a.id, { category: v as BuildAssetCategory })}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(BUILD_ASSET_CATEGORY_LABELS) as BuildAssetCategory[]).map(cat => (
                              <SelectItem key={cat} value={cat}>{BUILD_ASSET_CATEGORY_LABELS[cat]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input className="w-36" value={a.label} onChange={e => updateAsset(a.id, { label: e.target.value })} /></TableCell>
                      <TableCell><Input type="number" className="w-28" value={a.amount} onChange={e => updateAsset(a.id, { amount: Number(e.target.value) })} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Input type="number" className="w-20" value={a.commissioningMonth} onChange={e => updateAsset(a.id, { commissioningMonth: Number(e.target.value) })} />
                          <span className="text-[10px] text-muted-foreground">{formatMonthIndex(a.commissioningMonth, projectStartDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell><Input type="number" className="w-20" min={0} value={a.depreciationYears} onChange={e => updateAsset(a.id, { depreciationYears: Number(e.target.value) })} /></TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {a.depreciationYears > 0 ? `${fmt(a.amount / a.depreciationYears)} €` : "—"}
                      </TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeAsset(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full">Enregistrer</Button>
    </div>
  );
}
