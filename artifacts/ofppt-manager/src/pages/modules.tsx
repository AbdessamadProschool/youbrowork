import { useGetModules } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Modules() {
  const { data: modules, isLoading } = useGetModules();
  const [search, setSearch] = useState("");

  const filteredModules = modules?.filter(m => 
    m.code.toLowerCase().includes(search.toLowerCase()) || 
    m.intitule.toLowerCase().includes(search.toLowerCase()) ||
    m.filiereCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modules de formation</h1>
          <p className="text-muted-foreground">Référentiel des modules</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un module..." 
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-modules"
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Code</TableHead>
              <TableHead>Intitulé du module</TableHead>
              <TableHead className="w-[100px]">Filière</TableHead>
              <TableHead className="w-[100px]">Niveau</TableHead>
              <TableHead className="w-[120px] text-right">Masse Horaire</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredModules?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aucun module trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredModules?.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="font-mono font-medium text-xs">{module.code}</TableCell>
                  <TableCell className="font-medium">{module.intitule}</TableCell>
                  <TableCell className="font-mono text-xs">{module.filiereCode}</TableCell>
                  <TableCell className="text-xs">{module.niveau}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{module.mhGlobale}h</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}