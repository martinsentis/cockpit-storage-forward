import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, MapPin, Calendar, FolderOpen, Download, Upload } from "lucide-react";
import { MONTH_NAMES } from "@/lib/monthUtils";
import { toast } from "sonner";

export default function Index() {
  const { projectList, createProject, switchProject, deleteProject, getProjectEntry, importProject } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [nom, setNom] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [startMonth, setStartMonth] = useState(6);
  const [startYear, setStartYear] = useState(2026);
  const [horizonMonths, setHorizonMonths] = useState(120);

  function openCreate() {
    setNom("");
    setLocalisation("");
    setStartMonth(6);
    setStartYear(2026);
    setHorizonMonths(120);
    setDialogOpen(true);
  }

  function handleCreate() {
    if (!nom.trim()) return;
    const projectStartDate = `${startYear}-${String(startMonth).padStart(2, "0")}`;
    const id = createProject({ nom: nom.trim(), localisation: localisation.trim(), projectStartDate, horizonMonths });
    setDialogOpen(false);
    navigate("/projet");
  }

  function handleSelect(id: string) {
    switchProject(id);
    navigate("/projet");
  }

  function handleDelete() {
    if (deleteId) {
      deleteProject(deleteId);
      setDeleteId(null);
    }
  }

  function handleExport(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const entry = getProjectEntry(id);
    if (!entry) return;
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projet-${entry.meta.nom}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Projet exporté avec succès");
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed.meta || !parsed.state || !parsed.validated) {
          toast.error("Fichier invalide : structure de projet manquante (meta, state, validated)");
          return;
        }
        importProject(parsed);
        toast.success(`Projet "${parsed.meta.nom}" importé avec succès`);
        navigate("/projet");
      } catch {
        toast.error("Impossible de lire le fichier JSON");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file);
          e.target.value = "";
        }}
      />
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mes projets</h1>
            <p className="text-muted-foreground mt-1">Sélectionnez un projet ou créez-en un nouveau</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-5 w-5 mr-2" /> Importer
            </Button>
            <Button onClick={openCreate} size="lg">
              <Plus className="h-5 w-5 mr-2" /> Nouveau projet
            </Button>
          </div>
        </div>

        {projectList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Aucun projet</h2>
              <p className="text-muted-foreground mb-6">Créez votre premier projet pour commencer la modélisation.</p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Créer un projet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectList.map(p => (
              <Card
                key={p.id}
                className="cursor-pointer hover:border-primary/50 transition-colors group"
                onClick={() => handleSelect(p.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{p.nom}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleExport(e, p.id)}
                        title="Exporter"
                      >
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {p.localisation && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{p.localisation}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{p.projectStartDate} · {p.horizonMonths} mois</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du projet</Label>
              <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Mon projet" />
            </div>
            <div className="space-y-2">
              <Label>Localisation</Label>
              <Input value={localisation} onChange={e => setLocalisation(e.target.value)} placeholder="Paris" />
            </div>
            <div className="space-y-2">
              <Label>Date de début du projet</Label>
              <div className="flex gap-2">
                <Select value={String(startMonth)} onValueChange={v => setStartMonth(Number(v))}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" className="w-24" value={startYear} onChange={e => setStartYear(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Horizon de projection (mois)</Label>
              <Input type="number" value={horizonMonths} onChange={e => setHorizonMonths(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!nom.trim()}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données du projet seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
