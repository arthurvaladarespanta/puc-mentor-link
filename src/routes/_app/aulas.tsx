import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, MapPin, MessageSquare, Pencil, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AvatarPerfil } from "@/components/AvatarPerfil";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/Spinner";
import { formatarDataHora, inicioLocal } from "@/lib/formatacao";

export const Route = createFileRoute("/_app/aulas")({
  head: () => ({
    meta: [
      { title: "Minhas aulas | Calouro+" },
      { name: "description", content: "Acompanhe as aulas que você dá e as que você marcou." },
      { property: "og:title", content: "Minhas aulas | Calouro+" },
      { property: "og:description", content: "Acompanhe as aulas que você dá e as que você marcou." },
    ],
  }),
  component: Aulas,
});

type Horario = { id?: string; inicio: string; duracao_minutos: number };
type Pessoa = { id: string; nome: string; foto_url: string | null };
type InscricaoAluno = { id: string; aula_id: string; horario_id: string; aula: { materia: string; tutor_id: string; modo: string | null; local: string | null }; horario: Horario; tutor: Pessoa; conversaId?: string };
type AlunoInscrito = Pessoa & { inscricaoId: string; horarioId: string; conversaId?: string };
type AulaTutor = { id: string; materia: string; descricao: string; preco: number | null; max_alunos: number | null; modo: string | null; local: string | null; selo: string | null; horarios: Horario[]; alunos: AlunoInscrito[] };
type HorarioFormulario = { id?: string; data: string; hora: string; duracao: "60" | "120" };

