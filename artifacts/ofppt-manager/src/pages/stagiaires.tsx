import { useGetGroupes } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertBadge } from "@/components/ui/alert-badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alerte {
  id: string;
  niveau: "info" | "warning" | "danger" | "success";
  message: string;
  createdAt: string;
}

interface StagiaireListItem {
  id: string;
  cef: string;
  nom: string;
  prenom: string;
  nomComplet: string;
  groupeId: string;
  groupeCode: string;
  moyenneGenerale: number | null;
  alertes?: Alerte[];
}

interface GroupeSummary {
  id: string;
  code: string;
  annee: number;
  filiereCode: string;
  filiereNom: string;
}

const PAGE_SIZE = 20;

const ANNEE_LABELS: Record<number, string> = {
  1: "1ère Année",
  2: "2ème Année",
  3: "3ème Année",
};

export default function Stagiaires() {
  const [search, setSearch] = useState("");
  const [anneeFilter, setAnneeFilter] = useState<number | null>(null);
  const [filiereFilter, setFiliereFilter] = useState<string>("all");
  const [groupeFilter, setGroupeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [etabId, setEtabId] = useState<string | null>(null);

  useEffect(() => {
    setEtabId(localStorage.getItem("selected_etab_id"));
  }, []);

  const { data: groupes = [] } = useQuery<GroupeSummary[]>({
    queryKey: ["/api/groupes", etabId],
    queryFn: async () => {
      const res = await fetch("/api/groupes", {
        headers: { "x-etab-id": etabId || "" }
      });
      return res.json();
    },
    enabled: !!etabId
  });


  const { data: stagiaires = [], isLoading } = useQuery<StagiaireListItem[]>({
    queryKey: ["/api/stagiaires", { search, etabId }],
    queryFn: async () => {
      const url = new URL("/api/stagiaires", window.location.origin);
      if (search) url.searchParams.set("search", search);
      const res = await fetch(url.toString(), {
        headers: { "x-etab-id": etabId || "" }
      });
      return res.json();
    },
    enabled: !!etabId
  });

  const availableAnnees = useMemo(
    () => [...new Set<number>(groupes.map((g) => g.annee))].sort((a, b) => a - b),
    [groupes]
  );

  const availableFilieres = useMemo(() => {
    const grouped = new Map<string, string>();
    groupes.forEach((g) => grouped.set(g.filiereCode, g.filiereNom));
    return Array.from(grouped.entries()).sort((a: [string, string], b: [string, string]) => a[0].localeCompare(b[0]));
  }, [groupes]);

  const availableGroupes = useMemo(() => {
    return groupes
      .filter((g) => {
        if (anneeFilter !== null && g.annee !== anneeFilter) return false;
        if (filiereFilter !== "all" && g.filiereCode !== filiereFilter) return false;
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [groupes, anneeFilter, filiereFilter]);

  const groupeMap = useMemo(() => {
    const m = new Map<string, { annee: number; filiereCode: string; filiereNom: string }>();
    groupes.forEach((g) => m.set(g.id, { annee: g.annee, filiereCode: g.filiereCode, filiereNom: g.filiereNom }));
    return m;
  }, [groupes]);

  const filtered = useMemo(() => {
    return stagiaires.filter((s) => {
      const grp = groupeMap.get(s.groupeId);
      if (anneeFilter !== null && grp?.annee !== anneeFilter) return false;
      if (filiereFilter !== "all" && grp?.filiereCode !== filiereFilter) return false;
      if (groupeFilter !== "all" && s.groupeId !== groupeFilter) return false;
      return true;
    });
  }, [stagiaires, anneeFilter, filiereFilter, groupeFilter, groupeMap]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  const exportToExcel = () => {
    const headers = ["CEF", "Nom Complet", "Groupe", "Filiere", "Annee", "Moyenne Generale"];
    const csvData = filtered.map((s) => {
      const grp = groupeMap.get(s.groupeId);
      return [
        s.cef,
        s.nomComplet,
        s.groupeCode,
        grp?.filiereCode || "",
        grp?.annee || "",
        s.moyenneGenerale?.toFixed(2) || ""
      ].join(";");
    });
    
    const csvContent = "\uFEFF" + [headers.join(";"), ...csvData].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `stagiaires_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stagiaires</h1>
          <p className="text-muted-foreground">Recherche et suivi individuel</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="hidden sm:flex h-9 border-[#00a651] text-[#00a651] hover:bg-[#00a651] hover:text-white transition-all shadow-sm"
            onClick={exportToExcel}
          >
            <Download className="mr-2 h-4 w-4" />
            Exporter Excel
          </Button>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou CEF..."
              className="pl-8"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              data-testid="input-search-stagiaires"
            />
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Année tabs */}
        <button
          onClick={() => handleFilterChange(() => setAnneeFilter(null))}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
            anneeFilter === null
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
          )}
        >
          Toutes années
        </button>
        {availableAnnees.map((annee) => (
          <button
            key={annee}
            onClick={() => handleFilterChange(() => setAnneeFilter(annee === anneeFilter ? null : annee))}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
              anneeFilter === annee
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
            )}
          >
            {ANNEE_LABELS[annee] ?? `Année ${annee}`}
          </button>
        ))}

        {/* Filière select */}
        {availableFilieres.length > 1 && (
          <Select
            value={filiereFilter}
            onValueChange={(v) => handleFilterChange(() => {
              setFiliereFilter(v);
              setGroupeFilter("all");
            })}
          >
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="Filière" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes filières</SelectItem>
              {availableFilieres.map(([code, nom]) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Groupe Select */}
        <Select
          value={groupeFilter}
          onValueChange={(v) => handleFilterChange(() => setGroupeFilter(v))}
        >
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="Groupe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les groupes</SelectItem>
            {availableGroupes.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtered.length > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">
            {filtered.length} stagiaire{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">CEF</TableHead>
                <TableHead>Nom Complet</TableHead>
                <TableHead className="w-32">Groupe</TableHead>
                <TableHead className="w-24 text-right">Moy. Gen</TableHead>
                <TableHead className="w-48">Alertes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Aucun stagiaire trouvé
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((stagiaire) => (
                  <TableRow key={stagiaire.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/stagiaires/${stagiaire.cef}`} className="hover:underline text-primary font-medium">
                        {stagiaire.cef}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{stagiaire.nomComplet}</TableCell>
                    <TableCell>
                      <div>
                        <Link href={`/groupes/${stagiaire.groupeId}`} className="hover:underline text-primary text-xs font-mono">
                          {stagiaire.groupeCode}
                        </Link>
                        {(() => {
                          const grp = groupeMap.get(stagiaire.groupeId);
                          return grp ? (
                            <p className="text-[10px] text-muted-foreground">{grp.filiereCode} · {ANNEE_LABELS[grp.annee]}</p>
                          ) : null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono font-medium",
                      (stagiaire.moyenneGenerale ?? 0) < 10 ? "text-destructive" : ""
                    )}>
                      {stagiaire.moyenneGenerale ? stagiaire.moyenneGenerale.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {stagiaire.alertes?.slice(0, 1).map((alerte) => (
                          <AlertBadge key={alerte.id} niveau={alerte.niveau} className="truncate max-w-[180px] block" title={alerte.message}>
                            {alerte.message}
                          </AlertBadge>
                        ))}
                        {stagiaire.alertes && stagiaire.alertes.length > 1 && (
                          <span className="text-[10px] text-muted-foreground ml-1">+{stagiaire.alertes.length - 1} autre(s)</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!isLoading && filtered.length > pageSize && (
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
