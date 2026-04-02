import { useGetAlertes, getGetAlertesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertBadge } from "@/components/ui/alert-badge";
import { Clock } from "lucide-react";
import { GetAlertesNiveau, GetAlertesEntity } from "@workspace/api-client-react";

export default function Alertes() {
  const [niveau, setNiveau] = useState<GetAlertesNiveau | "all">("all");
  const [entity, setEntity] = useState<GetAlertesEntity | "all">("all");
  
  const params = {
    ...(niveau !== "all" ? { niveau } : {}),
    ...(entity !== "all" ? { entity } : {})
  };

  const { data: alertes, isLoading } = useGetAlertes(params, { query: { queryKey: getGetAlertesQueryKey(params) } });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertes</h1>
          <p className="text-muted-foreground">Anomalies et points d'attention</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={niveau} onValueChange={(v) => setNiveau(v as any)}>
            <SelectTrigger className="w-[140px]" data-testid="select-niveau">
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="critique">Critique</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={entity} onValueChange={(v) => setEntity(v as any)}>
            <SelectTrigger className="w-[140px]" data-testid="select-entity">
              <SelectValue placeholder="Entité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes entités</SelectItem>
              <SelectItem value="groupe">Groupes</SelectItem>
              <SelectItem value="stagiaire">Stagiaires</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Niveau</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[200px]">Entité concernée</TableHead>
                <TableHead className="w-[150px] text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full max-w-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : alertes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="rounded-full bg-success/10 p-3 mb-2">
                        <Clock className="h-6 w-6 text-success" />
                      </div>
                      <p>Aucune alerte à afficher</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                alertes?.map((alerte) => (
                  <TableRow key={alerte.id}>
                    <TableCell>
                      <AlertBadge niveau={alerte.niveau} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        const parts = alerte.message.split(' — ');
                        if (parts.length > 1) {
                          return (
                            <>
                              <span className="text-muted-foreground">{parts[0]} — </span>
                              <strong className="font-semibold">{parts.slice(1).join(' — ')}</strong>
                            </>
                          );
                        }
                        return <span className="font-medium">{alerte.message}</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      {alerte.entity === 'groupe' ? (
                        <Link href={`/groupes/${alerte.entityId}`} className="hover:underline text-primary font-mono text-sm">
                          Groupe: {alerte.entityLabel}
                        </Link>
                      ) : (
                        <Link href={`/stagiaires/${alerte.entityLabel}`} className="hover:underline text-primary font-mono text-sm">
                          CEF: {alerte.entityLabel}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(alerte.createdAt).toLocaleDateString('fr-FR', {
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