import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, MapPin, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AvatarPerfil } from "@/components/AvatarPerfil";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/Spinner";
import { formatarDataHora, formatarPreco } from "@/lib/formatacao";

export const Route = createFileRoute("/_app/feed")({
  validateSearch: (search: Record<string, unknown>) => ({ publicada: search.publicada === "1" ? "1" : undefined }),
  head: () => ({
    meta: [
      { title: "Feed | Calouro+" },
      { name: "description", content: "Veja as aulas oferecidas por veteranos da PUC-Rio." },
      { property: "og:title", content: "Feed | Calouro+" },
      { property: "og:description", content: "Veja as aulas oferecidas por veteranos da PUC-Rio." },
    ],
  }),
  component: Feed,
});

type Aula = { id: string; tutor_id: string; descricao: string; preco: number | null; max_alunos: number | null; local: string | null; modo: string | null; selo: string | null; created_at: string; materias: { id: string; nome: string }; perfis: { nome: string; foto_url: string | null }; aula_horarios: { id: string; inicio: string; duracao_minutos: number }[] };

function Feed() {
  const navigate = useNavigate();
  const { publicada } = Route.useSearch();
  const [uid, setUid] = useState("");
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [interesses, setInteresses] = useState<{ id: string; nome: string }[]>([]);
  const [inscricoes, setInscricoes] = useState<Record<string, string>>({});
  const [ocupacao, setOcupacao] = useState<Record<string, number>>({});
  const [filtro, setFiltro] = useState("todas");
  const [pagina, setPagina] = useState(0);
  const [selecionada, setSelecionada] = useState<Aula | null>(null);
  const [horarioId, setHorarioId] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    setUid(userId);
    const agora = new Date().toISOString();
    const [{ data: dadosAulas }, { data: vinculos }, { data: minhas }, { data: todasInscricoes }] = await Promise.all([
      supabase.from("aulas").select("id,tutor_id,descricao,preco,max_alunos,local,modo,selo,created_at,materias(id,nome),perfis!aulas_tutor_id_fkey(nome,foto_url),aula_horarios(id,inicio,duracao_minutos)").is("apagada_em", null).gt("aula_horarios.inicio", agora).order("created_at", { ascending: false }),
      supabase.from("usuario_materias").select("materias(id,nome)").eq("usuario_id", userId),
      supabase.from("inscricoes").select("aula_id,conversas!inner(id)").eq("aluno_id", userId).is("cancelada_em", null),
      supabase.from("inscricoes").select("horario_id").is("cancelada_em", null),
    ]);
    setAulas(((dadosAulas ?? []) as unknown as Aula[]).filter((a) => a.aula_horarios.length));
    setInteresses((vinculos ?? []).map((v) => v.materias).filter(Boolean) as unknown as { id: string; nome: string }[]);
    setInscricoes(Object.fromEntries((minhas ?? []).map((i) => [i.aula_id, (i.conversas as unknown as { id: string }[])?.[0]?.id ?? ""])));
    const contagem: Record<string, number> = {};
    (todasInscricoes ?? []).forEach((i) => { contagem[i.horario_id] = (contagem[i.horario_id] ?? 0) + 1; });
    setOcupacao(contagem);
    setCarregando(false);
  }

  useEffect(() => { void carregar(); }, []);
  const ordenadas = useMemo(() => {
    const ids = new Set(interesses.map((i) => i.id));
    return aulas.filter((a) => filtro === "todas" || a.materias.id === filtro).sort((a, b) => Number(ids.has(b.materias.id)) - Number(ids.has(a.materias.id)) || +new Date(b.created_at) - +new Date(a.created_at));
  }, [aulas, interesses, filtro]);
  const visiveis = ordenadas.slice(pagina * 10, pagina * 10 + 10);

  async function confirmar() {
    if (!selecionada || !horarioId) { setErro("Escolha um horário para continuar."); return; }
    setConfirmando(true); setErro(null);
    const { data, error } = await supabase.rpc("confirmar_inscricao", { p_aula_id: selecionada.id, p_horario_id: horarioId });
    setConfirmando(false);
    if (error) {
      if (/aula_indisponivel/.test(error.message)) { setErro("Essa aula não está mais disponível."); await carregar(); }
      else if (/horario_lotado/.test(error.message)) setErro("Esse horário acabou de lotar. Escolha outro.");
      else setErro("Não foi possível confirmar a inscrição. Tente de novo.");
      return;
    }
    setSelecionada(null);
    navigate({ to: "/conversas", search: { conversa: data, confirmada: "1" } });
  }

  if (carregando) return <div className="flex justify-center py-20"><Spinner /></div>;
  return <section>
    <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-success">Comunidade PUC</p><h1 className="font-serif text-4xl font-semibold text-primary">Feed</h1></div><Button asChild className="hidden sm:inline-flex"><Link to="/criar-aula">Criar aula</Link></Button></div>
    {publicada && <p className="mt-4 rounded-[4px] border border-border bg-card p-3 font-medium text-success">Aula publicada!</p>}
    <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por matéria"><Button size="sm" variant={filtro === "todas" ? "default" : "outline"} onClick={() => { setFiltro("todas"); setPagina(0); }}>Todas</Button>{interesses.map((m) => <Button key={m.id} size="sm" variant={filtro === m.id ? "default" : "outline"} onClick={() => { setFiltro(m.id); setPagina(0); }}>{m.nome}</Button>)}</div>
    {visiveis.length ? <div className="mt-3 grid gap-4 md:grid-cols-2">{visiveis.map((aula) => {
      const conversa = inscricoes[aula.id]; const propria = aula.tutor_id === uid;
      return <article key={aula.id} className="rounded-[8px] border border-border bg-card p-5">
        <div className="flex items-start gap-3"><AvatarPerfil caminho={aula.perfis?.foto_url} nome={aula.perfis?.nome ?? "Tutor"} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-xl font-semibold">{aula.materias.nome}</h2>{aula.selo && <span className="rounded-[4px] bg-muted px-2 py-1 text-[10px] font-semibold uppercase">{aula.selo}</span>}</div><p className="text-sm text-muted-foreground">com {aula.perfis?.nome || "Tutor"}</p></div></div>
        <p className="mt-4 line-clamp-3 text-sm">{aula.descricao}</p>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground"><p className="flex gap-2"><CalendarDays className="size-4 text-success" />{aula.aula_horarios.slice(0, 2).map((h) => formatarDataHora(h.inicio)).join(" · ")}</p>{(aula.modo || aula.local) && <p className="flex gap-2"><MapPin className="size-4" />{[aula.modo, aula.local].filter(Boolean).join(" · ")}</p>}{aula.max_alunos && <p className="flex gap-2"><Users className="size-4" />Até {aula.max_alunos} alunos por horário</p>}</div>
        <div className="mt-5 flex items-center justify-between gap-3"><strong>{formatarPreco(aula.preco)}<span className="text-xs font-normal text-muted-foreground"> / hora</span></strong>{propria ? <span className="text-sm font-semibold text-muted-foreground">Sua aula</span> : conversa ? <Button onClick={() => navigate({ to: "/conversas", search: { conversa } })}><MessageSquare /> Abrir conversa</Button> : <Button variant="destaque" onClick={() => { setSelecionada(aula); setHorarioId(""); setErro(null); }}>Se inscrever na aula</Button>}</div>
      </article>;
    })}</div> : <div className="mt-10 rounded-[8px] border border-border bg-card p-8 text-center"><h2 className="font-serif text-2xl">Ainda não tem aulas por aqui.</h2><p className="mt-2 text-muted-foreground">Que tal criar a primeira?</p><Button asChild className="mt-5"><Link to="/criar-aula">Criar aula</Link></Button></div>}
    {ordenadas.length > 10 && <div className="mt-6 flex justify-between"><Button variant="outline" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Button><span className="self-center text-sm text-muted-foreground">Página {pagina + 1}</span><Button variant="outline" disabled={(pagina + 1) * 10 >= ordenadas.length} onClick={() => setPagina((p) => p + 1)}>Próxima</Button></div>}
    <Dialog open={Boolean(selecionada)} onOpenChange={(aberta) => !aberta && setSelecionada(null)}><DialogContent className="max-w-md rounded-[8px] bg-card"><DialogHeader><DialogTitle className="font-serif text-2xl">Escolha um horário</DialogTitle><DialogDescription>Você será levado à conversa com o tutor após confirmar.</DialogDescription></DialogHeader><div className="space-y-2">{selecionada?.aula_horarios.map((h) => { const lotado = selecionada.max_alunos != null && (ocupacao[h.id] ?? 0) >= selecionada.max_alunos; return <label key={h.id} className={`flex items-center gap-3 rounded-[4px] border p-3 ${lotado ? "opacity-50" : "cursor-pointer"}`}><input type="radio" name="horario" value={h.id} disabled={lotado} checked={horarioId === h.id} onChange={() => setHorarioId(h.id)} /><span>{formatarDataHora(h.inicio)} · {h.duracao_minutos} min{lotado ? " · Lotado" : ""}</span></label>; })}</div>{erro && <p className="text-sm text-destructive">{erro}</p>}<Button onClick={confirmar} disabled={confirmando}>{confirmando ? <Spinner /> : "Confirmar inscrição"}</Button></DialogContent></Dialog>
  </section>;
}
