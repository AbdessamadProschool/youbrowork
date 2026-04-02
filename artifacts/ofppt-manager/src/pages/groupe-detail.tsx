import { useGetGroupe, getGetGroupeQueryKey, useGetGroupeAvancement } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProgressGauge } from "@/components/ui/progress-gauge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, UsersRound, Calendar, Clock, AlertTriangle } from "lucide-react";

export default function GroupeDetail() {
  const params = useParams();
  const id = params.id as string;
  
  const { data: groupe, isLoading: isGroupeLoading } = useGetGroupe(id, { query: { enabled: !!id, queryKey: getGetGroupeQueryKey(id) } });
  const { data: avancement, isLoading: isAvancementLoading } = useGetGroupeAvancement(id, { query: { enabled: !!id, queryKey: ['/api/groupes', id, 'avancement'] } });

  const isLoading = isGroupeLoading || isAvancementLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!groupe) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <h2 className="text-xl font-bold">Groupe introuvable</h2>
        <Button asChild variant="outline">
          <Link href="/groupes">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Link href="/groupes"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            {groupe.code}
            <Badge variant="secondary" className="font-mono">{groupe.anneeFormation}</Badge>
          </h1>
          <p className="text-muted-foreground">{groupe.filiereNom}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/groupes/${groupe.id}/stagiaires`}>
              <UsersRound className="mr-2 h-4 w-4" />
              Voir les stagiaires
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex justify-between">
              Avancement global
              {avancement?.projection && (
                <Badge variant={avancement.projection.retardJours && avancement.projection.retardJours > 0 ? "destructive" : "secondary"}>
                  {avancement.projection.retardJours && avancement.projection.retardJours > 0 ? `${avancement.projection.retardJours} jours de retard` : 'Dans les temps'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <ProgressGauge 
                tauxReel={groupe.tauxReel} 
                tauxTheorique={groupe.tauxTheorique} 
                ecart={groupe.ecart}
                statut={groupe.avancementStatut}
                className="mt-4"
              />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-muted-foreground flex items-center gap-2"><UsersRound className="h-4 w-4"/> Effectif</span>
              <span className="font-medium">{groupe.nbStagiaires} stagiaires</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> Mode</span>
              <span className="font-medium">{groupe.mode}</span>
            </div>
            {avancement?.projection?.dateFin && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4"/> Date de fin proj.</span>
                <span className="font-medium">{new Date(avancement.projection.dateFin).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détail par module</CardTitle>
          <CardDescription>Progression détaillée de chaque module du programme</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Code</TableHead>
                <TableHead>Intitulé</TableHead>
                <TableHead className="w-[100px]">MH</TableHead>
                <TableHead className="w-[300px]">Progression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {avancement?.modules?.map(mod => (
                <TableRow key={mod.id}>
                  <TableCell className="font-mono text-xs">{mod.moduleCode}</TableCell>
                  <TableCell className="font-medium">{mod.moduleIntitule}</TableCell>
                  <TableCell className="font-mono text-xs">{mod.mhRealise || 0} / {mod.mhGlobale}</TableCell>
                  <TableCell>
                    <ProgressGauge 
                      tauxReel={mod.tauxReel} 
                      tauxTheorique={mod.tauxTheorique} 
                      ecart={mod.ecart}
                      statut={mod.statut}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(!avancement?.modules || avancement.modules.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Aucun module trouvé pour ce groupe
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}