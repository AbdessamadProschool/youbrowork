import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Building2, 
  PlusCircle, 
  Hammer, 
  BookOpen, 
  Hash, 
  MapPin, 
  Activity,
  AlertCircle,
  Save,
  Pencil,
  Trash2
} from "lucide-react";

interface Salle {
  id: string;
  nom: string;
  type: "ATELIER" | "SALLE_COURS";
  capacite: number;
}

export default function Salles() {
  const [open, setOpen] = useState(false);
  const [etabId, setEtabId] = useState<string | null>(null);
  const [newSalle, setNewSalle] = useState<{
    nom: string;
    type: "ATELIER" | "SALLE_COURS";
    capacite: number;
  }>({
    nom: "",
    type: "SALLE_COURS",
    capacite: 30
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    setEtabId(localStorage.getItem("selected_etab_id"));
  }, []);

  const { data: salles, isLoading, refetch } = useQuery<Salle[]>({
    queryKey: ["/api/salles", etabId],
    queryFn: async () => {
      const res = await fetch("/api/salles", {
        headers: { "x-etab-id": etabId || "" }
      });
      return res.json();
    },
    enabled: !!etabId
  });

  const handleCreate = async () => {
    if (!newSalle.nom || !etabId) {
      toast.error(etabId ? "Veuillez donner un nom à l'espace." : "Établissement non sélectionné.");
      return;
    }
    
    try {
      const response = await fetch("/api/salles", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "x-etab-id": etabId
        },
        body: JSON.stringify({ ...newSalle, etablissementId: etabId })
      });
      
      if (response.ok) {
        toast.success(isEdit ? "Espace mis à jour !" : "Ressource ajoutée avec succès !");
        setOpen(false);
        setIsEdit(false);
        setEditingId(null);
        setNewSalle({ nom: "", type: "SALLE_COURS", capacite: 30 });
        refetch();
      } else {
        toast.error("Erreur lors de la validation serveur.");
      }
    } catch (error) {
      toast.error("Échec de la connexion réseau.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous supprimer cette salle ?")) return;
    try {
      const response = await fetch(`/api/salles/${id}`, {
        method: "DELETE",
        headers: { "x-etab-id": etabId || "" }
      });
      if (response.ok) {
        toast.success("Ressource supprimée.");
        refetch();
      }
    } catch (error) {
      toast.error("Échec de la suppression.");
    }
  };

  const startEdit = (s: Salle) => {
    setNewSalle({
      nom: s.nom,
      type: s.type,
      capacite: s.capacite
    });
    setEditingId(s.id);
    setIsEdit(true);
    setOpen(true);
  };

  const getBadgeType = (type: string) => {
    switch (type) {
      case "ATELIER": return <Badge className="bg-amber-500 gap-1.5"><Hammer className="h-3 w-3" /> Atelier Métier</Badge>;
      case "SALLE_COURS": return <Badge className="bg-sky-600 gap-1.5"><BookOpen className="h-3 w-3" /> Salle de Cours</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-12 space-y-8 bg-white min-h-screen"><Skeleton className="h-10 w-64 rounded-xl" /><Skeleton className="h-[500px] w-full rounded-[2rem]" /></div>;
  }

  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans border-t-2 border-[#00508f]">
      <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-10">
        <header className="flex justify-between items-end border-b border-slate-100 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl"><Building2 className="h-6 w-6" /></div>
               <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Parc Immo & Ateliers</h1>
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] ml-1">Gestionnaire des Surfaces Pédagogiques</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00508f] hover:bg-slate-900 h-14 px-8 rounded-2xl font-black uppercase text-xs gap-3 shadow-lg transition-all">
                <PlusCircle className="h-6 w-6" />
                Ajouter une Ressource
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl p-10">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black uppercase text-slate-800 flex items-center gap-4">
                   <div className="p-3 bg-slate-100 rounded-2xl">{isEdit ? <Pencil className="h-6 w-6 text-[#00508f]" /> : <PlusCircle className="h-6 w-6 text-[#00508f]" />}</div>
                   {isEdit ? "Modifier Espace" : "Nouvelle Ressource"}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Désignation de l'espace</Label>
                  <Input 
                    value={newSalle.nom} 
                    onChange={(e) => setNewSalle({...newSalle, nom: e.target.value.toUpperCase()})}
                    placeholder="EX: AT-ELEC-1, LABO-DIGIT..." 
                    className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold uppercase placeholder:text-slate-300" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Type</Label>
                    <Select value={newSalle.type} onValueChange={(v: any) => setNewSalle({...newSalle, type: v})}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold">
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        <SelectItem value="ATELIER">ATELIER (Métier)</SelectItem>
                        <SelectItem value="SALLE_COURS">SALLE DE COURS (EGQ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Capacité Max</Label>
                    <Input 
                      type="number"
                      value={newSalle.capacite} 
                      onChange={(e) => setNewSalle({...newSalle, capacite: parseInt(e.target.value) || 0})}
                      className="h-12 rounded-xl border-slate-100 bg-slate-50 font-black" 
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-8 flex gap-3">
                <Button variant="ghost" onClick={() => { setOpen(false); setIsEdit(false); }} className="rounded-xl font-bold uppercase text-[10px] h-12 px-6">Annuler</Button>
                <Button onClick={handleCreate} className="bg-slate-900 hover:bg-[#00963f] rounded-xl font-black uppercase text-[10px] h-12 px-10 gap-2 transition-all flex-1">
                  <Save className="h-4 w-4" />
                  {isEdit ? "Mettre à jour" : "Valider l'Espace"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="grid md:grid-cols-4 gap-6">
           <Card className="bg-slate-50/50 p-8 shadow-sm border-none rounded-[2rem] flex flex-col items-center">
              <Hammer className="h-8 w-8 text-amber-500 mb-3 opacity-50" />
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{salles?.filter(s => s.type === "ATELIER").length || 0}</p>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Ateliers Métiers</p>
           </Card>
           <Card className="bg-slate-50/50 p-8 shadow-sm border-none rounded-[2rem] flex flex-col items-center">
              <BookOpen className="h-8 w-8 text-sky-600 mb-3 opacity-50" />
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{salles?.filter(s => s.type === "SALLE_COURS").length || 0}</p>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Salles de Cours</p>
           </Card>
           <Card className="bg-slate-50/50 p-8 shadow-sm border-none rounded-[2rem] flex flex-col items-center">
              <Hash className="h-8 w-8 text-slate-300 mb-3 opacity-50" />
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{salles?.reduce((sum, s) => sum + s.capacite, 0) || 0}</p>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Capacité Totale</p>
           </Card>
           <Card className="bg-emerald-50 border-none p-8 rounded-[2rem] shadow-sm flex items-center justify-between relative overflow-hidden">
              <div className="relative z-10"><p className="text-4xl font-black text-emerald-600">100%</p><p className="text-[10px] uppercase font-black text-emerald-400">Occupation Optimale</p></div>
              <Activity className="h-16 w-16 text-emerald-100 absolute -right-2 -bottom-2" />
           </Card>
        </div>

        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden ring-1 ring-slate-100 bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-8 py-6 font-black uppercase text-[11px] text-slate-400 tracking-[0.2em]"><MapPin className="h-4 w-4 inline mr-2" /> Désignation</TableHead>
                  <TableHead className="px-8 py-6 font-black uppercase text-[11px] text-slate-400 tracking-[0.2em]">Usage</TableHead>
                  <TableHead className="px-8 py-6 font-black uppercase text-[11px] text-slate-400 tracking-[0.2em] text-center">Capacité</TableHead>
                  <TableHead className="px-8 py-6 font-black uppercase text-[11px] text-slate-400 tracking-[0.2em]">Disponibilité</TableHead>
                  <TableHead className="px-8 py-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!salles || salles.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">Aucun espace raccordé pour ce centre</TableCell></TableRow>
                )}
                {salles?.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                    <TableCell className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className={`w-1.5 h-12 rounded-full ${s.type === 'ATELIER' ? 'bg-amber-500' : 'bg-[#00508f]'}`} />
                         <div><p className="font-black text-slate-900 text-xl uppercase leading-none tracking-tight">{s.nom}</p><p className="text-[9px] text-slate-400 font-bold mt-2 tracking-widest">ID: {s.id.slice(0,8).toUpperCase()}</p></div>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6">{getBadgeType(s.type)}</TableCell>
                    <TableCell className="px-8 py-6">
                      <div className="flex flex-col items-center">
                         <span className="font-black text-2xl text-slate-900">{s.capacite}</span>
                         <span className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">Stagiaires</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none font-bold text-[9px] uppercase tracking-widest px-3 py-1">
                         Libre
                      </Badge>
                    </TableCell>
                    <TableCell className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="rounded-xl h-10 w-10 p-0 text-slate-400 hover:text-[#00508f] hover:border-[#00508f]" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" className="rounded-xl h-10 w-10 p-0 text-slate-400 hover:text-red-600 hover:border-red-200" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <footer className="flex items-center gap-6 p-10 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 mt-12">
           <div className="p-4 bg-white rounded-2xl shadow-sm"><AlertCircle className="h-6 w-6 text-[#00508f]" /></div>
           <p className="text-[11px] text-slate-400 leading-relaxed max-w-3xl font-bold uppercase tracking-tight italic">
             L'optimisation des parcs ateliers est une priorité algorithmique. Les espaces "Atelier Métier" sont réservés aux modules pratiques pour garantir une conformité totale avec les référentiels de formation OFPPT.
           </p>
        </footer>
      </div>
    </div>
  );
}
