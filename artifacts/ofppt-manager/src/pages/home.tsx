import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { GraduationCap, BookOpen, ClipboardCheck, LayoutDashboard, Database, AlertTriangle, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { OFPPTLogo } from "@/components/ofppt-logo";

export default function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start pt-2 pb-16 p-4 md:p-8 space-y-4">
      <div className="max-w-4xl w-full text-center space-y-2">
        <motion.div 
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="pt-0">
             <OFPPTLogo className="h-16 md:h-20 w-auto drop-shadow-xl opacity-90 transition-all duration-500" />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none mb-1">
              <span className="text-[#00508f]">OFPPT</span> <span className="opacity-20 mx-1">|</span> <span className="text-[#007a33]">Complexe Industriel</span>
            </h1>
            <div className="flex flex-wrap justify-center gap-2 mb-2">
              <span className="text-xs px-3 py-0.5 bg-sky-50 text-sky-700 rounded-full border border-sky-100/50">CQP Nahda</span>
              <span className="text-xs px-3 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100/50">CQP Sammara</span>
            </div>
            {/* Director's Name - Elegant Presentation */}
            <div className="pt-1">
              <p className="text-sm font-medium text-slate-500 font-serif italic tracking-wide">
                Directeur : <span className="text-slate-800 not-italic font-bold">Mr. ZAHID Youness</span>
              </p>
            </div>
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-lg max-w-2xl mx-auto"
        >
          Système intelligent de suivi et de gestion de l'avancement pédagogique, modules validés et alertes disciplinaires.
        </motion.p>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full"
      >
        <div className="group">
          <Link href="/reporting">
            <motion.div variants={item}>
              <Button 
                variant="outline" 
                className="w-full h-auto flex flex-col items-center gap-4 p-8 transition-all hover:border-[#00508f] hover:bg-[#00508f]/5 group-hover:shadow-lg border-2"
              >
                <div className="p-3 rounded-2xl bg-[#00508f]/10 text-[#00508f]">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-[#00508f]">Reporting Global</h3>
                  <p className="text-sm text-muted-foreground mt-1">Analyses et statistiques KPIs</p>
                </div>
              </Button>
            </motion.div>
          </Link>
        </div>

        <div className="group">
          <Link href="/dashboard">
            <motion.div variants={item}>
              <Button 
                variant="outline" 
                className="w-full h-auto flex flex-col items-center gap-4 p-8 transition-all hover:border-primary hover:bg-primary/5 group-hover:shadow-lg"
              >
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  <LayoutDashboard className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">Tableau de bord</h3>
                  <p className="text-sm text-muted-foreground mt-1">Aperçu global de l'avancement et KPIs</p>
                </div>
              </Button>
            </motion.div>
          </Link>
        </div>

        <div className="group">
          <Link href="/modules-valides">
            <motion.div variants={item}>
              <Button 
                variant="outline" 
                className="w-full h-auto flex flex-col items-center gap-4 p-8 transition-all hover:border-success hover:bg-success/5 group-hover:shadow-lg"
              >
                <div className="p-3 rounded-2xl bg-success/10 text-success">
                  <ClipboardCheck className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-success">Modules Validés</h3>
                  <p className="text-sm text-muted-foreground mt-1">Modules terminés à 100% et notes</p>
                </div>
              </Button>
            </motion.div>
          </Link>
        </div>

        <div className="group">
          <Link href="/import">
            <motion.div variants={item}>
              <Button 
                variant="outline" 
                className="w-full h-auto flex flex-col items-center gap-4 p-8 transition-all hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 group-hover:shadow-lg"
              >
                <div className="p-3 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/50">
                  <Database className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-amber-600">Import de données</h3>
                  <p className="text-sm text-muted-foreground mt-1">Charger PV de notes et état d'avancement</p>
                </div>
              </Button>
            </motion.div>
          </Link>
        </div>

        <div className="group">
          <Link href="/groupes">
            <motion.div variants={item}>
              <Button 
                variant="outline" 
                className="w-full h-auto flex flex-col items-center gap-4 p-8 transition-all hover:border-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 group-hover:shadow-lg"
              >
                <div className="p-3 rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800/50">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">Groupes</h3>
                  <p className="text-sm text-muted-foreground mt-1">Gestion des groupes et stagiaires</p>
                </div>
              </Button>
            </motion.div>
          </Link>
        </div>

        <div className="group">
          <Link href="/modules">
            <motion.div variants={item}>
              <Button 
                variant="outline" 
                className="w-full h-auto flex flex-col items-center gap-4 p-8 transition-all hover:border-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 group-hover:shadow-lg"
              >
                <div className="p-3 rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800/50">
                  <BookOpen className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">Modules</h3>
                  <p className="text-sm text-muted-foreground mt-1">Référentiel des modules de formation</p>
                </div>
              </Button>
            </motion.div>
          </Link>
        </div>

        <div className="group">
          <Link href="/alertes">
            <motion.div variants={item}>
              <Button 
                variant="outline" 
                className="w-full h-auto flex flex-col items-center gap-4 p-8 transition-all hover:border-destructive hover:bg-destructive/5 group-hover:shadow-lg"
              >
                <div className="p-3 rounded-2xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-destructive">Alertes</h3>
                  <p className="text-sm text-muted-foreground mt-1">Suivi des absences et discipline</p>
                </div>
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      <footer className="mt-auto py-8 text-center text-muted-foreground text-sm border-t w-full">
        <p>© 2026 OFPPT - Complexe Industriel. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
