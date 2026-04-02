import { useGetStagiaires, getGetStagiairesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertBadge } from "@/components/ui/alert-badge";
import { cn } from "@/lib/utils";

export default function Stagiaires() {
  const [search, setSearch] = useState("");
  const { data: stagiaires, isLoading } = useGetStagiaires({ search }, { query: { queryKey: ['/api/stagiaires', {search}] } });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stagiaires</h1>
          <p className="text-muted-foreground">Recherche et suivi individuel</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par nom ou CEF..." 
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-stagiaires"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">CEF</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : stagiaires?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Aucun stagiaire trouvé
                  </TableCell>
                </TableRow>
              ) : (
                stagiaires?.map((stagiaire) => (
                  <TableRow key={stagiaire.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/stagiaires/${stagiaire.cef}`} className="hover:underline text-primary font-medium">
                        {stagiaire.cef}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{stagiaire.nomComplet}</TableCell>
                    <TableCell>
                      <Link href={`/groupes/${stagiaire.groupeId}`} className="hover:underline text-primary text-xs font-mono">
                        {stagiaire.groupeCode}
                      </Link>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono font-medium",
                      (stagiaire.moyenneGenerale ?? 0) < 10 ? "text-destructive" : ""
                    )}>
                      {stagiaire.moyenneGenerale ? stagiaire.moyenneGenerale.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1">
                        {stagiaire.alertes?.slice(0, 1).map(alerte => (
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
        </CardContent>
      </Card>
    </div>
  );
}