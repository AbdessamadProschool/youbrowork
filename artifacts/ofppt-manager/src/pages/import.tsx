import { useImportFile, useGetImportLogs, getGetImportLogsQueryKey, ImportFileBodyType, useGetGroupes } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Clock, Filter } from "lucide-react";
import { useState, useRef, ChangeEvent, useMemo } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ImportPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<ImportFileBodyType>("etat");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportFile();
  const { data: logs, isLoading: isLogsLoading } = useGetImportLogs();
  const { data: groupesData } = useGetGroupes();
  const [importResult, setImportResult] = useState<{ success: boolean; message?: string; warnings?: string[]; errors?: string[]; imported?: number } | null>(null);
  const [selectedFiliere, setSelectedFiliere] = useState<string>("all");
  const [selectedGroupe, setSelectedGroupe] = useState<string>("all");
  const [selectedNiveau, setSelectedNiveau] = useState<string>("T");
  const [loading, setLoading] = useState(false);

  const filieres = useMemo(() => {
    if (!groupesData) return [];
    return [...new Set(groupesData.map(g => g.filiereCode))].sort();
  }, [groupesData]);

  const filteredGroupes = useMemo(() => {
    if (!groupesData) return [];
    if (selectedFiliere === "all") return groupesData;
    return groupesData.filter(g => g.filiereCode === selectedFiliere);
  }, [groupesData, selectedFiliere]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImportResult(null);

    if (type === 'pv_efm' && selectedGroupe === 'all') {
      toast.error("Veuillez sélectionner un groupe ou une filière pour l'import d'un PV de note.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (selectedGroupe && selectedGroupe !== 'all') formData.append('groupeId', selectedGroupe);
    if (type === 'etat') formData.append('niveau', selectedNiveau);

    // DEBUG ALERT
    if (type === 'etat') {
      console.log("Envoi du niveau au serveur:", selectedNiveau);
    }

    try {
      const headers: Record<string, string> = {};
      const etabId = localStorage.getItem("selected_etab_id");
      if (etabId) {
        headers["x-etab-id"] = etabId;
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
        headers,
      });

      const res = await response.json();

      if (response.ok) {
        setImportResult({
          success: res.success,
          message: res.message,
          warnings: res.warnings,
          errors: res.errors,
          imported: res.imported,
        });

        if (res.success) {
          toast.success(res.message || "Import réussi", {
            description: `${res.imported} ligne${res.imported !== 1 ? "s" : ""} traitée${res.imported !== 1 ? "s" : ""} avec succès.`
          });
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          
          await queryClient.invalidateQueries();
        } else {
          toast.error("Import échoué", {
            description: res.message || res.errors?.[0] || "Module ou données introuvables."
          });
        }
      } else {
        throw new Error(res.error || "Erreur serveur");
      }
    } catch (err: any) {
      setImportResult({ 
        success: false, 
        message: err.message || "Erreur réseau ou serveur inaccessible." 
      });
      toast.error("Erreur d'import", {
        description: err.message || "Le serveur n'a pas pu traiter le fichier."
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (t: string) => {
    if (t === "etat") return "État d'avancement (Excel)";
    if (t === "calendrier") return "Calendrier (Excel)";
    if (t === "pv_efm") return "PV EFM (PDF)";
    return t;
  };

  const getTypeIcon = (t: string) => {
    if (t === "pv_efm") return <FileText className="h-4 w-4" />;
    return <FileSpreadsheet className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import de données</h1>
        <p className="text-muted-foreground">Mise à jour du système via fichiers sources OFPPT</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nouvel import</CardTitle>
            <CardDescription>Sélectionnez le type de fichier et déposez-le ici</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de fichier</label>
              <Select value={type} onValueChange={(v) => setType(v as ImportFileBodyType)}>
                <SelectTrigger data-testid="select-import-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="etat">État d'avancement global (XLS/XLSX)</SelectItem>
                  <SelectItem value="calendrier">Calendrier de formation (XLS/XLSX)</SelectItem>
                  <SelectItem value="pv_efm">PV de notes EFM (PDF)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === 'pv_efm' && (
              <div className="p-3 bg-[#00a651]/5 border border-[#00a651]/20 rounded-lg space-y-3 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#00a651] mb-1">
                  <Filter className="h-3 w-3" />
                  SÉLECTION OBLIGATOIRE POUR PV DE NOTE
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Filière</Label>
                    <Select value={selectedFiliere} onValueChange={(v) => { setSelectedFiliere(v); setSelectedGroupe("all"); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Filière" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        {filieres.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Groupe</Label>
                    <Select value={selectedGroupe} onValueChange={setSelectedGroupe}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Groupe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Choisir...</SelectItem>
                        {filteredGroupes.map(g => <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {type === 'etat' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
                  <Filter className="h-3 w-3" />
                  PARAMÈTRES D'IMPORTATION
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Niveau des groupes dans ce fichier</Label>
                  <Select value={selectedNiveau} onValueChange={setSelectedNiveau}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="T">Technicien</SelectItem>
                      <SelectItem value="TS">Technicien Spécialisé</SelectItem>
                      <SelectItem value="S">Spécialisation (Règle 2ème année)</SelectItem>
                      <SelectItem value="Q">Qualification</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground italic">
                    Note: Le niveau 'S' appliquera les règles de calcul de la 2ème année pour le taux théorique.
                  </p>
                </div>
              </div>
            )}

            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer relative",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                file ? "bg-muted" : ""
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept={type === 'pv_efm' ? '.pdf' : '.xls,.xlsx'}
                data-testid="input-file"
              />
              
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-primary/10 rounded-full">
                    {getTypeIcon(type)}
                  </div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Changer de fichier
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <UploadCloud className="h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium">Cliquez ou glissez-déposez ici</p>
                  <p className="text-xs text-muted-foreground">
                    {type === 'pv_efm' ? 'Format PDF uniquement' : 'Format Excel (.xls, .xlsx)'}
                  </p>
                </div>
              )}
            </div>

            <Button 
              className="w-full" 
              disabled={!file || loading}
              onClick={handleImport}
              data-testid="btn-import"
            >
              {loading ? "Importation en cours..." : "Démarrer l'importation"}
            </Button>
            
            {importResult && !importResult.success && (
              <div className="space-y-2">
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Import échoué</p>
                    <p>{importResult.message || importResult.errors?.[0]}</p>
                  </div>
                </div>
                {importResult.warnings && importResult.warnings.length > 0 && (
                  <div className="p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm rounded-md space-y-1">
                    {importResult.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
                  </div>
                )}
              </div>
            )}

            {importResult?.success && (
              <div className="space-y-2">
                <div className="p-3 bg-success/10 text-success text-sm rounded-md flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {importResult.message || `${importResult.imported} lignes importées.`}
                </div>
                {importResult.warnings && importResult.warnings.length > 0 && (
                  <div className="p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm rounded-md space-y-1">
                    <p className="font-semibold text-xs uppercase tracking-wide">Avertissements</p>
                    {importResult.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Règles d'importation</CardTitle>
            <CardDescription>Comment préparer vos fichiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="space-y-1">
              <h4 className="font-medium text-foreground">État d'avancement</h4>
              <p>Exportez directement depuis l'application centrale sans modifier les colonnes. Le système détectera automatiquement les groupes, modules et taux de réalisation.</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-foreground">Calendrier</h4>
              <p>Le fichier calendrier permet de calculer le taux théorique en fonction de la date actuelle. Assurez-vous que les dates de début et fin sont bien renseignées.</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-foreground">PV EFM</h4>
              <p>Le système utilise la reconnaissance de texte (OCR) pour extraire les notes des PDF. La qualité du scan peut affecter les résultats. Le système vérifiera la cohérence (CC + EFM = Moyenne).</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des imports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fichier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Lignes traitées</TableHead>
                <TableHead className="text-right">Erreurs/Avert.</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLogsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Chargement...</TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun import récent</TableCell>
                </TableRow>
              ) : (
                logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-sm truncate max-w-[200px]" title={log.filename}>
                      {log.filename}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex w-fit items-center gap-1 font-normal">
                        {getTypeIcon(log.type)} {getTypeLabel(log.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{log.nbLignes}</TableCell>
                    <TableCell className="text-right">
                      {log.nbErreurs > 0 ? (
                        <Badge variant="destructive" className="font-mono text-xs">{log.nbErreurs}</Badge>
                      ) : log.warnings.length > 0 ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-transparent font-mono text-xs">{log.warnings.length}</Badge>
                      ) : (
                        <span className="text-success text-xs font-medium">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}