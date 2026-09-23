import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CartaoAuth } from "@/components/CartaoAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";

export const Route = createFileRoute("/esqueci-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Esqueceu sua senha? | Calouro+" },
      { name: "description", content: "Receba um link para criar uma nova senha no Calouro+." },
      { property: "og:title", content: "Esqueceu sua senha? | Calouro+" },
      { property: "og:description", content: "Receba um link para criar uma nova senha no Calouro+." },
    ],
  }),
  component: EsqueciSenha,
});

function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nova-senha`,
    });
    setCarregando(false);
    setEnviado(true);
  }

  return (
    <CartaoAuth
      titulo="Esqueceu sua senha?"
      descricao="Digite o e-mail cadastrado na sua conta. Enviaremos um link para você criar uma nova senha."
    >
      <div className="mb-6 flex size-12 items-center justify-center rounded-[8px] border border-border bg-muted">
        <MailCheck className="size-5 text-primary" />
      </div>

      {enviado ? (
        <div className="space-y-6">
          <p className="rounded-[4px] border border-border bg-muted p-3 text-sm text-success">
            Se esse e-mail tiver conta, enviamos um link para criar uma nova senha.
          </p>
          <Link to="/entrar" className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
            <ArrowLeft className="size-4" /> Voltar para o login
          </Link>
        </div>
      ) : (
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
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? (
              <Spinner className="size-4" />
            ) : (
              <>
                Enviar link de redefinição <ArrowRight className="size-4 text-accent" />
              </>
            )}
          </Button>
          <Link
            to="/entrar"
            className="flex items-center justify-center gap-2 pt-2 text-sm font-medium text-primary"
          >
            <ArrowLeft className="size-4" /> Voltar para o login
          </Link>
        </form>
      )}
    </CartaoAuth>
  );
}
