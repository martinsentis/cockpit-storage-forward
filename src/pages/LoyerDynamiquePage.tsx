import { useState, useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { RentMode, LoyerDynamiqueData } from "@/types/project";

function fmt(n: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n); }

const MODE_LABELS: Record<RentMode, string> = {
  AUTONOMIE_SCI: "Autonomie financière SCI",
  DESENDETTEMENT_SCI: "Désendettement SCI",
  OPTIMISATION_FISCALE: "Optimisation fiscale",
  MIX: "Mix (autonomie + résultat cible exploitation)",
};

const MODE_DESCRIPTIONS: Record<RentMode, string> = {
  AUTONOMIE_SCI: "Le loyer couvre les charges de la SCI et les intérêts des crédits.",
  DESENDETTEMENT_SCI: "Le loyer couvre les charges, les intérêts et le remboursement du capital.",
  OPTIMISATION_FISCALE: "Le loyer est maximisé pour absorber les amortissements comptables.",
  MIX: "Le loyer est calculé pour couvrir la SCI tout en préservant un résultat minimum en exploitation.",
};

export default function LoyerDynamiquePage() {
  const { state, updateSection, validateSection, computeLoyer } = useProject();

  const [form, setForm] = useState<LoyerDynamiqueData>(() => ({
    ...state.loyerDynamique,
  }));

  // Compute components for display
  const computed = useMemo(() => {
    const sciCharges = state.fonciere.charges
      .filter(c => c.isActive)
      .reduce((t, c) => {
        const ht = c.amountType === "HT" ? c.amountInput : c.amountInput / (1 + c.vatRate);
        return t + (c.frequency === "ANNUELLE" ? ht / 12 : ht);
      }, 0);

    const interets = state.financement.sciDebts.reduce((t, d) => t + d.amount * (d.annualRate / 100 / 12), 0);
    const principal = state.financement.sciDebts.reduce((t, d) => d.durationMonths > 0 ? t + d.amount / d.durationMonths : t, 0);
    const amortissement = state.build.assets.reduce((t, a) => a.depreciationYears > 0 ? t + a.amount / a.depreciationYears : t, 0) / 12;

    return { sciCharges, interets, principal, amortissement };
  }, [state.fonciere.charges, state.financement.sciDebts, state.build.assets]);

  // Save to context then recompute
  const save = () => {
    updateSection("loyerDynamique", form);
    validateSection("loyerDynamique");
    toast.success("Loyer dynamique enregistré");
  };

  // Temporarily apply form to compute loyer with current form values
  const loyerPreview = useMemo(() => {
    if (form.manualOverride != null && form.manualOverride > 0) return form.manualOverride;
    const charges = computed.sciCharges;
    const interest = computed.interets;
    const principal = computed.principal;
    const depreciation = computed.amortissement;

    switch (form.mode) {
      case "AUTONOMIE_SCI": return charges + interest;
      case "DESENDETTEMENT_SCI": return charges + interest + principal;
      case "OPTIMISATION_FISCALE": return charges + interest + depreciation;
      case "MIX": return charges + interest + principal;
      default: return charges + interest;
    }
  }, [form, computed]);

  // Impact on exploitation (simplified — loyer is a cost for exploitation)
  // We approximate the exploitation EBE impact
  const exploitationImpact = -loyerPreview;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader><CardTitle>Loyer Dynamique</CardTitle></CardHeader>
        <CardContent className="space-y-6">

          <p className="text-sm text-muted-foreground">
            Ce module calcule le loyer mensuel payé par la société d'exploitation (SAS) à la foncière (SCI).
          </p>

          {/* Mode selection */}
          <div className="space-y-2">
            <Label>Mode de calcul</Label>
            <Select value={form.mode} onValueChange={v => setForm(prev => ({ ...prev, mode: v as RentMode }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(MODE_LABELS) as RentMode[]).map(mode => (
                  <SelectItem key={mode} value={mode}>{MODE_LABELS[mode]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{MODE_DESCRIPTIONS[form.mode]}</p>
          </div>

          {/* Manual override */}
          <div className="space-y-2">
            <Label>Forçage manuel (optionnel, €/mois)</Label>
            <Input
              type="number"
              placeholder="Laisser vide pour calcul automatique"
              value={form.manualOverride ?? ""}
              onChange={e => setForm(prev => ({
                ...prev,
                manualOverride: e.target.value ? Number(e.target.value) : null,
              }))}
            />
            <p className="text-xs text-muted-foreground">Si renseigné, ce montant remplace le calcul automatique.</p>
          </div>

          {form.mode === "MIX" && (
            <div className="space-y-2">
              <Label>Résultat exploitation cible (€/mois)</Label>
              <Input
                type="number"
                value={form.targetExploitationResult}
                onChange={e => setForm(prev => ({ ...prev, targetExploitationResult: Number(e.target.value) }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Détail du calcul */}
      <Card>
        <CardHeader><CardTitle>Détail du calcul</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Composante</TableHead>
                <TableHead className="text-right">Mensuel</TableHead>
                <TableHead className="text-right">Annuel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground">Charges SCI</TableCell>
                <TableCell className="text-right">{fmt(computed.sciCharges)} €</TableCell>
                <TableCell className="text-right">{fmt(computed.sciCharges * 12)} €</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Intérêts crédits SCI</TableCell>
                <TableCell className="text-right">{fmt(computed.interets)} €</TableCell>
                <TableCell className="text-right">{fmt(computed.interets * 12)} €</TableCell>
              </TableRow>
              {(form.mode === "DESENDETTEMENT_SCI" || form.mode === "MIX") && (
                <TableRow>
                  <TableCell className="text-muted-foreground">Remboursement capital</TableCell>
                  <TableCell className="text-right">{fmt(computed.principal)} €</TableCell>
                  <TableCell className="text-right">{fmt(computed.principal * 12)} €</TableCell>
                </TableRow>
              )}
              {form.mode === "OPTIMISATION_FISCALE" && (
                <TableRow>
                  <TableCell className="text-muted-foreground">Amortissements</TableCell>
                  <TableCell className="text-right">{fmt(computed.amortissement)} €</TableCell>
                  <TableCell className="text-right">{fmt(computed.amortissement * 12)} €</TableCell>
                </TableRow>
              )}
              <TableRow className="border-t-2 font-bold">
                <TableCell>
                  Loyer mensuel calculé
                  {form.manualOverride != null && form.manualOverride > 0 && (
                    <span className="ml-2 text-xs font-normal text-orange-500">(forçage manuel)</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-lg">{fmt(loyerPreview)} €</TableCell>
                <TableCell className="text-right text-lg">{fmt(loyerPreview * 12)} €</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Impact */}
      <Card>
        <CardHeader><CardTitle>Impact</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">Impact Exploitation (SAS)</p>
              <p className={`text-xl font-bold ${exploitationImpact >= 0 ? "text-green-600" : "text-destructive"}`}>
                {fmt(exploitationImpact)} €/mois
              </p>
              <p className="text-xs text-muted-foreground">Charge mensuelle supplémentaire</p>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">Impact SCI (revenu)</p>
              <p className="text-xl font-bold text-green-600">+{fmt(loyerPreview)} €/mois</p>
              <p className="text-xs text-muted-foreground">Revenu foncier mensuel</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} className="w-full">Enregistrer</Button>
    </div>
  );
}
