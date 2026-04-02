import { useGetGroupes } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { ProgressGauge } from "@/components/ui/progress-gauge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ANNEE_LABELS: Record<number, string> = {
  1: "1ère Année",
  2: "2ème Année",
  3: "3ème Année",
};

export default function Groupes() {
  const { data: groupes, isLoading } = useGetGroupes();
  const [search, setSearch] = useState("");
  const [selectedAnnee, setSelectedAnnee] = useState<number | null>(null);

  const availableAnnees = [...new Set(groupes?.map((g) => g.annee) ?? [])].sort();

  const filteredGroupes = groupes?.filter((g) => {
    const matchSearch =
      g.code.toLowerCase().includes(search.toLowerCase()) ||
      g.filiereNom.toLowerCase().includes(search.toLowerCase());
    const matchAnnee = selectedAnnee === null || g.annee === selectedAnnee;
    return matchSearch && matchAnnee;
  });

  const groupesForSelectedAnnee =
    selectedAnnee !== null
      ? groupes?.filter((g) => g.annee === selectedAnnee) ?? []
      : groupes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groupes</h1>
          <p className="text-muted-foreground">Gestion et suivi de l'avancement des groupes</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un groupe..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-groupes"
          />
        </div>
      </div>

      {/* Année filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedAnnee(null)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
            selectedAnnee === null
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
          )}
        >
          Tous
        </button>
        {isLoading
          ? [1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-full" />
            ))
          : [1, 2, 3].map((annee) => {
              const exists = availableAnnees.includes(annee);
              return (
                <button
                  key={annee}
                  onClick={() => exists && setSelectedAnnee(annee)}
                  disabled={!exists}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                    selectedAnnee === annee
                      ? "bg-primary text-primary-foreground border-primary"
                      : exists
                      ? "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      : "border-dashed border-border/40 text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  {ANNEE_LABELS[annee]}
                  {exists && (
                    <span className="ml-1.5 text-[11px] opacity-70">
                      ({groupes?.filter((g) => g.annee === annee).length})
                    </span>
                  )}
                </button>
              );
            })}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-[200px]">
              <CardContent className="p-6 flex flex-col h-full justify-between">
                <Skeleton className="h-6 w-3/4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : selectedAnnee !== null && groupesForSelectedAnnee.length === 0 ? (
        /* No groups for the selected year */
        <div className="py-16 flex flex-col items-center justify-center border rounded-lg border-dashed space-y-3">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-medium text-muted-foreground">
              Aucun groupe de {ANNEE_LABELS[selectedAnnee]} chargé
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Importez un fichier État d'avancement pour cette année via la page Import.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroupes?.map((groupe, i) => (
            <Link key={groupe.id} href={`/groupes/${groupe.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg font-mono tracking-tight">{groupe.code}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1" title={groupe.filiereNom}>
                        {groupe.filiereNom}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {groupe.anneeFormation}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {ANNEE_LABELS[groupe.annee] ?? `Année ${groupe.annee}`}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{groupe.nbStagiaires} stagiaire{groupe.nbStagiaires !== 1 ? "s" : ""}</span>
                      <span className="font-medium">{groupe.mode}</span>
                    </div>

                    <div className="pt-2 border-t">
                      <ProgressGauge
                        tauxReel={groupe.tauxReel}
                        tauxTheorique={groupe.tauxTheorique}
                        ecart={groupe.ecart}
                        statut={groupe.avancementStatut}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filteredGroupes?.length === 0 && search && (
            <div className="col-span-full py-12 text-center border rounded-lg border-dashed">
              <p className="text-muted-foreground">Aucun groupe trouvé pour "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
