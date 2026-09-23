import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CartaoAuth } from "@/components/CartaoAuth";
import { CampoSenha } from "@/components/CampoSenha";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import { traduzirErroAuth } from "@/lib/erros-auth";

export const Route = createFileRoute("/cadastrar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cadastre-se | Calouro+" },
      { name: "description", content: "Crie sua conta no Calouro+ e comece a marcar aulas." },
      { property: "og:title", content: "Cadastre-se | Calouro+" },
      { property: "og:description", content: "Crie sua conta no Calouro+ e comece a marcar aulas." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/feed" });
  },
  component: Cadastrar,
});

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Cadastrar() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<{ email?: string; senha?: string; confirmacao?: string }>({});
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const novos: typeof erros = {};
    if (!FORMATO_EMAIL.test(email.trim())) novos.email = "E-mail inválido. Use o formato nome@exemplo.com.";
    if (senha.length < 6) novos.senha = "A senha precisa ter pelo menos 6 caracteres.";
    if (senha !== confirmacao) novos.confirmacao = "As senhas não são iguais.";
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { emailRedirectTo: window.location.origin },
    });
    setCarregando(false);

    if (error) {
      const mensagem = traduzirErroAuth(error, "cadastro");
      setErros(/senha|password/i.test(mensagem) ? { senha: mensagem } : { email: mensagem });
      return;
    }

    if (!data.session) {
      setErros({ email: "Confirme seu e-mail pelo link que enviamos e depois entre na sua conta." });
      return;
    }

    navigate({ to: "/completar-perfil" });
  }

  return (
    <CartaoAuth titulo="Cadastre-se" descricao="Crie sua conta para achar aulas ou dar as suas.">
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
          {erros.email && (
            <p className="text-sm text-destructive">
              {erros.email}{" "}
               {erros.email.includes("já tem conta") && (
                <>
                  <Link to="/entrar" className="underline">
                    Entrar
                  </Link>{" "}
                  ·{" "}
                  <Link to="/esqueci-senha" className="underline">
                    Recuperar senha
                  </Link>
                </>
              )}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="senha" className="text-sm font-medium">
            Senha
          </label>
          <CampoSenha id="senha" value={senha} onChange={setSenha} autoComplete="new-password" placeholder="Crie uma senha" />
          {erros.senha && <p className="text-sm text-destructive">{erros.senha}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmacao" className="text-sm font-medium">
            Confirme a senha
          </label>
          <CampoSenha
            id="confirmacao"
            value={confirmacao}
            onChange={setConfirmacao}
            autoComplete="new-password"
            placeholder="Repita a senha"
          />
          {erros.confirmacao && <p className="text-sm text-destructive">{erros.confirmacao}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={carregando}>
          {carregando ? <Spinner className="size-4" /> : "Criar conta"}
        </Button>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </CartaoAuth>
  );
}
