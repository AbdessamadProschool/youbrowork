import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, FileText, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ModuleValide {
  id: string;
  moduleCode: string;
  moduleIntitule: string;
  groupeId: string;
  groupeCode: string;
  filiereCode: string;
  tauxReel: number;
  mhGlobale: number;
  mhRealise: number;
  hasNotes: boolean;
  importedAt: string;
}

export default function ModulesValides() {
  const [filiereFilter, setFiliereFilter] = useState("all");
  const [groupeFilter, setGroupeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: modules, isLoading } = useQuery<ModuleValide[]>({
    queryKey: ["/api/modules-valides"],
    queryFn: async () => {
      const res = await fetch("/api/modules-valides");
      if (!res.ok) throw new Error("Failed to fetch modules valides");
      return res.json();
    }
  });

  const filieres = useMemo(() => {
    if (!modules) return [];
    return [...new Set(modules.map(m => m.filiereCode))].sort();
  }, [modules]);

  const groupes = useMemo(() => {
    if (!modules) return [];
    const filteredByFiliere = filiereFilter === "all" 
      ? modules 
      : modules.filter(m => m.filiereCode === filiereFilter);
    return [...new Set(filteredByFiliere.map(m => m.groupeCode))].sort();
  }, [modules, filiereFilter]);

  const filtered = useMemo(() => {
    if (!modules) return [];
    return modules.filter(m => {
      if (filiereFilter !== "all" && m.filiereCode !== filiereFilter) return false;
      if (groupeFilter !== "all" && m.groupeCode !== groupeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return m.moduleCode.toLowerCase().includes(s) || m.moduleIntitule.toLowerCase().includes(s);
      }
      return true;
    });
  }, [modules, filiereFilter, groupeFilter, search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Détails des Modules Validés</h1>
        <p className="text-muted-foreground">Modules terminés à 100% avec état des PV de notes</p>
      </div>

      <Card className="border-t-4 border-[#00a651]">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#00a651]" />
              Filtres de recherche
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filiereFilter} onValueChange={(v) => { setFiliereFilter(v); setGroupeFilter("all"); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filière" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les filières</SelectItem>
                  {filieres.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={groupeFilter} onValueChange={setGroupeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Groupe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les groupes</SelectItem>
                  {groupes.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>

              <Input 
                placeholder="Rechercher module..." 
                className="w-[200px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Filière</TableHead>
                  <TableHead>Groupe</TableHead>
                  <TableHead>Code Module</TableHead>
                  <TableHead>Intitulé</TableHead>
                  <TableHead className="text-center">Avancement</TableHead>
                  <TableHead className="text-center">PV de Notes</TableHead>
                  <TableHead className="text-right">Dernier Import</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Aucun module validé trouvé avec ces filtres.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.filiereCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{m.groupeCode}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.moduleCode}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={m.moduleIntitule}>
                        {m.moduleIntitule}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-[#00a651] text-white hover:bg-[#008c44]">
                          {(m.tauxReel * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {m.hasNotes ? (
                          <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-medium text-xs">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Chargé</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 text-rose-500 font-medium text-xs">
                            <XCircle className="h-4 w-4" />
                            <span>Manquant</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground font-mono">
                        {new Date(m.importedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm dark:bg-slate-900">
                <CheckCircle2 className="h-6 w-6 text-[#00a651]" />
              </div>
              <div>
                <p className="text-sm text-emerald-800 dark:text-emerald-300">Total terminés</p>
                <p className="text-2xl font-bold text-[#00a651]">{filtered.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm dark:bg-slate-900">
                <FileText className="h-6 w-6 text-[#0054a6]" />
              </div>
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-300">PV Chargés</p>
                <p className="text-2xl font-bold text-[#0054a6]">
                  {filtered.filter(m => m.hasNotes).length} 
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({filtered.length > 0 ? Math.round((filtered.filter(m => m.hasNotes).length / filtered.length) * 100) : 0}%)
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