function Aulas() {
  const navigate = useNavigate();
  const [aba, setAba] = useState<"aluno" | "tutor">("aluno");
  const [periodo, setPeriodo] = useState<"proximas" | "passadas">("proximas");
  const [comoAluno, setComoAluno] = useState<InscricaoAluno[]>([]);
  const [comoTutor, setComoTutor] = useState<AulaTutor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [cancelar, setCancelar] = useState<InscricaoAluno | null>(null);
  const [apagar, setApagar] = useState<AulaTutor | null>(null);
  const [editar, setEditar] = useState<AulaTutor | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const [{ data: inscricoes }, { data: aulas }] = await Promise.all([
      supabase.from("inscricoes").select("id,aula_id,horario_id").eq("aluno_id", uid).is("cancelada_em", null),
      supabase.from("aulas").select("id,materia_id,descricao,preco,max_alunos,modo,local,selo").eq("tutor_id", uid).is("apagada_em", null).order("created_at", { ascending: false }),
    ]);
    const inscricoesAluno = inscricoes ?? [];
    const aulasTutor = aulas ?? [];
    const idsAulas = [...new Set([...inscricoesAluno.map((i) => i.aula_id), ...aulasTutor.map((a) => a.id)])];
    const [{ data: dadosAulas }, { data: horarios }, { data: matriculas }, { data: conversas }] = await Promise.all([
      idsAulas.length ? supabase.from("aulas").select("id,tutor_id,materia_id,modo,local,materias(nome)").in("id", idsAulas) : Promise.resolve({ data: [] }),
      idsAulas.length ? supabase.from("aula_horarios").select("id,aula_id,inicio,duracao_minutos").in("aula_id", idsAulas).order("inicio") : Promise.resolve({ data: [] }),
      aulasTutor.length ? supabase.from("inscricoes").select("id,aula_id,horario_id,aluno_id").in("aula_id", aulasTutor.map((a) => a.id)).is("cancelada_em", null) : Promise.resolve({ data: [] }),
      idsAulas.length ? supabase.from("conversas").select("id,aula_id,aluno_id,tutor_id").in("aula_id", idsAulas) : Promise.resolve({ data: [] }),
    ]);
    const dados = (dadosAulas ?? []) as unknown as { id: string; tutor_id: string; materia_id: string; modo: string | null; local: string | null; materias: { nome: string } }[];
    const todasMatriculas = matriculas ?? [];
    const idsPessoas = [...new Set([...dados.map((a) => a.tutor_id), ...todasMatriculas.map((i) => i.aluno_id)])];
    const { data: perfis } = idsPessoas.length ? await supabase.from("perfis").select("id,nome,foto_url").in("id", idsPessoas) : { data: [] };
    const pessoas = Object.fromEntries((perfis ?? []).map((p) => [p.id, p]));
    const aulasPorId = Object.fromEntries(dados.map((a) => [a.id, a]));
    const horariosPorId = Object.fromEntries((horarios ?? []).map((h) => [h.id, h]));
    const conversaPorPar = Object.fromEntries((conversas ?? []).map((c) => [`${c.aula_id}:${c.aluno_id}`, c.id]));

    setComoAluno(inscricoesAluno.flatMap((i) => {
      const aula = aulasPorId[i.aula_id]; const horario = horariosPorId[i.horario_id];
      if (!aula || !horario) return [];
      return [{ id: i.id, aula_id: i.aula_id, horario_id: i.horario_id, aula: { materia: aula.materias.nome, tutor_id: aula.tutor_id, modo: aula.modo, local: aula.local }, horario, tutor: pessoas[aula.tutor_id] ?? { id: aula.tutor_id, nome: "Tutor", foto_url: null }, conversaId: conversaPorPar[`${i.aula_id}:${uid}`] }];
    }));
    setComoTutor(aulasTutor.map((a) => ({
      id: a.id,
      materia: aulasPorId[a.id]?.materias.nome ?? "Matéria",
      descricao: a.descricao,
      preco: a.preco,
      max_alunos: a.max_alunos,
      modo: a.modo,
      local: a.local,
      selo: a.selo,
      horarios: (horarios ?? []).filter((h) => h.aula_id === a.id),
      alunos: todasMatriculas.filter((i) => i.aula_id === a.id).map((i) => ({ ...(pessoas[i.aluno_id] ?? { id: i.aluno_id, nome: "Aluno", foto_url: null }), inscricaoId: i.id, horarioId: i.horario_id, conversaId: conversaPorPar[`${a.id}:${i.aluno_id}`] })),
    })));
    setCarregando(false);
  }

  useEffect(() => { void carregar(); }, []);
  const agora = Date.now();
  const inscricoesVisiveis = useMemo(() => comoAluno.filter((i) => periodo === "proximas" ? +new Date(i.horario.inicio) >= agora : +new Date(i.horario.inicio) < agora), [comoAluno, periodo, agora]);

  async function confirmarCancelamento() {
    if (!cancelar) return;
    setProcessando(true); setErro(null);
    const { error } = await supabase.rpc("cancelar_inscricao", { p_inscricao_id: cancelar.id });
    setProcessando(false);
    if (error) { setErro("Não foi possível cancelar a inscrição. Tente novamente."); return; }
    setCancelar(null); await carregar();
  }

  async function confirmarExclusao() {
    if (!apagar) return;
    setProcessando(true); setErro(null);
    const { error } = await supabase.rpc("apagar_aula", { p_aula_id: apagar.id });
    setProcessando(false);
    if (error) { setErro("Não foi possível apagar a aula. Tente novamente."); return; }
    setApagar(null); await carregar();
  }

  if (carregando) return <div className="flex justify-center py-20"><Spinner /></div>;
  return <section className="mx-auto max-w-3xl">
    <h1 className="font-serif text-4xl font-semibold text-primary">Aulas</h1>
    <Tabs value={aba} onValueChange={(valor) => setAba(valor as "aluno" | "tutor")} className="mt-5">
      <TabsList className="grid h-11 w-full grid-cols-2 rounded-[4px]"><TabsTrigger value="aluno" className="rounded-[4px]">Como aluno</TabsTrigger><TabsTrigger value="tutor" className="rounded-[4px]">Como tutor</TabsTrigger></TabsList>
    </Tabs>
    {aba === "aluno" ? <>
      <div className="mt-4 flex gap-2"><Button size="sm" variant={periodo === "proximas" ? "default" : "outline"} onClick={() => setPeriodo("proximas")}>Próximas</Button><Button size="sm" variant={periodo === "passadas" ? "default" : "outline"} onClick={() => setPeriodo("passadas")}>Passadas</Button></div>
      {inscricoesVisiveis.length ? <div className="mt-4 space-y-4">{inscricoesVisiveis.map((item) => <article key={item.id} className="rounded-[8px] border border-border bg-card p-5"><div className="flex items-start gap-3"><AvatarPerfil caminho={item.tutor.foto_url} nome={item.tutor.nome} /><div><h2 className="font-serif text-xl font-semibold">{item.aula.materia}</h2><p className="text-sm text-muted-foreground">com {item.tutor.nome}</p></div></div><div className="mt-4 space-y-2 text-sm text-muted-foreground"><p className="flex items-center gap-2"><CalendarDays className="size-4 text-success" />{formatarDataHora(item.horario.inicio)} · {item.horario.duracao_minutos} min</p>{(item.aula.modo || item.aula.local) && <p className="flex items-center gap-2"><MapPin className="size-4" />{[item.aula.modo, item.aula.local].filter(Boolean).join(" · ")}</p>}</div><div className="mt-5 flex flex-wrap gap-2"><Button disabled={!item.conversaId} onClick={() => item.conversaId && navigate({ to: "/conversas/$conversaId", params: { conversaId: item.conversaId } })}><MessageSquare /> Conversar</Button>{periodo === "proximas" && <Button variant="outline" onClick={() => { setCancelar(item); setErro(null); }}>Cancelar inscrição</Button>}</div></article>)}</div> : <Vazio texto="Você ainda não se inscreveu em nenhuma aula." destino="/feed" botao="Procurar aulas" />}
    </> : comoTutor.length ? <div className="mt-4 space-y-4">{comoTutor.map((aula) => <article key={aula.id} className="rounded-[8px] border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-2xl font-semibold">{aula.materia}</h2><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{aula.descricao}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setEditar(aula)}><Pencil /> Editar</Button><Button variant="destructive" size="sm" onClick={() => { setApagar(aula); setErro(null); }}><Trash2 /> Apagar</Button></div></div><div className="mt-5 space-y-4">{aula.horarios.map((horario) => { const alunos = aula.alunos.filter((a) => a.horarioId === horario.id); return <div key={horario.id} className="rounded-[4px] border border-border bg-background p-4"><h3 className="flex items-center gap-2 font-sans text-sm font-semibold"><CalendarDays className="size-4 text-success" />{formatarDataHora(horario.inicio)} · {horario.duracao_minutos} min</h3>{alunos.length ? <div className="mt-3 space-y-2">{alunos.map((aluno) => <div key={aluno.inscricaoId} className="flex items-center gap-3"><AvatarPerfil caminho={aluno.foto_url} nome={aluno.nome} className="size-9" /><span className="min-w-0 flex-1 truncate text-sm">{aluno.nome}</span><Button variant="ghost" size="sm" disabled={!aluno.conversaId} onClick={() => aluno.conversaId && navigate({ to: "/conversas/$conversaId", params: { conversaId: aluno.conversaId } })}><MessageSquare /> Conversar</Button></div>)}</div> : <p className="mt-2 text-sm text-muted-foreground">Nenhum aluno inscrito neste horário.</p>}</div>; })}</div></article>)}</div> : <Vazio texto="Você ainda não criou nenhuma aula." destino="/criar-aula" botao="Criar minha primeira aula" />}

    <Confirmacao aberta={Boolean(cancelar)} titulo="Cancelar inscrição?" descricao="A aula sairá da sua lista, mas a conversa continuará disponível." confirmar="Cancelar inscrição" processando={processando} erro={erro} aoFechar={() => setCancelar(null)} aoConfirmar={confirmarCancelamento} />
    <Confirmacao aberta={Boolean(apagar)} titulo="Apagar aula?" descricao={`Essa aula tem ${apagar?.alunos.length ?? 0} aluno(s) inscrito(s). Tem certeza?`} confirmar="Apagar aula" processando={processando} erro={erro} destrutivo aoFechar={() => setApagar(null)} aoConfirmar={confirmarExclusao} />
    <EditarAula aula={editar} aoFechar={() => setEditar(null)} aoSalvar={async () => { setEditar(null); await carregar(); }} />
  </section>;
}

