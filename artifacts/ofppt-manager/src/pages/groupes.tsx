import { useGetGroupes, getGetGroupesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { ProgressGauge } from "@/components/ui/progress-gauge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Groupes() {
  const { data: groupes, isLoading } = useGetGroupes();
  const [search, setSearch] = useState("");

  const filteredGroupes = groupes?.filter(g => 
    g.code.toLowerCase().includes(search.toLowerCase()) || 
    g.filiereNom.toLowerCase().includes(search.toLowerCase())
  );

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
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-groupes"
          />
        </div>
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
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {groupe.anneeFormation}
                    </Badge>
                  </div>
                  
                  <div className="mt-auto space-y-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{groupe.nbStagiaires} stagiaires</span>
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
          {filteredGroupes?.length === 0 && (
            <div className="col-span-full py-12 text-center border rounded-lg border-dashed">
              <p className="text-muted-foreground">Aucun groupe trouvé pour "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}