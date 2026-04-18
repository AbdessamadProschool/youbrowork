import { useGetModules } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Search, Download, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export default function Modules() {
  const { data: modules, isLoading } = useGetModules();
  
  const niveauLabels: Record<string, string> = {
    'S': 'Spécialisation',
    'Q': 'Qualification',
    'T': 'Technicien',
    'TS': 'Technicien Spécialisé'
  };
  const [search, setSearch] = useState("");
  const [selectedFilieres, setSelectedFilieres] = useState<string[]>([]);
  const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const exportToExcel = () => {
    const headers = ["Code", "Intitulé du module", "Filière", "Niveau", "Masse Horaire"];
    const csvData = filteredModules.map(m => [
      m.code,
      m.intitule,
      m.filiereCode,
      m.niveau,
      `${m.mhGlobale}h`
    ].join(";"));
    
    const csvContent = "\uFEFF" + [headers.join(";"), ...csvData].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `modules_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const availableFilieres = useMemo(() => {
    return [...new Set((modules ?? []).map((m) => m.filiereCode))].sort();
  }, [modules]);

  const availableNiveaux = useMemo(() => {
    return [...new Set((modules ?? []).map((m) => m.niveau))].sort();
  }, [modules]);

  const filteredModules = useMemo(
    () =>
      (modules ?? []).filter((m) => {
        if (selectedFilieres.length > 0 && !selectedFilieres.includes(m.filiereCode)) return false;
        if (selectedNiveaux.length > 0 && !selectedNiveaux.includes(m.niveau)) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            m.code.toLowerCase().includes(q) ||
            m.intitule.toLowerCase().includes(q) ||
            m.filiereCode.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [modules, search, selectedFilieres, selectedNiveaux]
  );

  const paginated = filteredModules.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modules de formation</h1>
          <p className="text-muted-foreground">
            Référentiel des modules
            {!isLoading && filteredModules.length > 0 && (
              <span className="ml-2 text-sm text-[#00a651] font-semibold">· {filteredModules.length} module{filteredModules.length !== 1 ? "s" : ""}</span>
            )}
          </p>
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

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="h-4 w-4" />
                Filtrer
                {(selectedFilieres.length > 0 || selectedNiveaux.length > 0) && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1 font-mono text-[10px]">
                    {selectedFilieres.length + selectedNiveaux.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filtres multiples</h4>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => { setSelectedFilieres([]); setSelectedNiveaux([]); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Filières</p>
                  <div className="grid grid-cols-2 gap-2">
                    {availableFilieres.map(f => (
                      <div key={f as string} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`filiere-${f}`} 
                          checked={selectedFilieres.includes(f as string)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedFilieres([...selectedFilieres, f as string]);
                            else setSelectedFilieres(selectedFilieres.filter(x => x !== f));
                            setPage(1);
                          }}
                        />
                        <label htmlFor={`filiere-${f}`} className="text-xs truncate" title={f as string}>{f as string}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Niveaux</p>
                  <div className="flex flex-wrap gap-2">
                    {availableNiveaux.map(n => (
                      <div key={n as string} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`niveau-${n}`} 
                          checked={selectedNiveaux.includes(n as string)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedNiveaux([...selectedNiveaux, n as string]);
                            else setSelectedNiveaux(selectedNiveaux.filter(x => x !== n));
                            setPage(1);
                          }}
                        />
                        <label htmlFor={`niveau-${n}`} className="text-xs">
                          {niveauLabels[n as string] ?? `Raw: ${n}`}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="relative w-64 md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par code ou intitulé..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              data-testid="input-search-modules"
            />
          </div>
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
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aucun module trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="font-mono font-medium text-xs">{module.code}</TableCell>
                  <TableCell className="font-medium">{module.intitule}</TableCell>
                  <TableCell className="font-mono text-xs">{module.filiereCode}</TableCell>
                   <TableCell className="text-xs font-semibold">
                      <Badge variant="outline" className="font-normal border-primary/20 bg-primary/5 text-primary">
                        {niveauLabels[module.niveau] ?? `Inconnu (${module.niveau})`}
                      </Badge>
                   </TableCell>
                  <TableCell className="text-right font-mono font-medium">{module.mhGlobale}h</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!isLoading && filteredModules.length > pageSize && (
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={filteredModules.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>
    </div>
  );
}
