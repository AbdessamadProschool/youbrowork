import { useGetGroupes, useGetAlertes, useGetModules, useGetStagiaires } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { OFPPTLogo } from "@/components/ofppt-logo";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  AlertCircle, 
  Users, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Award, 
  Trophy, 
  GraduationCap, 
  CalendarCheck, 
  FileDown,
  TrendingUp,
  Target
} from "lucide-react";

// Official OFPPT Colors
const OFPPT_BLUE = "#00508f";
const OFPPT_GREEN = "#00963f";

export default function Reporting() {
  const { data: rawGroupes, isLoading: loadGrp } = useGetGroupes();
  const { data: rawAlertes, isLoading: loadAlt } = useGetAlertes();
  const { data: rawModules, isLoading: loadMod } = useGetModules();
  const { data: rawStagiaires, isLoading: loadStg } = useGetStagiaires();

  const isLoading = loadGrp || loadAlt || loadMod || loadStg;

  if (isLoading) {
    return (
      <div className="p-10 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      </div>
    );
  }

  // Data Logic
  const groupsData = (rawGroupes || []).map(g => {
    const factor = (g.tauxReel !== undefined && g.tauxReel <= 1.1) ? 100 : 1;
    return { ...g, safeTauxReel: (g.tauxReel ?? 0) * factor, safeTauxTheo: (g.tauxTheorique ?? 0) * factor, safeEcart: (g.ecart ?? 0) * factor };
  });

  const totalGroupes = groupsData.length;
  if (totalGroupes === 0) return <div>No data available</div>;

  const avgReel = groupsData.reduce((sum, g) => sum + g.safeTauxReel, 0) / totalGroupes;
  const allStagiaires = rawStagiaires || [];
  const topStagiaires = [...allStagiaires].sort((a, b) => (b.moyenneGenerale ?? 0) - (a.moyenneGenerale ?? 0)).slice(0, 5);
  const avgComplexSuccess = allStagiaires.length > 0 ? (allStagiaires.filter(s => (s.moyenneGenerale ?? 0) >= 10).length / allStagiaires.length) * 100 : 0;
  
  const alertes = rawAlertes || [];
  const enRetard = groupsData.filter(g => g.safeEcart < -5).length;
  const totalDisciplinaire = alertes.filter(a => a.niveau === "disciplinaire").length;
  const indiceDiscipline = Math.max(0, 100 - (totalDisciplinaire * 5));

  const filieres = [...new Set(groupsData.map(g => g.filiereNom))];
  const statsParFiliere = filieres.map(f => {
    const subset = groupsData.filter(g => g.filiereNom === f);
    return { name: f, avg: subset.reduce((s, g) => s + g.safeTauxReel, 0) / subset.length };
  });

  // PDF Engine
  const generatePDFReport = () => {
    try {
      console.log("PDF START");
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString('fr-FR');

      // Blue Header
      doc.setFillColor(0, 80, 143);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("OFPPT - RAPPORT DE SYNTHÈSE", 105, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Direction: M. ZAHID Youness | Date: ${date}`, 105, 25, { align: "center" });

      // KPIs
      doc.setTextColor(0, 0, 0);
      doc.text("1. INDICATEURS DE PERFORMANCE", 15, 50);
      autoTable(doc, {
        startY: 55,
        head: [['Indicateur', 'Valeur', 'Statut']],
        body: [
          ["Avancement Global", `${avgReel.toFixed(1)}%`, "VALIDE"],
          ["Taux de Réussite", `${avgComplexSuccess.toFixed(1)}%`, "CONFORME"],
          ["Discipline", `${indiceDiscipline}%`, "SATISFAISANT"]
        ],
        headStyles: { fillColor: [0, 150, 63] }
      });

      // Retards
      const nextY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("2. FOCUS RETARDS CRITIQUES", 15, nextY);
      const critData = groupsData.sort((a,b) => a.safeEcart - b.safeEcart).slice(0, 3).map(g => [g.code, g.filiereNom, `${g.safeEcart.toFixed(1)}%`]);
      autoTable(doc, {
        startY: nextY + 5,
        head: [['Groupe', 'Filière', 'Écart (%)']],
        body: critData,
        headStyles: { fillColor: [200, 0, 0] }
      });

      // Honneurs
      const honorsY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("3. TABLEAU D'HONNEUR", 15, honorsY);
      const honData = topStagiaires.map(s => [s.prenom + " " + s.nom, s.groupeCode, (s.moyenneGenerale ?? 0).toFixed(2)]);
      autoTable(doc, {
        startY: honorsY + 5,
        head: [['Stagiaire', 'Groupe', 'Moyenne']],
        body: honData
      });

      doc.save(`Rapport_OFPPT_${date}.pdf`);
      alert("Votre rapport PDF a été généré avec succès !");
    } catch (e) {
      console.error(e);
      alert("Erreur PDF: " + JSON.stringify(e));
    }
  };

  return (
    <div className="space-y-6 pt-1 pb-16 px-1">
      <header className="flex justify-between items-end border-b pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 rounded-full bg-[#00508f]" />
            <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 leading-none">Console Décisionnelle</h1>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Intelligence Sectorielle OFPPT</p>
        </div>
        <div className="flex gap-4 items-center">
           <Button 
             onClick={() => {
                console.log("Button Pressed");
                generatePDFReport();
             }}
             className="bg-[#00508f] hover:bg-[#002d5d] h-12 px-8 rounded-2xl font-black text-xs uppercase shadow-2xl relative z-50 ring-2 ring-blue-400/20 active:scale-95 transition-all"
           >
             <FileDown className="h-5 w-5 mr-3" />
             Générer Rapport PDF
           </Button>
           <div className="bg-slate-50 p-2 px-4 rounded-xl border flex items-center gap-2">
              <span className="text-xl font-black text-[#00963f]">{avgComplexSuccess.toFixed(1)}%</span>
              <Award className="h-5 w-5 text-[#00963f]" />
           </div>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[#00508f] text-white p-6 shadow-xl"><Zap className="h-6 w-6 text-emerald-400 mb-4" /><p className="text-5xl font-black">{avgReel.toFixed(1)}%</p><p className="text-[10px] font-black uppercase text-[#00963f] mt-1">Avancement</p></Card>
        <Card className="p-6 shadow-xl flex flex-col justify-between"><Trophy className="h-6 w-6 text-amber-500" /><div><p className="text-4xl font-black">{avgComplexSuccess.toFixed(0)}%</p><p className="text-[10px] font-bold uppercase text-slate-400">Réussite</p></div></Card>
        <Card className="p-6 shadow-xl flex flex-col justify-between border-red-500/20"><AlertCircle className="h-6 w-6 text-red-500" /><div><p className="text-4xl font-black text-red-600">{enRetard}</p><p className="text-[10px] font-bold uppercase text-slate-400">Retards</p></div></Card>
        <Card className="p-6 shadow-xl flex flex-col justify-between"><Users className="h-6 w-6 text-[#00508f]" /><div><p className="text-4xl font-black">{allStagiaires.length}</p><p className="text-[10px] font-bold uppercase text-slate-400">Stagiaires</p></div></Card>
      </div>

      <Tabs defaultValue="strategy" className="pt-4">
        <TabsList className="bg-slate-100 p-1 rounded-2xl mb-6 grid grid-cols-4 w-[600px]">
          <TabsTrigger value="strategy" className="rounded-xl font-black text-[9px] uppercase data-[state=active]:bg-[#00508f] data-[state=active]:text-white">🚀 Stratégie</TabsTrigger>
          <TabsTrigger value="excellence" className="rounded-xl font-black text-[9px] uppercase data-[state=active]:bg-[#00963f] data-[state=active]:text-white">🏆 Excellence</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl font-black text-[9px] uppercase data-[state=active]:bg-black data-[state=active]:text-white">🔍 Audit</TabsTrigger>
          <TabsTrigger value="distribution" className="rounded-xl font-black text-[9px] uppercase data-[state=active]:bg-slate-500 data-[state=active]:text-white">🎡 Répartition</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="grid grid-cols-7 gap-6">
           <Card className="col-span-4 p-8 rounded-3xl shadow-2xl border-none space-y-8">
              {statsParFiliere.map(f => (
                <div key={f.name} className="space-y-2">
                   <div className="flex justify-between font-black uppercase text-xs"><span>{f.name}</span><span>{f.avg.toFixed(1)}%</span></div>
                   <Progress value={f.avg} className="h-3" style={{ "--progress-foreground": f.avg > 80 ? '#00963f' : '#00508f' } as any} />
                </div>
              ))}
           </Card>
           <Card className="col-span-3 bg-slate-900 text-white p-6 rounded-3xl shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-6">Urgences de Direction</h3>
              <div className="space-y-4">
                 {groupsData.sort((a,b) => a.safeEcart - b.safeEcart).filter(g => g.safeEcart < -1).slice(0, 3).map(g => (
                    <div key={g.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/10">
                       <div><p className="text-lg font-black">{g.code}</p><p className="text-[9px] font-bold opacity-30 uppercase">{g.filiereNom}</p></div>
                       <Badge variant="destructive" className="bg-red-500/20 text-red-500">-{Math.abs(g.safeEcart).toFixed(1)}%</Badge>
                    </div>
                 ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="excellence" className="grid grid-cols-2 gap-6">
           <Card className="p-8 shadow-2xl rounded-3xl">
              <h3 className="text-sm font-black text-[#00508f] uppercase mb-8 flex items-center gap-3"><Trophy className="h-5 w-5 text-amber-500" /> Tableau d'Excellence</h3>
              <div className="space-y-3">
                 {topStagiaires.map((s, i) => (
                   <div key={s.id} className="p-4 flex items-center justify-between bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-4"><span className="text-xs font-black opacity-20">#{i+1}</span><div><p className="text-sm font-black">{s.prenom} {s.nom}</p><p className="text-[9px] font-bold opacity-30">{s.groupeCode}</p></div></div>
                    <p className="text-lg font-black text-[#00963f]">{(s.moyenneGenerale ?? 0).toFixed(2)}</p>
                   </div>
                 ))}
              </div>
           </Card>
           <Card className="bg-[#00508f] text-white p-10 rounded-3xl flex flex-col justify-center items-center text-center">
              <GraduationCap className="h-16 w-16 text-[#00963f] mb-6" />
              <p className="text-6xl font-black">{avgComplexSuccess.toFixed(1)}%</p>
              <p className="text-xs font-bold uppercase opacity-50 mt-4 tracking-widest">Taux d'Admission Complexe</p>
           </Card>
        </TabsContent>
      </Tabs>

      <footer className="mt-12 pt-8 border-t flex flex-col items-center gap-3">
         <OFPPTLogo className="h-8 w-auto grayscale opacity-40" />
         <p className="text-[10px] font-black uppercase tracking-[0.4em] font-mono text-slate-300">Governance Intelligence Suite 2026</p>
      </footer>
    </div>
  );
}
