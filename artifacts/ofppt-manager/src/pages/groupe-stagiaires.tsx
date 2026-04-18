import { useGetGroupeStagiaires, getGetGroupeStagiairesQueryKey, useGetGroupe, getGetGroupeQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { AlertBadge } from "@/components/ui/alert-badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function GroupeStagiaires() {
  const params = useParams();
  const id = params.id as string;
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  
  const { data: groupe, isLoading: isGroupeLoading } = useGetGroupe(id, { query: { enabled: !!id, queryKey: getGetGroupeQueryKey(id) } });
  const { data: stagiaires, isLoading: isStagiairesLoading } = useGetGroupeStagiaires(id, { query: { enabled: !!id, queryKey: getGetGroupeStagiairesQueryKey(id) } });

  const isLoading = isGroupeLoading || isStagiairesLoading;

  // Get unique modules for the table headers
  const modulesSet = new Map();
  stagiaires?.forEach(s => {
    s.notes?.forEach(n => {
      modulesSet.set(n.moduleCode, { code: n.moduleCode, intitule: n.moduleIntitule });
    });
  });
  const modules = Array.from(modulesSet.values()).sort((a, b) => a.code.localeCompare(b.code));
  const totalStagiaires = stagiaires?.length ?? 0;
  const paginated = stagiaires?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[200px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Link href={`/groupes/${id}`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stagiaires du groupe</h1>
          <p className="text-muted-foreground">{groupe?.code} • {groupe?.filiereNom}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Classement et notes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Rang</TableHead>
                <TableHead className="w-24">CEF</TableHead>
                <TableHead className="w-48">Nom Complet</TableHead>
                <TableHead className="w-24 text-right font-bold bg-muted/50">Moy. Gen</TableHead>
                <TableHead className="w-32">Alertes</TableHead>
                {modules.map(m => (
                  <TableHead key={m.code} className="text-right text-xs" title={m.intitule}>
                    {m.code}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((stagiaire) => (
                <TableRow key={stagiaire.id} className="group">
                  <TableCell className="font-mono text-muted-foreground">{stagiaire.rang || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/stagiaires/${stagiaire.cef}`} className="hover:underline text-primary">
                      {stagiaire.cef}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{stagiaire.nomComplet}</TableCell>
                  <TableCell className={cn(
                    "text-right font-mono font-bold bg-muted/20",
                    (stagiaire.moyenneGenerale ?? 0) < 10 ? "text-destructive" : ""
                  )}>
                    {stagiaire.moyenneGenerale ? stagiaire.moyenneGenerale.toFixed(2) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {stagiaire.alertes?.slice(0, 2).map(alerte => (
                        <AlertBadge key={alerte.id} niveau={alerte.niveau} title={alerte.message} dot={false} className="w-4 h-4 p-0 justify-center">!</AlertBadge>
                      ))}
                      {stagiaire.alertes && stagiaire.alertes.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{stagiaire.alertes.length - 2}</span>
                      )}
                    </div>
                  </TableCell>
                  {modules.map(m => {
                    const note = stagiaire.notes?.find(n => n.moduleCode === m.code);
                    return (
                      <TableCell key={m.code} className="text-right font-mono text-xs">
                        {note ? (
                          note.efmStatut === "ABSENT" ? (
                            <span className="text-destructive font-bold text-[10px]">ABS</span>
                          ) : (
                            <span className={cn(note.moyenneOff < 10 ? "text-destructive" : "")}>
                              {note.moyenneOff.toFixed(2)}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5 + modules.length} className="h-24 text-center text-muted-foreground">
                    Aucun stagiaire trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {totalStagiaires > PAGE_SIZE && (
            <PaginationBar
              page={page}
              pageSize={PAGE_SIZE}
              total={totalStagiaires}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}