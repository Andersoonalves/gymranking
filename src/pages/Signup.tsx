import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      toast.error("Informe o código do grupo");
      return;
    }
    setLoading(true);

    // Validate invite code exists (via security definer RPC)
    const { data: groups, error: groupError } = await supabase
      .rpc("find_group_by_invite_code", { _code: code });
    const group = groups?.[0];

    if (groupError || !group) {
      setLoading(false);
      toast.error("Código de grupo inválido. Verifique e tente novamente.");
      return;
    }

    const { error } = await signUp(email, password, displayName, code);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu email para confirmar.");
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight">Criar Conta</CardTitle>
            <CardDescription className="mt-2">Junte-se ao FitRank e desafie seus amigos</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Código do grupo</Label>
              <Input
                id="invite-code"
                type="text"
                placeholder="Ex: A1B2C3D4"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                className="font-mono tracking-widest uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Peça o código de convite para quem criou o grupo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-semibold" size="lg" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Conta"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