function Vazio({ texto, destino, botao }: { texto: string; destino: "/feed" | "/criar-aula"; botao: string }) {
  return <div className="mt-8 rounded-[8px] border border-border bg-card p-8 text-center"><CalendarDays className="mx-auto size-8 text-accent" /><p className="mt-3 text-muted-foreground">{texto}</p><Button asChild className="mt-5"><Link to={destino}><Plus />{botao}</Link></Button></div>;
}

function Confirmacao({ aberta, titulo, descricao, confirmar, processando, erro, destrutivo, aoFechar, aoConfirmar }: { aberta: boolean; titulo: string; descricao: string; confirmar: string; processando: boolean; erro: string | null; destrutivo?: boolean; aoFechar: () => void; aoConfirmar: () => void }) {
  return <Dialog open={aberta} onOpenChange={(valor) => !valor && aoFechar()}><DialogContent className="max-w-md rounded-[8px] bg-card"><DialogHeader><DialogTitle className="font-serif text-2xl">{titulo}</DialogTitle><DialogDescription>{descricao}</DialogDescription></DialogHeader>{erro && <p className="text-sm text-destructive">{erro}</p>}<DialogFooter><Button variant="outline" onClick={aoFechar}>Voltar</Button><Button variant={destrutivo ? "destructive" : "default"} onClick={aoConfirmar} disabled={processando}>{processando ? <Spinner /> : confirmar}</Button></DialogFooter></DialogContent></Dialog>;
}

