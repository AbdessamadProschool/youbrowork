import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Lock, User, AlertCircle, Loader } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { OFPPTLogo } from "@/components/ofppt-logo";

export default function Login() {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Mock login without DB
    setTimeout(() => {
      if (credentials.username === "admin" && credentials.password === "admin") {
        localStorage.setItem("ofppt_auth", "true");
        toast.success("Connexion réussie");
        setLocation("/");
      } else {
        setError("Identifiants incorrects");
        toast.error("Identifiants incorrects");
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 dark:bg-slate-950">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8 py-4">
           <OFPPTLogo className="h-28 w-auto drop-shadow-md" />
        </div>

        <Card className="shadow-xl border-t-4 border-primary">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Accès Gestionnaire</CardTitle>
            <CardDescription className="text-center">
              Connectez-vous pour gérer le complexe industriel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Nom d'utilisateur" 
                    className="pl-10"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="password" 
                    placeholder="Mot de passe" 
                    className="pl-10"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-primary hover:opacity-90 h-11 text-lg font-medium" 
                disabled={loading}
              >
                {loading ? <Loader className="animate-spin mr-2 h-5 w-5" /> : "Se connecter"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 text-sm text-muted-foreground">
            <div className="text-center font-mono text-[10px] opacity-50">
              UTILISATEUR DÉMO: admin / admin
            </div>
            <div className="flex justify-between w-full text-xs">
              <p>CQP Nahda</p>
              <p>CQP Sammara</p>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
