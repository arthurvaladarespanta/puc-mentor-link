import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CartaoAuth } from "@/components/CartaoAuth";
import { CampoSenha } from "@/components/CampoSenha";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";

export const Route = createFileRoute("/entrar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | Calouro+" },
      { name: "description", content: "Acesse sua conta do Calouro+ para ver aulas e conversas." },
      { property: "og:title", content: "Entrar | Calouro+" },
      { property: "og:description", content: "Acesse sua conta do Calouro+ para ver aulas e conversas." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/feed" });
  },
  component: Entrar,
});

function Entrar() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) {
      setErro("Usuário ou senha incorretos. Confira os dados e tente de novo.");
      return;
    }
    navigate({ to: "/feed" });
  }

  return (
    <CartaoAuth titulo="Entrar" descricao="Que bom te ver de novo. Acesse para continuar.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu e-mail"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="senha" className="text-sm font-medium">
            Senha
          </label>
          <CampoSenha id="senha" value={senha} onChange={setSenha} autoComplete="current-password" placeholder="Digite sua senha" />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <Button type="submit" className="w-full" disabled={carregando}>
          {carregando ? <Spinner className="size-4" /> : "Entrar"}
        </Button>

        <div className="flex flex-col items-center gap-2 pt-2 text-sm">
          <Link to="/esqueci-senha" className="font-medium text-primary underline-offset-4 hover:underline">
            Esqueci minha senha
          </Link>
          <span className="text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/cadastrar" className="font-medium text-primary underline-offset-4 hover:underline">
              Cadastre-se
            </Link>
          </span>
        </div>
      </form>
    </CartaoAuth>
  );
}
