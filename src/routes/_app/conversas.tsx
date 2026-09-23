import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AvatarPerfil } from "@/components/AvatarPerfil";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/Spinner";

export const Route = createFileRoute("/_app/conversas")({
  head: () => ({
    meta: [
      { title: "Conversas | Calouro+" },
      { name: "description", content: "Converse com tutores e alunos sobre as aulas marcadas." },
      { property: "og:title", content: "Conversas | Calouro+" },
      { property: "og:description", content: "Converse com tutores e alunos sobre as aulas marcadas." },
    ],
  }),
  component: Conversas,
});

type Conversa = { id: string; aluno_id: string; tutor_id: string; created_at: string; aulas: { materias: { nome: string } }; outro: { nome: string; foto_url: string | null }; ultima?: { texto: string; anexo_nome: string | null; created_at: string } };

function Conversas() {
  const [uid, setUid] = useState("");
  const [lista, setLista] = useState<Conversa[]>([]);
  const [aba, setAba] = useState("aluno");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  useEffect(() => { (async () => {
    const { data: auth } = await supabase.auth.getUser(); const userId = auth.user?.id; if (!userId) return; setUid(userId);
    const { data } = await supabase.from("conversas").select("id,aluno_id,tutor_id,created_at,aulas(materias(nome))").or(`aluno_id.eq.${userId},tutor_id.eq.${userId}`).order("created_at", { ascending: false });
    const bases = (data ?? []) as unknown as Omit<Conversa, "outro">[];
    const completas = await Promise.all(bases.map(async (c) => {
      const outroId = c.aluno_id === userId ? c.tutor_id : c.aluno_id;
      const [{ data: perfil }, { data: ultima }] = await Promise.all([supabase.from("perfis").select("nome,foto_url").eq("id", outroId).single(), supabase.from("mensagens").select("texto,anexo_nome,created_at").eq("conversa_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle()]);
      return { ...c, outro: perfil ?? { nome: "Pessoa", foto_url: null }, ...(ultima ? { ultima } : {}) } as Conversa;
    })); setLista(completas); setCarregando(false);
  })(); }, []);
  const visiveis = useMemo(() => lista.filter((c) => (aba === "aluno" ? c.aluno_id === uid : c.tutor_id === uid) && `${c.outro.nome} ${c.aulas.materias.nome}`.toLowerCase().includes(busca.toLowerCase())), [lista, aba, busca, uid]);
  return <section className="mx-auto max-w-2xl"><h1 className="font-serif text-4xl font-semibold text-primary">Conversas</h1><div className="relative mt-5"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" placeholder="Pesquisar por nome ou matéria" /></div><Tabs value={aba} onValueChange={setAba} className="mt-4"><TabsList className="grid h-11 w-full grid-cols-2 rounded-[4px]"><TabsTrigger value="aluno" className="rounded-[4px]">Como aluno</TabsTrigger><TabsTrigger value="tutor" className="rounded-[4px]">Como tutor</TabsTrigger></TabsList></Tabs>{carregando ? <div className="flex justify-center py-20"><Spinner /></div> : visiveis.length ? <div className="mt-4 divide-y divide-border rounded-[8px] border border-border bg-card">{visiveis.map((c) => <Link key={c.id} to="/conversas/$conversaId" params={{ conversaId: c.id }} className="flex gap-3 p-4 hover:bg-muted"><AvatarPerfil caminho={c.outro.foto_url} nome={c.outro.nome} /><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><strong className="truncate">{c.outro.nome}</strong><time className="text-xs text-muted-foreground">{new Date(c.ultima?.created_at ?? c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</time></div><p className="truncate text-sm font-medium text-primary">{c.aulas.materias.nome}</p><p className="truncate text-sm text-muted-foreground">{c.ultima?.texto || (c.ultima?.anexo_nome ? `Anexo: ${c.ultima.anexo_nome}` : "Conversa iniciada")}</p></div></Link>)}</div> : <div className="mt-8 rounded-[8px] border border-border bg-card p-8 text-center"><BookOpen className="mx-auto size-8 text-accent" /><h2 className="mt-3 font-serif text-2xl">Nenhuma conversa ainda</h2><p className="mt-2 text-muted-foreground">{aba === "aluno" ? "Encontre uma aula no Feed para começar uma conversa." : "Crie uma aula para receber novos alunos."}</p><Button asChild className="mt-5"><Link to={aba === "aluno" ? "/feed" : "/criar-aula"}>{aba === "aluno" ? <BookOpen /> : <Plus />}{aba === "aluno" ? "Ver o Feed" : "Criar aula"}</Link></Button></div>}</section>;
}
