import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  GraduationCap, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  UserMinus,
  Briefcase,
  Save,
  Pencil,
  Trash2
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

// Mock types representing our DB schema
interface Formateur {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  specialite: string;
  type: "CAT_36" | "CAT_26" | "VACATAIRE_RETRAITE" | "VACATAIRE_ACTIF";
  optionHeuresSup: boolean;
  desiste: boolean;
}

export default function Formateurs() {
  const [open, setOpen] = useState(false);
  const [newFormateur, setNewFormateur] = useState<{
    matricule: string;
    nom: string;
    prenom: string;
    specialite: string;
    type: "CAT_36" | "CAT_26" | "VACATAIRE_RETRAITE" | "VACATAIRE_ACTIF";
    optionHeuresSup: boolean;
  }>({
    matricule: "",
    nom: "",
    prenom: "",
    specialite: "",
    type: "CAT_36",
    optionHeuresSup: false
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);

  const [etabId, setEtabId] = useState<string | null>(null);

  useEffect(() => {
    setEtabId(localStorage.getItem("selected_etab_id"));
  }, []);

  const { data: formateurs, isLoading, refetch } = useQuery<Formateur[]>({
    queryKey: ["/api/formateurs", etabId],
    queryFn: async () => {
      const res = await fetch("/api/formateurs", {
        headers: { "x-etab-id": etabId || "" }
      });
      return res.json();
    },
    enabled: !!etabId
  });

  const handleCreate = async () => {
    if (!newFormateur.matricule || !newFormateur.nom) {
      toast.error("Veuillez remplir les champs obligatoires.");
      return;
    }

    if (!etabId) {
      toast.error("Établissement non sélectionné.");
      return;
    }
    
    try {
      const response = await fetch("/api/formateurs", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-etab-id": etabId
        },
        body: JSON.stringify({ ...newFormateur, etablissementId: etabId })
      });
      
      if (response.ok) {
        toast.success(isEdit ? "Profil mis à jour !" : "Formateur ajouté avec succès !");
        setOpen(false);
        setIsEdit(false);
        setEditingId(null);
        setNewFormateur({ matricule: "", nom: "", prenom: "", specialite: "", type: "CAT_36", optionHeuresSup: false });
        refetch();
      } else {
        toast.error("Échec de la sauvegarde serveur.");
      }
    } catch (error) {
      toast.error("Échec de la création. Connexion réseau.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce formateur ?")) return;
    try {
      const response = await fetch(`/api/formateurs/${id}`, {
        method: "DELETE",
        headers: { "x-etab-id": etabId || "" }
      });
      if (response.ok) {
        toast.success("Formateur supprimé.");
        refetch();
      }
    } catch (error) {
      toast.error("Échec de la suppression.");
    }
  };

  const startEdit = (f: Formateur) => {
    setNewFormateur({
      matricule: f.matricule,
      nom: f.nom,
      prenom: f.prenom,
      specialite: f.specialite,
      type: f.type,
      optionHeuresSup: f.optionHeuresSup
    });
    setEditingId(f.id);
    setIsEdit(true);
    setOpen(true);
  };

  const handleToggleDesiste = async (formateur: Formateur) => {
    try {
      const response = await fetch(`/api/formateurs/${formateur.id}/desiste`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desiste: !formateur.desiste })
      });
      if (response.ok) {
        toast.success(`Statut de ${formateur.nom} mis à jour.`);
        refetch();
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour.");
    }
  };

  const getBadgeType = (type: string) => {
    switch (type) {
      case "CAT_36": return <Badge className="bg-[#00508f]">CAT 36 (36h/Sem)</Badge>;
      case "CAT_26": return <Badge className="bg-emerald-600">CAT 26 (26h/Sem)</Badge>;
      case "VACATAIRE_RETRAITE": return <Badge variant="outline">Vacataire (Retraité)</Badge>;
      case "VACATAIRE_ACTIF": return <Badge variant="secondary">Vacataire (Actif)</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getQuota = (type: string, hasOT: boolean) => {
    if (type === "CAT_36") return hasOT ? "1500h/an" : "1260h/an";
    if (type === "CAT_26") return hasOT ? "1085h/an" : "910h/an";
    if (type === "VACATAIRE_RETRAITE") return "25h/sem max";
    if (type === "VACATAIRE_ACTIF") return "10h/sem max";
    return "-";
  };

  if (isLoading) {
    return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="space-y-6 pt-6 px-4 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#00508f] rounded-xl text-white shadow-lg"><GraduationCap className="h-6 w-6" /></div>
             <h1 className="text-3xl font-black tracking-tight text-slate-800 uppercase">Gestion du Corps Formateur</h1>
          </div>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2 ml-14">Administration des Ressources Humaines & Quotas</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00963f] hover:bg-[#007b34] h-12 px-6 rounded-2xl font-bold uppercase text-xs gap-2 shadow-xl shadow-emerald-500/20">
              <UserPlus className="h-5 w-5" />
              Ajouter un Formateur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                 <div className="p-2 bg-[#00963f] rounded-lg text-white">{isEdit ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}</div>
                 {isEdit ? "Modifier Formateur" : "Nouveau Formateur"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Matricule</Label>
                  <Input 
                    value={newFormateur.matricule} 
                    onChange={(e) => setNewFormateur({...newFormateur, matricule: e.target.value})}
                    placeholder="M12345" 
                    className="rounded-xl border-slate-100 bg-slate-50 font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Spécialité</Label>
                  <Input 
                    value={newFormateur.specialite} 
                    onChange={(e) => setNewFormateur({...newFormateur, specialite: e.target.value})}
                    placeholder="Electrique, EGQ..." 
                    className="rounded-xl border-slate-100 bg-slate-50 font-bold" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom</Label>
                  <Input 
                    value={newFormateur.nom} 
                    onChange={(e) => setNewFormateur({...newFormateur, nom: e.target.value})}
                    placeholder="Nom" 
                    className="rounded-xl border-slate-100 bg-slate-50 font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prénom</Label>
                  <Input 
                    value={newFormateur.prenom} 
                    onChange={(e) => setNewFormateur({...newFormateur, prenom: e.target.value})}
                    placeholder="Prénom" 
                    className="rounded-xl border-slate-100 bg-slate-50 font-bold" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Catégorie OFPPT</Label>
                <Select value={newFormateur.type} onValueChange={(v: any) => setNewFormateur({...newFormateur, type: v})}>
                  <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 font-bold">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="CAT_36">CAT 36 (Interne 36h)</SelectItem>
                    <SelectItem value="CAT_26">CAT 26 (Interne 26h)</SelectItem>
                    <SelectItem value="VACATAIRE_RETRAITE">Vacataire (Retraité - 25h max)</SelectItem>
                    <SelectItem value="VACATAIRE_ACTIF">Vacataire (Actif - 10h max)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase text-slate-700">Option Heures Supplémentaires</Label>
                  <p className="text-[10px] text-slate-400 font-medium italic">Permettre à l'IA de dépasser le quota standard</p>
                </div>
                <Switch 
                  checked={newFormateur.optionHeuresSup} 
                  onCheckedChange={(c) => setNewFormateur({...newFormateur, optionHeuresSup: c})}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => { setOpen(false); setIsEdit(false); }} className="rounded-xl font-bold uppercase text-[10px]">Annuler</Button>
              <Button onClick={handleCreate} className="bg-[#00963f] hover:bg-[#007b34] rounded-xl font-black uppercase text-[10px] px-8 gap-2">
                <Save className="h-4 w-4" />
                {isEdit ? "Mettre à jour" : "Enregistrer le Profil"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50 border-b p-6">
          <CardTitle className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Liste des Formateurs Actifs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none">
                <TableHead className="font-black text-[10px] uppercase text-muted-foreground px-6 py-4">Matricule</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-muted-foreground px-6 py-4">Nom & Prénom</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-muted-foreground px-6 py-4">Spécialité</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-muted-foreground px-6 py-4">Catégorie</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-muted-foreground px-6 py-4">Quota Annuel</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-muted-foreground px-6 py-4">Statut</TableHead>
                <TableHead className="px-6 py-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formateurs?.map((f) => (
                <TableRow key={f.id} className="hover:bg-slate-50/80 transition-colors border-slate-100 group">
                  <TableCell className="px-6 py-4 font-mono text-xs font-bold text-slate-400 group-hover:text-[#00508f] transition-colors">{f.matricule}</TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                       <span className="font-black text-slate-700">{f.nom} {f.prenom}</span>
                       <span className="text-[10px] text-muted-foreground">ID: {f.id.slice(0,8)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-slate-600 uppercase text-xs">{f.specialite}</TableCell>
                  <TableCell className="px-6 py-4">{getBadgeType(f.type)}</TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#00508f]">{getQuota(f.type, f.optionHeuresSup)}</span>
                      {f.optionHeuresSup && <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] uppercase px-1">HS Opt-in</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {f.desiste ? (
                      <Badge variant="destructive" className="gap-1 px-3 py-1 animate-pulse"><UserMinus className="h-3 w-3" /> Désisté</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 border-none gap-1 px-3 py-1"><CheckCircle2 className="h-3 w-3" /> Actif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className={`rounded-xl border-slate-200 font-bold text-[10px] uppercase gap-2 hover:bg-slate-100 ${f.desiste ? "text-emerald-600 border-emerald-200" : "text-red-600 border-red-200"}`}
                         onClick={() => handleToggleDesiste(f)}
                       >
                         {f.desiste ? <CheckCircle2 className="h-3.5 w-3.5" /> : <UserMinus className="h-3.5 w-3.5" />}
                         {f.desiste ? "Réactiver" : "Désister"}
                       </Button>
                       <Button variant="outline" size="sm" className="rounded-xl h-8 w-8 p-0 text-slate-400 hover:text-[#00508f]" onClick={() => startEdit(f)}><Pencil className="h-4 w-4" /></Button>
                       <Button variant="outline" size="sm" className="rounded-xl h-8 w-8 p-0 text-slate-400 hover:text-red-600 border-red-50" onClick={() => handleDelete(f.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-3 gap-6">
         <Card className="bg-gradient-to-br from-[#00508f] to-[#003d6d] text-white p-6 rounded-3xl shadow-xl border-none">
            <h3 className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-4">Focus Quota</h3>
            <div className="flex items-end justify-between">
               <div><p className="text-4xl font-black">1500h</p><p className="text-[9px] uppercase opacity-70 mt-1 uppercase">Max Annuel - Cat 36</p></div>
               <AlertCircle className="h-10 w-10 text-amber-400 opacity-20" />
            </div>
         </Card>
         <Card className="bg-white p-6 rounded-3xl shadow-xl ring-1 ring-slate-100 flex flex-col justify-between">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest uppercase">Vacataires Externes</h3>
            <div className="flex items-center gap-4 mt-2">
               <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">10h</div>
               <p className="text-[9px] font-bold text-slate-500 uppercase">Capacité Hebdomadaire Active</p>
            </div>
         </Card>
         <Card className="bg-slate-900 p-6 rounded-3xl shadow-xl border-none">
            <h3 className="text-[10px] font-black uppercase text-white/30 tracking-widest uppercase">Alertes de Remplacement</h3>
            <p className="text-white font-black text-xl mt-2">{formateurs?.filter(f => f.desiste).length || 0} désistements</p>
            <p className="text-amber-400 text-[10px] font-bold mt-1">Action requise : Délégation spéciale</p>
         </Card>
      </div>
    </div>
  );
}