function EditarAula({ aula, aoFechar, aoSalvar }: { aula: AulaTutor | null; aoFechar: () => void; aoSalvar: () => void | Promise<void> }) {
  const [descricao, setDescricao] = useState(""); const [preco, setPreco] = useState(""); const [maxAlunos, setMaxAlunos] = useState(""); const [modo, setModo] = useState(""); const [local, setLocal] = useState(""); const [selo, setSelo] = useState("");
  const [horarios, setHorarios] = useState<HorarioFormulario[]>([]); const [salvando, setSalvando] = useState(false); const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { if (!aula) return; setDescricao(aula.descricao); setPreco(aula.preco?.toString().replace(".", ",") ?? ""); setMaxAlunos(aula.max_alunos?.toString() ?? ""); setModo(aula.modo ?? ""); setLocal(aula.local ?? ""); setSelo(aula.selo ?? ""); setHorarios(aula.horarios.map((h) => { const d = new Date(h.inicio); return { id: h.id, data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, hora: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`, duracao: String(h.duracao_minutos) as "60" | "120" }; })); setErro(null); }, [aula]);
  function alterar(i: number, campo: keyof HorarioFormulario, valor: string) { setHorarios((atuais) => atuais.map((h, n) => n === i ? { ...h, [campo]: valor } as HorarioFormulario : h)); }
  async function salvar() {
    if (!aula || !descricao.trim()) { setErro("Preencha a descrição."); return; }
    if (!horarios.length || horarios.some((h) => !h.data || !h.hora || new Date(`${h.data}T${h.hora}:00`) <= new Date())) { setErro("Todos os horários precisam estar no futuro."); return; }
    const numeroPreco = preco ? Number(preco.replace(",", ".")) : null; const numeroMax = maxAlunos ? Number(maxAlunos) : null;
    if ((numeroPreco != null && (Number.isNaN(numeroPreco) || numeroPreco < 0)) || (numeroMax != null && (!Number.isInteger(numeroMax) || numeroMax < 1))) { setErro("Confira o preço e a quantidade máxima de alunos."); return; }
    setSalvando(true); setErro(null);
    const { error } = await supabase.rpc("editar_aula", { p_aula_id: aula.id, p_descricao: descricao.trim(), p_preco: numeroPreco, p_max_alunos: numeroMax, p_local: local.trim() || null, p_modo: modo || null, p_selo: selo || null, p_horarios: horarios.map((h) => ({ ...(h.id ? { id: h.id } : {}), inicio: inicioLocal(h.data, h.hora), duracao_minutos: Number(h.duracao) })) });
    setSalvando(false); if (error) { setErro(/passado/.test(error.message) ? "Um dos horários já passou. Escolha outro." : "Não foi possível salvar as alterações."); return; } await aoSalvar();
  }
  return <Dialog open={Boolean(aula)} onOpenChange={(valor) => !valor && aoFechar()}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[8px] bg-card"><DialogHeader><DialogTitle className="font-serif text-2xl">Editar aula</DialogTitle><DialogDescription>A matéria {aula?.materia} não pode ser alterada.</DialogDescription></DialogHeader><div className="space-y-4"><label className="block space-y-2"><span className="font-medium">Descrição *</span><Textarea value={descricao} maxLength={400} onChange={(e) => setDescricao(e.target.value)} className="min-h-28" /></label><fieldset className="space-y-3"><legend className="font-medium">Horários *</legend>{horarios.map((h, i) => { const temAluno = Boolean(h.id && aula?.alunos.some((a) => a.horarioId === h.id)); return <div key={h.id ?? i} className="grid gap-2 rounded-[4px] border border-border bg-background p-3 sm:grid-cols-[1fr_1fr_110px_44px]"><Input aria-label={`Data do horário ${i + 1}`} type="date" value={h.data} onChange={(e) => alterar(i, "data", e.target.value)} /><Input aria-label={`Hora do horário ${i + 1}`} type="time" value={h.hora} onChange={(e) => alterar(i, "hora", e.target.value)} /><select aria-label={`Duração do horário ${i + 1}`} value={h.duracao} onChange={(e) => alterar(i, "duracao", e.target.value)} className="h-11 rounded-[4px] border border-input bg-card px-3 text-sm"><option value="60">60 min</option><option value="120">120 min</option></select><Button type="button" size="icon" variant="ghost" aria-label={`Remover horário ${i + 1}`} title={temAluno ? "Este horário tem alunos inscritos" : "Remover horário"} disabled={horarios.length === 1 || temAluno} onClick={() => setHorarios((atuais) => atuais.filter((_, n) => n !== i))}><Trash2 /></Button></div>; })}<Button type="button" variant="secondary" onClick={() => setHorarios((atuais) => [...atuais, { data: "", hora: "", duracao: "60" }])}><Plus /> Adicionar outro horário</Button></fieldset><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="font-medium">Preço em R$</span><Input value={preco} onChange={(e) => setPreco(e.target.value)} /></label><label className="space-y-2"><span className="font-medium">Qtd. máxima de alunos</span><Input type="number" min="1" value={maxAlunos} onChange={(e) => setMaxAlunos(e.target.value)} /></label><label className="space-y-2"><span className="font-medium">Modalidade</span><select value={modo} onChange={(e) => setModo(e.target.value)} className="h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm"><option value="">Não informar</option><option value="presencial">Presencial</option><option value="online">Online</option></select></label><label className="space-y-2"><span className="font-medium">Selo</span><select value={selo} onChange={(e) => setSelo(e.target.value)} className="h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm"><option value="">Sem selo</option><option value="Monitoria">Monitoria</option><option value="Veterano">Veterano</option></select></label></div><label className="block space-y-2"><span className="font-medium">Local</span><Input value={local} onChange={(e) => setLocal(e.target.value)} /></label>{erro && <p className="text-sm text-destructive">{erro}</p>}</div><DialogFooter><Button variant="outline" onClick={aoFechar}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando ? <Spinner /> : "Salvar alterações"}</Button></DialogFooter></DialogContent></Dialog>;
}