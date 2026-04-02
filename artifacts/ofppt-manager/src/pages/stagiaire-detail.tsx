import { useGetStagiaireNotes, getGetStagiaireNotesQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { AlertBadge } from "@/components/ui/alert-badge";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function StagiaireDetail() {
  const params = useParams();
  const cef = params.cef as string;
  
  const { data: detail, isLoading } = useGetStagiaireNotes(cef, { query: { enabled: !!cef, queryKey: getGetStagiaireNotesQueryKey(cef) } });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[200px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <h2 className="text-xl font-bold">Stagiaire introuvable</h2>
        <Button asChild variant="outline">
          <Link href="/stagiaires">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  const chartData = detail.notes.map(n => ({
    name: n.moduleCode,
    moyenne: n.moyenneOff,
    fill: n.moyenneOff < 10 ? "hsl(var(--destructive))" : "hsl(var(--primary))"
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Link href={`/groupes/${detail.stagiaire.groupeId}/stagiaires`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{detail.stagiaire.nomComplet}</h1>
          <p className="text-muted-foreground font-mono flex items-center gap-2">
            <span>CEF: {detail.stagiaire.cef}</span>
            <span>•</span>
            <Link href={`/groupes/${detail.stagiaire.groupeId}`} className="hover:underline text-primary">
              {detail.stagiaire.groupeCode}
            </Link>
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Moyenne Générale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-5xl font-bold font-mono tracking-tighter mt-2",
              (detail.moyenneGenerale ?? 0) < 10 ? "text-destructive" : "text-primary"
            )}>
              {detail.moyenneGenerale ? detail.moyenneGenerale.toFixed(2) : '-'}
              <span className="text-lg text-muted-foreground">/20</span>
            </div>
            
            {detail.alertes && detail.alertes.length > 0 && (
              <div className="mt-6 space-y-2 border-t pt-4">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Alertes en cours
                </h4>
                {detail.alertes.map(a => (
                  <AlertBadge key={a.id} niveau={a.niveau} className="w-full justify-start whitespace-normal h-auto py-1">
                    {a.message}
                  </AlertBadge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Profil de notes</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip 
                  formatter={(value: number) => [value.toFixed(2), "Note"]}
                  labelStyle={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                />
                <ReferenceLine y={10} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <Bar dataKey="moyenne" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relevé de notes détaillé</CardTitle>
          <CardDescription>Détail des notes de contrôles continus et d'examen de fin de module</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Module</TableHead>
                <TableHead>Intitulé</TableHead>
                <TableHead className="w-[100px] text-right">CC /20</TableHead>
                <TableHead className="w-[100px] text-right">EFM /40</TableHead>
                <TableHead className="w-[120px] text-right">Moyenne /20</TableHead>
                <TableHead className="w-[80px] text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-mono text-xs">{note.moduleCode}</TableCell>
                  <TableCell className="font-medium text-sm">{note.moduleIntitule}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{note.cc.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {note.efmStatut === "ABSENT" ? (
                      <Badge variant="destructive" className="text-[10px]">ABSENT</Badge>
                    ) : (
                      note.efm.toFixed(2)
                    )}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-mono font-bold text-sm",
                    note.moyenneOff < 10 ? "text-destructive" : ""
                  )}>
                    {note.moyenneOff.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    {note.valide ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-transparent">Validé</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-transparent">Non Val.</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {detail.notes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Aucune note trouvée
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