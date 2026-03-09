import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import type {
  TreasuryEvent, TreasuryEntity, TreasuryFlowDirection, TreasuryNature,
  TreasuryRecurrence, TreasuryFrequency, TreasuryImpact, TreasuryStatus,
} from "@/types/project";
import {
  TREASURY_ENTITY_LABELS, TREASURY_FLOW_LABELS, TREASURY_NATURE_LABELS,
  TREASURY_FREQUENCY_LABELS, TREASURY_IMPACT_LABELS, TREASURY_STATUS_LABELS,
} from "@/types/project";

const STATUS_COLORS: Record<TreasuryStatus, string> = {
  PLANIFIE: "bg-blue-100 text-blue-800",
  CONFIRME: "bg-green-100 text-green-800",
  REALISE: "bg-gray-100 text-gray-800",
  ANNULE: "bg-red-100 text-red-800",
};

function emptyEvent(): Omit<TreasuryEvent, "id"> {
  return {
    entity: "exploitation",
    label: "",
    flowDirection: "ENTREE",
    nature: "PONCTUEL",
    date: "",
    recurrence: "PONCTUEL",
    montantHT: 0,
    tvaApplicable: false,
    tauxTVA: 0.20,
    probabilite: 100,
    impact: "AUCUN",
    statut: "PLANIFIE",
  };
}

