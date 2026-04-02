import { useGetAlertes, getGetAlertesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertBadge } from "@/components/ui/alert-badge";
import { Clock, ShieldAlert } from "lucide-react";
import { GetAlertesNiveau, GetAlertesEntity } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL ?? "/";

function DisciplinaireRow({ alerte }: { alerte: { id: string; niveau: string; message: string; entity: string; entityId: string; entityLabel: string; createdAt: string } }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function handleValidate() {
    setLoading(true);
    try {
      await fetch(`${BASE}api/stagiaires/${alerte.entityId}/discipline`, { method: "POST" });
      await qc.invalidateQueries({ queryKey: getGetAlertesQueryKey({}) });
      await qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  const parts = alerte.message.split(" — ");

  return (
    <TableRow className="animate-pulse-red bg-red-950/40 border-red-600/60 border-l-4 border-l-red-600">
      <TableCell>
        <AlertBadge niveau="disciplinaire" label="DISCIPLINAIRE" />
      </TableCell>
      <TableCell className="text-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
          <div>
            <span className="font-bold text-red-400">{parts[0]}</span>
            {parts.length > 1 && (
              <span className="text-muted-foreground"> — <strong>{parts.slice(1).join(" — ")}</strong></span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Link href={`/stagiaires/${alerte.entityId}`} className="hover:underline text-primary font-mono text-sm">
          {alerte.entityLabel}
        </Link>
      </TableCell>
      <TableCell className="text-right">
        {confirming ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">Confirmer ?</span>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              disabled={loading}
              onClick={handleValidate}
            >
              {loading ? "..." : "Valider"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              disabled={loading}
              onClick={() => setConfirming(false)}
            >
              Annuler
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs"
            onClick={() => setConfirming(true)}
          >
            Valider discipline
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function Alertes() {
  const [niveau, setNiveau] = useState<GetAlertesNiveau | "all">("all");
  const [entity, setEntity] = useState<GetAlertesEntity | "all">("all");
  
  const params = {
    ...(niveau !== "all" ? { niveau } : {}),
    ...(entity !== "all" ? { entity } : {})
  };

  const { data: alertes, isLoading } = useGetAlertes(params, { query: { queryKey: getGetAlertesQueryKey(params) } });

  const disciplinaires = alertes?.filter((a) => a.niveau === "disciplinaire") ?? [];
  const others = alertes?.filter((a) => a.niveau !== "disciplinaire") ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <style>{`
        @keyframes pulse-red {
          0%, 100% { background-color: rgba(185,28,28,0.15); }
          50% { background-color: rgba(185,28,28,0.35); }
        }
        .animate-pulse-red {
          animation: pulse-red 1.8s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertes</h1>
          <p className="text-muted-foreground">Anomalies et points d'attention</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={niveau} onValueChange={(v) => setNiveau(v as any)}>
            <SelectTrigger className="w-[160px]" data-testid="select-niveau">
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="disciplinaire">Disciplinaire</SelectItem>
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

      {/* Disciplinary banner */}
      {!isLoading && disciplinaires.length > 0 && (
        <div className="rounded-lg border border-red-600/60 bg-red-950/30 p-4 flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-red-500 shrink-0" />
          <div>
            <p className="font-bold text-red-400 text-sm">
              {disciplinaires.length} stagiaire{disciplinaires.length > 1 ? "s" : ""} à mesure disciplinaire
            </p>
            <p className="text-xs text-muted-foreground">
              Seuil de 3 absences EFM non justifiées atteint — cliquez "Valider discipline" pour réinitialiser le compteur
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Niveau</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[200px]">Stagiaire / Groupe</TableHead>
                <TableHead className="w-[200px] text-right">Action / Date</TableHead>
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
                <>
                  {/* Disciplinary rows first — flashing red */}
                  {disciplinaires.map((alerte) => (
                    <DisciplinaireRow key={alerte.id} alerte={alerte} />
                  ))}
                  {/* Other alerts */}
                  {others.map((alerte) => (
                    <TableRow key={alerte.id}>
                      <TableCell>
                        <AlertBadge niveau={alerte.niveau as any} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const parts = alerte.message.split(" — ");
                          if (parts.length > 1) {
                            return (
                              <>
                                <span className="text-muted-foreground">{parts[0]} — </span>
                                <strong className="font-semibold">{parts.slice(1).join(" — ")}</strong>
                              </>
                            );
                          }
                          return <span className="font-medium">{alerte.message}</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        {alerte.entity === "groupe" ? (
                          <Link href={`/groupes/${alerte.entityId}`} className="hover:underline text-primary font-mono text-sm">
                            Groupe: {alerte.entityLabel}
                          </Link>
                        ) : (
                          <Link href={`/stagiaires/${alerte.entityId}`} className="hover:underline text-primary font-mono text-sm">
                            {alerte.entityLabel}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(alerte.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
