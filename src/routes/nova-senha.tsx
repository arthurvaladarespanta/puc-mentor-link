import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CartaoAuth } from "@/components/CartaoAuth";
import { CampoSenha } from "@/components/CampoSenha";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";

export const Route = createFileRoute("/nova-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar nova senha | Calouro+" },
      { name: "description", content: "Defina uma nova senha para sua conta do Calouro+." },
      { property: "og:title", content: "Criar nova senha | Calouro+" },
      { property: "og:description", content: "Defina uma nova senha para sua conta do Calouro+." },
    ],
  }),
  component: NovaSenha,
});

function NovaSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      setErro("Esse link pode ter expirado. Peça um novo link de redefinição e tente de novo.");
      return;
    }
    setPronto(true);
    setTimeout(() => navigate({ to: "/feed" }), 1200);
  }

  return (
    <CartaoAuth titulo="Criar nova senha" descricao="Escolha uma senha nova para entrar na sua conta.">
      {pronto ? (
        <p className="text-sm text-success">Senha alterada. Levando você para o feed…</p>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="senha" className="text-sm font-medium">
              Nova senha
            </label>
            <CampoSenha id="senha" value={senha} onChange={setSenha} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmacao" className="text-sm font-medium">
              Confirme a nova senha
            </label>
            <CampoSenha id="confirmacao" value={confirmacao} onChange={setConfirmacao} autoComplete="new-password" />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? <Spinner className="size-4" /> : "Salvar nova senha"}
          </Button>
          <p className="pt-2 text-center text-sm">
            <Link to="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">
              Voltar para o login
            </Link>
          </p>
        </form>
      )}
    </CartaoAuth>
  );
}
