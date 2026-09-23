import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CartaoAuth } from "@/components/CartaoAuth";
import { SeletorDeMateria } from "@/components/SeletorDeMateria";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import type { Materia } from "@/lib/materias";

export const Route = createFileRoute("/completar-perfil")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Seu perfil | Calouro+" },
      { name: "description", content: "Conte seu nome, seu curso e as matérias que te interessam." },
      { property: "og:title", content: "Seu perfil | Calouro+" },
      { property: "og:description", content: "Conte seu nome, seu curso e as matérias que te interessam." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: CompletarPerfil,
});

function CompletarPerfil() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<{ id: string; nome: string }[]>([]);
  const [nome, setNome] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase
      .from("cursos")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setCursos(data ?? []));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nome.trim().length < 2) {
      setErro("Escreva seu nome completo para os veteranos te reconhecerem.");
      return;
    }
    setSalvando(true);
    const { data: sessao } = await supabase.auth.getUser();
    const uid = sessao.user!.id;

    const { error } = await supabase
      .from("perfis")
      .upsert({ id: uid, nome: nome.trim(), curso_id: cursoId || null });

    if (!error && materias.length > 0) {
      await supabase
        .from("usuario_materias")
        .insert(materias.map((m) => ({ usuario_id: uid, materia_id: m.id })));
    }
    setSalvando(false);
    if (error) {
      setErro("Não deu para salvar agora. Tente de novo em instantes.");
      return;
    }
    navigate({ to: "/feed" });
  }

  return (
    <CartaoAuth titulo="Quase lá" descricao="Conte um pouco sobre você para começar a usar o Calouro+.">
      <form onSubmit={salvar} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="nome" className="text-sm font-medium">
            Nome completo
          </label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como você se chama?" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="curso" className="text-sm font-medium">
            Curso
          </label>
          <select
            id="curso"
            value={cursoId}
            onChange={(e) => setCursoId(e.target.value)}
            className="h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm"
          >
            <option value="">Selecione seu curso</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <SeletorDeMateria rotulo="Matérias de interesse" selecionadas={materias} aoMudar={setMaterias} />

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <Button type="submit" className="w-full" disabled={salvando}>
          {salvando ? <Spinner className="size-4" /> : "Concluir e ver o feed"}
        </Button>
      </form>
    </CartaoAuth>
  );
}