export default function EvenementsPage() {
  const { state, updateSection } = useProject();
  const events: TreasuryEvent[] = (state as any).evenements?.events ?? [];

  // Filters
  const [filterEntity, setFilterEntity] = useState<"all" | TreasuryEntity>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | TreasuryStatus>("all");

  // Dialog
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<TreasuryEvent, "id">>(emptyEvent());
  const [dateValue, setDateValue] = useState<Date | undefined>();
  const [startDateValue, setStartDateValue] = useState<Date | undefined>();
  const [endDateValue, setEndDateValue] = useState<Date | undefined>();

  const filtered = events.filter((e) => {
    if (filterEntity !== "all" && e.entity !== filterEntity) return false;
    if (filterStatus !== "all" && e.statut !== filterStatus) return false;
    return true;
  });

  const handleSave = () => {
    const newEvent: TreasuryEvent = {
      ...form,
      id: crypto.randomUUID(),
      date: dateValue ? format(dateValue, "yyyy-MM-dd") : "",
      startDate: startDateValue ? format(startDateValue, "yyyy-MM-dd") : undefined,
      endDate: endDateValue ? format(endDateValue, "yyyy-MM-dd") : undefined,
    };
    updateSection("evenements" as any, { events: [...events, newEvent] });
    setForm(emptyEvent());
    setDateValue(undefined);
    setStartDateValue(undefined);
    setEndDateValue(undefined);
    setOpen(false);
  };

  const patch = (p: Partial<Omit<TreasuryEvent, "id">>) => setForm((f) => ({ ...f, ...p }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="h-6 w-6" />
          Événements de trésorerie
        </h1>
        <Button onClick={() => { setForm(emptyEvent()); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un événement
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Entité</Label>
            <Select value={filterEntity} onValueChange={(v) => setFilterEntity(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="exploitation">Exploitation</SelectItem>
                <SelectItem value="fonciere">Foncière</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Statut</Label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {(Object.keys(TREASURY_STATUS_LABELS) as TreasuryStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{TREASURY_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              Aucun événement de trésorerie n'a encore été enregistré.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date prévue</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Sens</TableHead>
                  <TableHead className="text-right">Montant HT</TableHead>
                  <TableHead>Nature</TableHead>
                  <TableHead>Impact comptable</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="whitespace-nowrap">{ev.date || "—"}</TableCell>
                    <TableCell>{TREASURY_ENTITY_LABELS[ev.entity]}</TableCell>
                    <TableCell>{ev.label}</TableCell>
                    <TableCell>{TREASURY_FLOW_LABELS[ev.flowDirection]}</TableCell>
                    <TableCell className="text-right font-mono">
                      {ev.montantHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </TableCell>
                    <TableCell>{TREASURY_NATURE_LABELS[ev.nature]}</TableCell>
                    <TableCell>{TREASURY_IMPACT_LABELS[ev.impact]}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[ev.statut])}>
                        {TREASURY_STATUS_LABELS[ev.statut]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un événement de trésorerie</DialogTitle>
            <DialogDescription>Renseignez les informations de l'événement.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* Entité */}
            <div className="space-y-1">
              <Label>Entité</Label>
              <Select value={form.entity} onValueChange={(v) => patch({ entity: v as TreasuryEntity })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exploitation">Exploitation</SelectItem>
                  <SelectItem value="fonciere">Foncière</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sens du flux */}
            <div className="space-y-1">
              <Label>Sens du flux</Label>
              <Select value={form.flowDirection} onValueChange={(v) => patch({ flowDirection: v as TreasuryFlowDirection })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TREASURY_FLOW_LABELS) as TreasuryFlowDirection[]).map((k) => (
                    <SelectItem key={k} value={k}>{TREASURY_FLOW_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Libellé */}
            <div className="col-span-2 space-y-1">
              <Label>Libellé</Label>
              <Input value={form.label} onChange={(e) => patch({ label: e.target.value })} placeholder="Description de l'événement" />
            </div>

            {/* Nature */}
            <div className="space-y-1">
              <Label>Nature du flux</Label>
              <Select value={form.nature} onValueChange={(v) => patch({ nature: v as TreasuryNature })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TREASURY_NATURE_LABELS) as TreasuryNature[]).map((k) => (
                    <SelectItem key={k} value={k}>{TREASURY_NATURE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date prévue */}
            <div className="space-y-1">
              <Label>Date prévue</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateValue && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateValue ? format(dateValue, "PPP", { locale: fr }) : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateValue} onSelect={setDateValue} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Récurrence */}
            <div className="space-y-1">
              <Label>Récurrence</Label>
              <Select value={form.recurrence} onValueChange={(v) => patch({ recurrence: v as TreasuryRecurrence })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PONCTUEL">Ponctuel</SelectItem>
                  <SelectItem value="RECURRENT">Récurrent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Statut */}
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={(v) => patch({ statut: v as TreasuryStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TREASURY_STATUS_LABELS) as TreasuryStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{TREASURY_STATUS_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recurrence fields */}
            {form.recurrence === "RECURRENT" && (
              <>
                <div className="space-y-1">
                  <Label>Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDateValue && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDateValue ? format(startDateValue, "PPP", { locale: fr }) : "Début"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDateValue} onSelect={setStartDateValue} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label>Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDateValue && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDateValue ? format(endDateValue, "PPP", { locale: fr }) : "Fin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDateValue} onSelect={setEndDateValue} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label>Fréquence</Label>
                  <Select value={form.frequency ?? "MENSUELLE"} onValueChange={(v) => patch({ frequency: v as TreasuryFrequency })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TREASURY_FREQUENCY_LABELS) as TreasuryFrequency[]).map((k) => (
                        <SelectItem key={k} value={k}>{TREASURY_FREQUENCY_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Montant */}
            <div className="space-y-1">
              <Label>Montant HT (€)</Label>
              <Input type="number" min={0} value={form.montantHT || ""} onChange={(e) => patch({ montantHT: Number(e.target.value) })} placeholder="0" />
            </div>

            {/* TVA */}
            <div className="space-y-1">
              <Label>TVA applicable</Label>
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={form.tvaApplicable} onCheckedChange={(v) => patch({ tvaApplicable: v })} />
                <span className="text-sm text-muted-foreground">{form.tvaApplicable ? "Oui" : "Non"}</span>
              </div>
            </div>

            {form.tvaApplicable && (
              <div className="space-y-1">
                <Label>Taux TVA (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={(form.tauxTVA * 100) || ""} onChange={(e) => patch({ tauxTVA: Number(e.target.value) / 100 })} />
              </div>
            )}

            {/* Probabilité */}
            <div className="col-span-2 space-y-1">
              <Label>Probabilité ({form.probabilite}%)</Label>
              <Slider min={0} max={100} step={1} value={[form.probabilite]} onValueChange={([v]) => patch({ probabilite: v })} />
            </div>

            {/* Impact comptable */}
            <div className="space-y-1">
              <Label>Impact comptable</Label>
              <Select value={form.impact} onValueChange={(v) => patch({ impact: v as TreasuryImpact })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TREASURY_IMPACT_LABELS) as TreasuryImpact[]).map((k) => (
                    <SelectItem key={k} value={k}>{TREASURY_IMPACT_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.impact === "IMMOBILISATION" && (
              <div className="space-y-1">
                <Label>Durée d'amortissement (années)</Label>
                <Input type="number" min={1} value={form.dureeAmortissement ?? ""} onChange={(e) => patch({ dureeAmortissement: Number(e.target.value) })} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!form.label.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
